import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Plus,
  RefreshCw,
  Send,
  Lock,
  User,
  Building,
  Mail,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import {
  conversationsApi,
  CrmConversationItem,
  CrmConversationMessageItem,
  CreateConversationPayload,
  ConvertToLeadResult,
} from '../api/conversations.api';
import { ConvertConversationToLeadModal } from '../components/ConvertConversationToLeadModal';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const ConversationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeLeadIdParam = searchParams.get('leadId') || '';

  // Data states
  const [conversations, setConversations] = useState<CrmConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<CrmConversationItem | null>(null);
  const [messages, setMessages] = useState<CrmConversationMessageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Composer state
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);

  // Convert to Lead Modal
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);

  // New Conversation Modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [modalForm, setModalForm] = useState<CreateConversationPayload>({
    title: '',
    customerName: '',
    customerEmail: '',
    companyName: '',
    channel: 'PORTAL',
    initialMessage: '',
    isInternal: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleConvertSuccess = (result: ConvertToLeadResult) => {
    setShowConvertModal(false);
    // Directly navigate to the newly converted Lead Dossier page
    navigate(`/sales/leads/${result.leadId}`);
  };

  const fetchConversations = async (autoSelectId?: string) => {
    try {
      setLoading(true);
      const data = await conversationsApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined,
        leadId: activeLeadIdParam || undefined,
      });
      setConversations(data);

      if (data.length > 0) {
        const toSelect = autoSelectId
          ? data.find((c) => c.id === autoSelectId) || data[0]
          : activeConversation
          ? data.find((c) => c.id === activeConversation.id) || data[0]
          : data[0];
        setActiveConversation(toSelect);
        loadMessages(toSelect.id);
      } else {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const msgs = await conversationsApi.listMessages(conversationId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, activeLeadIdParam]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // WebSocket Live Realtime Integration
  useEffect(() => {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || (import.meta as any).env?.MODE === 'test') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:3000/ws/crm-chat`;

    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          ws?.send(
            JSON.stringify({
              type: 'JOIN',
              role: 'SALES_REP',
              userId: user?.id,
              userEmail: user?.email,
              userName: user?.fullName,
              conversationId: activeConversation?.id,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_MESSAGE') {
              const { conversationId, message } = data;
              // If incoming message belongs to active conversation, append it
              setActiveConversation((curr) => {
                if (curr && curr.id === conversationId) {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                  });
                }
                return curr;
              });

              // Update conversation snippet in left list
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conversationId
                    ? {
                        ...c,
                        lastMessage: message.isInternal ? `[Note] ${message.content}` : message.content,
                        lastMessageAt: message.createdAt || new Date().toISOString(),
                      }
                    : c
                )
              );
            } else if (data.type === 'CONVERSATION_UPDATED') {
              const updated = data.conversation;
              setConversations((prev) => {
                const idx = prev.findIndex((c) => c.id === updated.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = { ...next[idx], ...updated };
                  return next;
                }
                return [updated, ...prev];
              });
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          wsRef.current = null;
          if (!isDisposed) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [user?.id, user?.email]);

  // Notify WebSocket server when active conversation changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeConversation?.id) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN',
          role: 'SALES_REP',
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.fullName,
          conversationId: activeConversation.id,
        })
      );
    }
  }, [activeConversation?.id]);

  const handleSelectConversation = (conv: CrmConversationItem) => {
    setActiveConversation(conv);
    loadMessages(conv.id);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeConversation || sending) return;

    try {
      setSending(true);
      const newMsg = await conversationsApi.postMessage(activeConversation.id, {
        content: messageText.trim(),
        isInternal: isInternalNote,
      });

      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');

      // Refresh conversation item in list to update lastMessage
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessage: isInternalNote ? `[Note] ${newMsg.content}` : newMsg.content,
                lastMessageAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeConversation) return;
    try {
      const updated = await conversationsApi.updateStatus(activeConversation.id, newStatus);
      setActiveConversation(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreateNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await conversationsApi.create(modalForm);
      setShowNewModal(false);
      setModalForm({
        title: '',
        customerName: '',
        customerEmail: '',
        companyName: '',
        channel: 'PORTAL',
        initialMessage: '',
        isInternal: false,
      });
      await fetchConversations(created.id);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">IN PROGRESS</span>;
      case 'WAITING_ON_CUSTOMER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">WAITING</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">CLOSED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
            {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">Conversations</h1>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                wsConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
              title={wsConnected ? 'Connected to Realtime WebSocket server' : 'Connecting to Realtime WebSocket server...'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {wsConnected ? 'Live Realtime' : 'Connecting'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeLeadIdParam && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-[#244A70] hover:underline font-medium px-2 py-1"
            >
              Showing filtered lead • Clear filter
            </button>
          )}

          <button
            onClick={() => fetchConversations()}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-2xs cursor-pointer"
            title="Refresh Conversations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#244A70]' : 'text-[#64748B]'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#244A70] text-white rounded-lg text-xs font-semibold hover:bg-[#1B3856] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>
      </div>

      {/* 3-Panel Communication Hub */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-xs overflow-hidden flex flex-col lg:flex-row h-[740px]">
        {/* Left Panel: Conversation Thread List */}
        <div className="w-full lg:w-80 border-r border-[#DCE3EC] flex flex-col shrink-0 bg-[#F8FAFC]">
          {/* Search & Status Filters */}
          <div className="p-3.5 border-b border-[#DCE3EC] space-y-2.5 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] focus:bg-white border border-[#DCE3EC] focus:border-[#244A70] rounded-md text-[#17263A] placeholder-[#8491A3] outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                    statusFilter === st
                      ? 'bg-[#244A70] text-white'
                      : 'bg-[#EEF1F6] text-[#475569] hover:bg-[#DCE3EC]'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'IN_PROGRESS' ? 'Active' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#DCE3EC]">
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8491A3]">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#244A70] mb-2" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8491A3]">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                No conversations found.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isActive
                        ? 'bg-white border-l-4 border-l-[#244A70] shadow-2xs'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#17263A] truncate">
                        {conv.customerName}
                      </span>
                      {getStatusBadge(conv.status)}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                      <Building className="w-3 h-3 text-[#8491A3] shrink-0" />
                      <span className="truncate">{conv.companyName || 'Individual Contact'}</span>
                    </div>

                    <p className="text-xs font-medium text-[#334155] line-clamp-1">
                      {conv.title}
                    </p>

                    <p className="text-[11px] text-[#64748B] line-clamp-1">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Panel: Active Conversation & Messages */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Conversation Header */}
            <div className="px-5 py-3.5 border-b border-[#DCE3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#17263A] tracking-tight">
                    {activeConversation.title}
                  </h2>
                  {getStatusBadge(activeConversation.status)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                  <span>{activeConversation.customerName} &bull; {activeConversation.customerEmail}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EEF1F6] text-[#244A70] font-bold">
                    {activeConversation.channel}
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#64748B]">Status:</span>
                <select
                  value={activeConversation.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="py-1 px-2.5 text-xs bg-white border border-[#DCE3EC] rounded-md font-semibold text-[#17263A] outline-none cursor-pointer"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            {/* Message Thread History */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F8FAFC]/50">
              {messagesLoading ? (
                <div className="py-12 text-center text-xs text-[#8491A3]">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#244A70] mb-2" />
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8491A3]">
                  No messages recorded in this conversation yet.
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.isInternal) {
                    return (
                      <div
                        key={msg.id}
                        className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950 space-y-1.5 shadow-2xs max-w-2xl mx-auto"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Internal Staff Note &bull; {msg.senderName}</span>
                          </div>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    );
                  }

                  const isMe = msg.senderRole === 'SALES_REP' || msg.senderRole === 'STAFF';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-xl ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-[#17263A]">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-[#8491A3]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isMe
                            ? 'bg-[#244A70] text-white rounded-tr-none'
                            : 'bg-white border border-[#DCE3EC] text-[#17263A] rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Box */}
            <div className="p-3.5 border-t border-[#DCE3EC] bg-white space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInternalNote(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    !isInternalNote
                      ? 'bg-[#244A70] text-white'
                      : 'bg-[#EEF1F6] text-[#475569] hover:bg-[#DCE3EC]'
                  }`}
                >
                  Customer Message
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternalNote(true)}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    isInternalNote
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#EEF1F6] text-[#475569] hover:bg-[#DCE3EC]'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Internal Note</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  placeholder={
                    isInternalNote
                      ? 'Write a private internal note for the team (never shared with customer)...'
                      : 'Write a message to the customer...'
                  }
                  className={`w-full p-3 text-xs rounded-lg border outline-none transition-all resize-none ${
                    isInternalNote
                      ? 'bg-amber-50/40 border-amber-300 focus:border-amber-500'
                      : 'bg-[#F8FAFC] focus:bg-white border-[#DCE3EC] focus:border-[#244A70]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8491A3]">
                <span>Press <strong>Ctrl + Enter</strong> to send</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!messageText.trim() || sending}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50 ${
                    isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#244A70] hover:bg-[#1B3856]'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isInternalNote ? 'Save Note' : 'Send Message'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8491A3] bg-[#F8FAFC]">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-[#17263A]">No conversation selected</h3>
            <p className="text-xs text-[#64748B] max-w-sm mt-1">
              Select a conversation from the left panel or initiate a new conversation to begin.
            </p>
          </div>
        )}

        {/* Right Panel: Lead & Opportunity Context Sidebar */}
        {activeConversation && (
          <div className="w-full lg:w-72 border-l border-[#DCE3EC] p-4 bg-[#F8FAFC] flex flex-col gap-4 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider mb-2">
                Lead Dossier
              </h3>
              <div className="bg-white p-3.5 rounded-lg border border-[#DCE3EC] shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#17263A]">
                  {activeConversation.companyName || 'Direct Prospect'}
                </p>
                <div className="text-xs text-[#64748B] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#8491A3]" />
                    <span>{activeConversation.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-[#8491A3]" />
                    <span className="truncate">{activeConversation.customerEmail}</span>
                  </div>
                  {activeConversation.customerPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#8491A3]" />
                      <span>{activeConversation.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider mb-2">
                Assigned Specialist
              </h3>
              <div className="bg-white p-3 rounded-lg border border-[#DCE3EC] shadow-2xs flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC] flex items-center justify-center text-xs font-bold shrink-0">
                  {activeConversation.assignedToName?.charAt(0) || 'S'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#17263A] truncate">
                    {activeConversation.assignedToName || 'System Admin'}
                  </p>
                  <p className="text-[10px] text-[#8491A3] truncate">
                    {activeConversation.assignedToEmail || 'sales@alsm.dev'}
                  </p>
                </div>
              </div>
            </div>

            {activeConversation.leadId ? (
              <div className="mt-auto pt-4 border-t border-[#DCE3EC] space-y-2">
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold">Converted to CRM Lead</p>
                    <p className="text-[10px] text-emerald-700 truncate">ID: {activeConversation.leadId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/sales/leads/${activeConversation.leadId}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold bg-[#244A70] hover:bg-[#1B3856] text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <span>View Full Lead Details</span>
                </button>
              </div>
            ) : (
              <div className="mt-auto pt-4 border-t border-[#DCE3EC] space-y-2.5">
                <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-lg text-[11px] text-[#244A70]">
                  This customer inquiry is not yet linked to a CRM opportunity.
                </div>
                <button
                  type="button"
                  onClick={() => setShowConvertModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold bg-[#244A70] hover:bg-[#1B3856] text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <span>Convert to Lead</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert to Lead Modal */}
      {showConvertModal && activeConversation && (
        <ConvertConversationToLeadModal
          conversation={activeConversation}
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onSuccess={handleConvertSuccess}
        />
      )}

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <h2 className="text-base font-bold text-[#17263A]">Start New Conversation</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#8491A3] hover:text-[#17263A] font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNewConversation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Subject / Topic *
                </label>
                <input
                  type="text"
                  required
                  value={modalForm.title}
                  onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                  placeholder="e.g. Modernization Architecture Inquiry"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17263A] mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.customerName}
                    onChange={(e) => setModalForm({ ...modalForm, customerName: e.target.value })}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17263A] mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={modalForm.companyName}
                    onChange={(e) => setModalForm({ ...modalForm, companyName: e.target.value })}
                    placeholder="Company"
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Customer Email *
                </label>
                <input
                  type="email"
                  required
                  value={modalForm.customerEmail}
                  onChange={(e) => setModalForm({ ...modalForm, customerEmail: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Initial Message
                </label>
                <textarea
                  rows={3}
                  value={modalForm.initialMessage}
                  onChange={(e) => setModalForm({ ...modalForm, initialMessage: e.target.value })}
                  placeholder="First message or internal onboarding memo..."
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#244A70] text-white hover:bg-[#1B3856] rounded-lg cursor-pointer shadow-xs"
                >
                  Create Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsPage;

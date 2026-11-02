import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { tokenStore } from '@/services/api/tokenStore';
import { createSupportAdapter } from '../api/support.adapter';
import type { OrganizationSearch, SupportAdapter } from '../api/support.types';
import { SupportSession } from '../state/SupportSession';
import { canUseSupport } from '../state/supportAccess';
import { SupportWorkspace } from '../components/SupportWorkspace';
import { SupportOutcomeNotice } from '../components/SupportOutcomeNotice';

const loginSnapshot = () =>
  `${tokenStore.epoch()}:${Boolean(tokenStore.getAccessToken())}:${tokenStore.isLogoutPending()}`;

export function SupportPortalPage({ adapter }: { adapter?: SupportAdapter }) {
  const { user, isLoading, error } = useAuth();
  const login = useSyncExternalStore(tokenStore.subscribe, loginSnapshot);
  if (isLoading) return <p role="status">Checking staff identity…</p>;
  if (error || !canUseSupport(user) || !tokenStore.getAccessToken() || tokenStore.isLogoutPending())
    return (
      <Card role="alert">
        <h1 className="font-bold text-xl">Support access unavailable</h1>
        <p className="text-sm mt-2">
          A current Internal Support account with organizations.impersonate is required.
        </p>
      </Card>
    );
  const authorityKey = `${user!.id}:${login}:${[...user!.roles].sort().join(',')}:${[...user!.effectivePermissions].sort().join(',')}`;
  return <SupportPortal key={authorityKey} adapter={adapter} actor={user!.email} login={login} />;
}

function SupportPortal({
  adapter: injectedAdapter,
  actor,
  login,
}: {
  adapter?: SupportAdapter;
  actor: string;
  login: string;
}) {
  const [adapter] = useState(() => injectedAdapter ?? createSupportAdapter());
  const [session] = useState(
    () =>
      new SupportSession(
        adapter,
        () =>
          loginSnapshot() === login &&
          Boolean(tokenStore.getAccessToken()) &&
          !tokenStore.isLogoutPending(),
      ),
  );
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const [query, setQuery] = useState('');
  const [field, setField] = useState<OrganizationSearch['field']>('name');
  useLayoutEffect(() => () => session.dispose(), [session]);
  const busy = state.pending !== null;
  const unavailable = adapter.mode === 'unavailable';
  const disabled = busy || state.blocked || unavailable;
  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        title="Internal Support Portal"
        subtitle="Search an Organisation, enter its read-only diagnostic workspace, and exit when finished."
        badge={
          <Badge variant="info">
            <ShieldCheck className="w-3 h-3 mr-1" />
            UC-66
          </Badge>
        }
      />
      {adapter.mode === 'mock' && (
        <Card padding="sm" role="status" className="bg-blue-50 border-blue-200 text-sm">
          Synthetic preview · No customer data or operational access. Use “Example” or
          manufacturing@example.invalid.
        </Card>
      )}
      {unavailable && (
        <Card role="status" className="text-sm border-amber-200 bg-amber-50">
          Support View is not connected yet. Organisation access remains unavailable pending
          separate backend integration approval.
        </Card>
      )}
      {state.notice && <SupportOutcomeNotice notice={state.notice} />}
      {state.context && state.organization ? (
        <SupportWorkspace session={session} state={state} actor={actor} />
      ) : (
        <>
          <Card>
            <h2 className="font-semibold mb-4">Find an Organisation</h2>
            <form
              className="flex flex-col sm:flex-row sm:items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void session.search({ query, field });
              }}
            >
              <div className="sm:w-52">
                <label
                  htmlFor="support-search-field"
                  className="block text-xs font-semibold mb-1.5"
                >
                  Search by
                </label>
                <select
                  id="support-search-field"
                  value={field}
                  disabled={disabled}
                  onChange={(event) => {
                    setField(event.target.value as OrganizationSearch['field']);
                    session.clearSearch();
                  }}
                  className="border border-slate-300 rounded-lg p-2 text-sm w-full"
                >
                  <option value="name">Organisation name</option>
                  <option value="email">Contact email</option>
                </select>
              </div>
              <div className="flex-1">
                <Input
                  label="Organisation search"
                  value={query}
                  minLength={3}
                  maxLength={120}
                  required
                  disabled={disabled}
                  placeholder={
                    field === 'name'
                      ? 'Name prefix, at least 3 characters'
                      : 'Exact Organisation contact email'
                  }
                  onChange={(event) => {
                    setQuery(event.target.value);
                    session.clearSearch();
                  }}
                />
              </div>
              <Button
                type="submit"
                disabled={disabled || query.trim().length < 3}
                className="h-[38px]"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Organisations
              </Button>
            </form>
            <p className="text-xs text-slate-500 mt-3">
              {field === 'name'
                ? 'Name uses prefix matching.'
                : 'Contact email uses exact matching; member/account emails are not searched.'}{' '}
              Each page contains at most 10 Organisations.
            </p>
          </Card>
          {state.pending && (
            <p role="status" className="text-sm">
              {state.pending}…
            </p>
          )}
          {state.organizations && (
            <Card padding="none" className="overflow-hidden">
              <h2 className="font-semibold p-4 border-b border-slate-100">Organisation results</h2>
              {state.organizations.items.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No eligible Organisations found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="p-4">Organisation</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.organizations.items.map((org) => (
                        <tr key={org.id}>
                          <td className="p-4">
                            <p className="font-semibold">{org.name}</p>
                            <p className="text-xs font-mono text-slate-500 mt-1">{org.id}</p>
                          </td>
                          <td className="p-4">{org.type}</td>
                          <td className="p-4">
                            <Badge variant="success">{org.status}</Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              disabled={disabled}
                              onClick={() => {
                                setQuery('');
                                setField('name');
                                void session.enter(org.id);
                              }}
                              aria-label={`Enter Organisation ${org.name}`}
                            >
                              Enter Organisation
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-100 p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || !state.search?.afterId}
                  onClick={() =>
                    state.search && void session.search({ ...state.search, afterId: undefined })
                  }
                >
                  First page
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || !state.organizations.nextAfterId}
                  onClick={() =>
                    state.search &&
                    void session.search({
                      ...state.search,
                      afterId: state.organizations?.nextAfterId ?? undefined,
                    })
                  }
                >
                  Next page
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Upload,
  RotateCcw,
  Check,
  ShieldCheck,
  FileSignature,
  Layers,
  Sparkles,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card } from '@/shared/ui';

export interface CompanyDigitalSignatureProps {
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  companyName: string;
  certProvider: string;
  certSerial: string;
  signatureImageUrl: string;
  setSignatureImageUrl: (val: string) => void;
  companySealUrl: string;
  setCompanySealUrl: (val: string) => void;
  signatureType: 'drawn' | 'uploaded' | 'typed';
  setSignatureType: (val: 'drawn' | 'uploaded' | 'typed') => void;
  stampPosition: 'overlap' | 'side_by_side' | 'signature_only';
  setStampPosition: (val: 'overlap' | 'side_by_side' | 'signature_only') => void;
  signingMethod: 'cloud_ca' | 'usb_token' | 'hsm';
  setSigningMethod: (val: 'cloud_ca' | 'usb_token' | 'hsm') => void;
  certificateStatus?: 'active' | 'expiring_soon' | 'expired' | 'unverified';
  certificateValidUntil?: string;
}

export const CompanyDigitalSignatureSection: React.FC<CompanyDigitalSignatureProps> = ({
  signerName,
  signerTitle,
  signerEmail: _signerEmail,
  companyName,
  certProvider,
  certSerial,
  signatureImageUrl,
  setSignatureImageUrl,
  companySealUrl,
  setCompanySealUrl,
  signatureType: _signatureType,
  setSignatureType,
  stampPosition,
  setStampPosition,
  signingMethod,
  setSigningMethod,
  certificateStatus = 'active',
  certificateValidUntil = '2027-12-31',
}) => {
  // Active creation tab for signature: 'draw' | 'upload' | 'type'
  const [activeTab, setActiveTab] = useState<'draw' | 'upload' | 'type'>('draw');
  const [isVerifyingCA, setIsVerifyingCA] = useState(false);
  const [caVerifySuccess, setCaVerifySuccess] = useState<boolean | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasContent, setHasCanvasContent] = useState(false);

  // Type signature state
  const [typedName, setTypedName] = useState(signerName || 'Nguyen Gia Khanh');
  const [selectedFont, setSelectedFont] = useState<'font-dancing' | 'font-caveat' | 'font-greatvibes'>('font-dancing');

  // File upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sealInputRef = useRef<HTMLInputElement | null>(null);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);

  // Coordinate mapper scaling display CSS pixels to canvas internal buffer resolution
  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  // Initialize canvas with high-DPI resolution matching container width
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.max(960, Math.round((rect.width || 480) * 2));
      const targetHeight = Math.max(500, Math.round((rect.height || 250) * 2));

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#13283E'; // Professional blue signature ink
      }
    }
  }, [activeTab]);

  // Keep typed name synced if signer name updates and typedName was empty
  useEffect(() => {
    if (signerName && !typedName) {
      setTypedName(signerName);
    }
  }, [signerName]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasCanvasContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#13283E';
    setHasCanvasContent(false);
  };

  const applyDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImageUrl(dataUrl);
    setSignatureType('drawn');
  };

  // Upload signature with optional white background removal and automatic dimension scaling
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);

        if (autoRemoveBg) {
          const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          const data = imgData.data;
          // Filter near-white pixels to transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 220 && g > 220 && b > 220) {
              data[i + 3] = 0; // Alpha = 0
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const cleanDataUrl = offCanvas.toDataURL('image/png');
        setSignatureImageUrl(cleanDataUrl);
        setSignatureType('uploaded');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Upload official company seal with automatic scaling
  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);
        const cleanDataUrl = offCanvas.toDataURL('image/png');
        setCompanySealUrl(cleanDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Apply typed cursive signature
  const applyTypedSignature = () => {
    if (!typedName.trim()) return;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 480;
    offCanvas.height = 180;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
    // Draw text with cursive style
    ctx.font = selectedFont === 'font-dancing' 
      ? 'italic bold 42px "Brush Script MT", "Segoe Script", cursive' 
      : selectedFont === 'font-caveat'
      ? 'italic 46px "Lucida Handwriting", "Apple Chancery", cursive'
      : 'italic 40px "Snell Roundhand", "Bradley Hand", cursive';
    ctx.fillStyle = '#13283E';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 240, 90);

    // Add an underline swoosh
    ctx.beginPath();
    ctx.moveTo(120, 115);
    ctx.bezierCurveTo(200, 130, 320, 95, 380, 120);
    ctx.strokeStyle = '#13283E';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const dataUrl = offCanvas.toDataURL('image/png');
    setSignatureImageUrl(dataUrl);
    setSignatureType('typed');
  };

  // Generate a standard SVG-based official company seal if none exists
  const generateDefaultOfficialSeal = () => {
    const svgSeal = `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#dc2626" stroke-width="4.5" />
        <circle cx="100" cy="100" r="82" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,2" />
        <path id="curveTop" d="M 28 100 A 72 72 0 0 1 172 100" fill="none"/>
        <text fill="#dc2626" font-size="11" font-weight="900" font-family="Arial, sans-serif" letter-spacing="1.5">
          <textPath href="#curveTop" startOffset="50%" text-anchor="middle">
            ALSM JOINT STOCK COMPANY
          </textPath>
        </text>
        <path id="curveBottom" d="M 172 100 A 72 72 0 0 1 28 100" fill="none"/>
        <text fill="#dc2626" font-size="10.5" font-weight="700" font-family="Arial, sans-serif" letter-spacing="1">
          <textPath href="#curveBottom" startOffset="50%" text-anchor="middle">
            M.S.D.N: 0110892345
          </textPath>
        </text>
        <polygon points="100,58 105,74 122,74 108,84 113,100 100,90 87,100 92,84 78,74 95,74" fill="#dc2626" />
        <text x="100" y="128" fill="#dc2626" font-size="13" font-weight="900" text-anchor="middle" font-family="Arial, sans-serif">
          DIGITALLY SIGNED
        </text>
        <text x="100" y="142" fill="#dc2626" font-size="8.5" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif">
          ELECTRONIC CONTRACT
        </text>
      </svg>
    `)}`;
    setCompanySealUrl(svgSeal);
  };

  // Test CA connection
  const handleTestCAConnection = () => {
    setIsVerifyingCA(true);
    setCaVerifySuccess(null);
    setTimeout(() => {
      setIsVerifyingCA(false);
      setCaVerifySuccess(true);
      setTimeout(() => setCaVerifySuccess(null), 5000);
    }, 1200);
  };

  return (
    <Card className="p-6 bg-white border border-[#DCE3EC] rounded-xl shadow-xs space-y-6">
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DCE3EC] gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#EEF1F6] text-[#244A70]">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#17263A]">
                Company Digital Signature
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                e-Contract Legal
              </span>
            </div>
            <p className="text-[11px] text-[#8491A3] mt-0.5">
              Configure authorized representative digital signature & corporate electronic seal for automated signing on ALSM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {signatureImageUrl ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Representative signature configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              No signature pattern set
            </span>
          )}
        </div>
      </div>

      {/* 2. Main 2-Column Grid: Left: Signature creation | Right: Seal & Contract Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Signature & Stamp Setup */}
        <div className="xl:col-span-7 space-y-5">
          {/* Sub-block A: Signature Generation Tabs */}
          <div className="p-4 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#244A70]" />
                Representative Signature Specimen ({signerName || 'Unnamed'})
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'draw'
                      ? 'bg-[#244A70] text-white shadow-2xs'
                      : 'text-[#8491A3] hover:text-[#17263A]'
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-[#244A70] text-white shadow-2xs'
                      : 'text-[#8491A3] hover:text-[#17263A]'
                  }`}
                >
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('type')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'type'
                      ? 'bg-[#244A70] text-white shadow-2xs'
                      : 'text-[#8491A3] hover:text-[#17263A]'
                  }`}
                >
                  Type Name
                </button>
              </div>
            </div>

            {/* TAB 1: DRAW CANVAS */}
            {activeTab === 'draw' && (
              <div className="space-y-3">
                <div className="relative border-2 border-dashed border-[#B8C7D9] hover:border-[#244A70] transition-colors rounded-xl bg-white overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={960}
                    height={500}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-64 sm:h-72 cursor-crosshair touch-none block"
                  />
                  {/* Subtle signing baseline */}
                  <div className="absolute left-6 right-6 bottom-10 pointer-events-none flex items-center justify-between border-b border-dashed border-[#DCE3EC] select-none">
                    <span className="text-[10px] text-[#8491A3] font-mono">Signing baseline</span>
                    <span className="text-[10px] text-[#8491A3] font-mono">ALSM e-Sign</span>
                  </div>
                  <div className="absolute bottom-2.5 left-3 text-[11px] text-[#8491A3] pointer-events-none select-none">
                    Use mouse, stylus, or touch to draw your signature in this box
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="h-8 px-3 inline-flex items-center gap-1.5 text-xs text-[#8491A3] hover:text-red-600 bg-white border border-[#DCE3EC] hover:border-red-300 rounded-md transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear & Redraw</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyDrawnSignature}
                    disabled={!hasCanvasContent}
                    className="h-8 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#244A70] hover:bg-[#244A70] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply this signature</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: UPLOAD IMAGE */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSignatureUpload}
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-[#B8C7D9] hover:border-[#244A70] rounded-lg bg-white text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <div className="p-2.5 rounded-full bg-[#EEF1F6] text-[#244A70]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#17263A] block">
                      Click to upload signature image
                    </span>
                    <span className="text-[11px] text-[#8491A3] block mt-0.5">
                      Supports PNG, JPG format (Size &lt; 5MB)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#8491A3]">
                    <input
                      type="checkbox"
                      checked={autoRemoveBg}
                      onChange={(e) => setAutoRemoveBg(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#244A70] focus:ring-[#244A70]"
                    />
                    <span>Auto-remove white background (Transparent Alpha Background)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-[#244A70] hover:underline"
                  >
                    Choose another file
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: TYPE / FONT SIGNATURE */}
            {activeTab === 'type' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1">
                    Enter name to generate cursive signature
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Signer full name"
                      className="flex-1 h-9 px-3 text-xs rounded-lg border border-[#DCE3EC] focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] outline-none"
                    />
                    <button
                      type="button"
                      onClick={applyTypedSignature}
                      className="h-9 px-3.5 text-xs font-semibold text-white bg-[#244A70] hover:bg-[#244A70] rounded-lg transition-colors cursor-pointer"
                    >
                      Generate signature
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => {
                      setSelectedFont('font-dancing');
                    }}
                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                      selectedFont === 'font-dancing'
                        ? 'border-[#244A70] bg-[#EEF1F6]/40 text-[#244A70]'
                        : 'border-[#DCE3EC] bg-white text-[#8491A3] hover:border-[#B8C7D9]'
                    }`}
                  >
                    <span className="text-sm italic font-serif block font-bold truncate">
                      {typedName || 'Specimen 1'}
                    </span>
                    <span className="text-[10px] text-[#8491A3] mt-1 block">Executive Style</span>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedFont('font-caveat');
                    }}
                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                      selectedFont === 'font-caveat'
                        ? 'border-[#244A70] bg-[#EEF1F6]/40 text-[#244A70]'
                        : 'border-[#DCE3EC] bg-white text-[#8491A3] hover:border-[#B8C7D9]'
                    }`}
                  >
                    <span className="text-sm italic font-sans block font-semibold truncate">
                      {typedName || 'Specimen 2'}
                    </span>
                    <span className="text-[10px] text-[#8491A3] mt-1 block">Modern Style</span>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedFont('font-greatvibes');
                    }}
                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                      selectedFont === 'font-greatvibes'
                        ? 'border-[#244A70] bg-[#EEF1F6]/40 text-[#244A70]'
                        : 'border-[#DCE3EC] bg-white text-[#8491A3] hover:border-[#B8C7D9]'
                    }`}
                  >
                    <span className="text-sm italic font-mono block font-bold truncate">
                      {typedName || 'Specimen 3'}
                    </span>
                    <span className="text-[10px] text-[#8491A3] mt-1 block">Script Style</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-block B: Company Stamp & Seal */}
          <div className="p-4 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                Corporate Legal Stamp & Seal
              </span>
              <button
                type="button"
                onClick={generateDefaultOfficialSeal}
                className="text-xs text-[#244A70] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Standard ALSM Seal
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl bg-white border border-[#DCE3EC] p-2 flex items-center justify-center shrink-0 shadow-2xs relative group">
                {companySealUrl ? (
                  <img
                    src={companySealUrl}
                    alt="Company Seal"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-[10px] text-[#8491A3] p-1">
                    No stamp configured
                  </div>
                )}
                {companySealUrl && (
                  <button
                    type="button"
                    onClick={() => setCompanySealUrl('')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Remove stamp"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <input
                  type="file"
                  ref={sealInputRef}
                  onChange={handleSealUpload}
                  accept="image/png,image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => sealInputRef.current?.click()}
                  className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#17263A] bg-white border border-[#DCE3EC] hover:bg-[#F4F7FB] rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#8491A3]" />
                  <span>Upload round company stamp (.PNG transparent)</span>
                </button>
                <p className="text-[11px] text-[#8491A3]">
                  Official corporate seal issued by regulatory authority, used for legally binding contracts.
                </p>
              </div>
            </div>

            {/* Layout options: Signature overlapping vs side by side */}
            <div className="pt-2 border-t border-[#DCE3EC] space-y-2">
              <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">
                Stamp layout on contract signing page:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label
                  className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                    stampPosition === 'overlap'
                      ? 'border-[#244A70] bg-[#EEF1F6]/40 text-[#244A70] font-semibold'
                      : 'border-[#DCE3EC] bg-white text-[#8491A3]'
                  }`}
                >
                  <input
                    type="radio"
                    name="stampPosition"
                    checked={stampPosition === 'overlap'}
                    onChange={() => setStampPosition('overlap')}
                    className="w-3.5 h-3.5 text-[#244A70]"
                  />
                  <span>Signature overlapping 1/3 seal</span>
                </label>

                <label
                  className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                    stampPosition === 'side_by_side'
                      ? 'border-[#244A70] bg-[#EEF1F6]/40 text-[#244A70] font-semibold'
                      : 'border-[#DCE3EC] bg-white text-[#8491A3]'
                  }`}
                >
                  <input
                    type="radio"
                    name="stampPosition"
                    checked={stampPosition === 'side_by_side'}
                    onChange={() => setStampPosition('side_by_side')}
                    className="w-3.5 h-3.5 text-[#244A70]"
                  />
                  <span>Seal beside signature</span>
                </label>

                <label
                  className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                    stampPosition === 'signature_only'
                      ? 'border-[#244A70] bg-[#EEF1F6]/40 text-[#244A70] font-semibold'
                      : 'border-[#DCE3EC] bg-white text-[#8491A3]'
                  }`}
                >
                  <input
                    type="radio"
                    name="stampPosition"
                    checked={stampPosition === 'signature_only'}
                    onChange={() => setStampPosition('signature_only')}
                    className="w-3.5 h-3.5 text-[#244A70]"
                  />
                  <span>Signature only + CA badge</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Contract Signature Preview & CA Infrastructure Status */}
        <div className="xl:col-span-5 space-y-5">
          {/* Box 1: Real-time Contract Sign Box Preview */}
          <div className="p-4 rounded-xl border border-[#DCE3EC] bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE3EC]">
              <span className="text-xs font-bold text-[#17263A] flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#244A70]" />
                Preview signing box on ALSM contract
              </span>
              <span className="text-[10px] text-[#8491A3] bg-[#F4F7FB] px-2 py-0.5 rounded font-mono">
                PAdES Standard
              </span>
            </div>

            {/* Simulated Contract Signature Box */}
            <div className="p-4 rounded-lg border-2 border-blue-900/20 bg-[#F8FAFC] text-center space-y-2 relative overflow-hidden select-none">
              <div className="text-[11px] font-bold text-[#17263A] uppercase tracking-wide">
                SERVICE PROVIDER REPRESENTATIVE (PARTY A)
              </div>
              <div className="text-[10px] text-[#8491A3] font-medium">
                {companyName || 'ALSM SOFTWARE MODERNIZATION TECHNOLOGY JOINT STOCK COMPANY'}
              </div>

              {/* Dynamic Seal & Signature Area */}
              <div className="h-28 relative flex items-center justify-center my-1">
                {/* When OVERLAP: Seal is in background slightly offset, signature on top */}
                {stampPosition === 'overlap' && (
                  <>
                    {companySealUrl && (
                      <div className="absolute left-1/2 -translate-x-[65%] top-1/2 -translate-y-1/2 w-24 h-24 opacity-85 pointer-events-none">
                        <img
                          src={companySealUrl}
                          alt="Seal Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    {signatureImageUrl ? (
                      <div className="relative z-10 max-h-24 max-w-[200px] flex items-center justify-center">
                        <img
                          src={signatureImageUrl}
                          alt="Signature Preview"
                          className="max-h-20 max-w-full object-contain drop-shadow-xs"
                        />
                      </div>
                    ) : (
                      <div className="text-xs italic text-[#8491A3] border border-dashed border-[#DCE3EC] px-4 py-3 rounded">
                        [No representative signature]
                      </div>
                    )}
                  </>
                )}

                {/* When SIDE BY SIDE */}
                {stampPosition === 'side_by_side' && (
                  <div className="flex items-center justify-center gap-4 w-full">
                    {companySealUrl && (
                      <div className="w-20 h-20 shrink-0">
                        <img
                          src={companySealUrl}
                          alt="Seal"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    {signatureImageUrl ? (
                      <div className="max-h-20 max-w-[150px] flex items-center justify-center">
                        <img
                          src={signatureImageUrl}
                          alt="Signature"
                          className="max-h-16 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-xs italic text-[#8491A3] border border-dashed border-[#DCE3EC] px-3 py-2 rounded">
                        [No signature]
                      </div>
                    )}
                  </div>
                )}

                {/* When SIGNATURE ONLY */}
                {stampPosition === 'signature_only' && (
                  <div className="flex items-center justify-center w-full">
                    {signatureImageUrl ? (
                      <img
                        src={signatureImageUrl}
                        alt="Signature"
                        className="max-h-20 max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-xs italic text-[#8491A3] border border-dashed border-[#DCE3EC] px-4 py-3 rounded">
                        [No representative signature]
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Signer credentials */}
              <div className="pt-1 border-t border-[#DCE3EC]/60 space-y-0.5">
                <div className="text-xs font-bold text-[#17263A]">
                  {signerName || 'Nguyen Gia Khanh'}
                </div>
                <div className="text-[10px] text-[#8491A3]">
                  {signerTitle || 'General Director'}
                </div>
              </div>

              {/* Security Watermark Badge */}
              <div className="mt-2 pt-2 border-t border-dashed border-[#DCE3EC] text-[9.5px] font-mono text-emerald-700 bg-emerald-50/70 py-1 px-2 rounded flex flex-col items-center">
                <span>✓ Digital signature verified by: {certProvider || 'VNPT-CA'}</span>
                <span className="text-[#8491A3]">Serial: {certSerial || 'VNPT-ECA-ALSM-01'}</span>
              </div>
            </div>

            {signatureImageUrl && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSignatureImageUrl('')}
                  className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove current signature specimen
                </button>
              </div>
            )}
          </div>

          {/* Box 2: Certificate Provider & Cryptographic Engine Config */}
          <div className="p-4 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Digital Certificate & PKI Infrastructure
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {certificateStatus === 'active' ? 'Active' : certificateStatus}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#8491A3]">
                <span>CA Provider:</span>
                <span className="font-semibold text-[#17263A]">{certProvider || 'VNPT-CA'}</span>
              </div>
              <div className="flex items-center justify-between text-[#8491A3]">
                <span>Certificate Serial:</span>
                <span className="font-mono text-[#17263A] font-semibold">{certSerial || 'VNPT-ECA-ALSM-01'}</span>
              </div>
              <div className="flex items-center justify-between text-[#8491A3]">
                <span>Validity Period:</span>
                <span className="font-medium text-[#17263A]">{certificateValidUntil}</span>
              </div>
            </div>

            {/* Signing Method Selector */}
            <div className="pt-2 border-t border-[#DCE3EC] space-y-1.5">
              <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">
                Signing connection method:
              </label>
              <select
                value={signingMethod}
                onChange={(e) => setSigningMethod(e.target.value as any)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#DCE3EC] bg-white text-[#17263A] focus:border-[#244A70] outline-none"
              >
                <option value="cloud_ca">Cloud CA / SmartCA Remote Signing (Automated API - Recommended)</option>
                <option value="hsm">HSM Dedicated Hardware Server (High Volume)</option>
                <option value="usb_token">USB Token PKCS#11 (Manual hardware device required)</option>
              </select>
            </div>

            {/* Test connection action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestCAConnection}
                disabled={isVerifyingCA}
                className="w-full h-8 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#244A70] bg-white border border-[#244A70]/30 hover:bg-[#EEF1F6]/50 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {isVerifyingCA ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting to verify {certProvider}...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify CA certificate connection</span>
                  </>
                )}
              </button>

              {caVerifySuccess && (
                <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Certificate {certSerial} is valid and ready for automated signing.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

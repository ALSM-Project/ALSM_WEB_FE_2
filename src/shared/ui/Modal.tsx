import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091E42]/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full ${maxWidths[maxWidth]} bg-white border border-[#D9E2EC] rounded-3xl shadow-[0_20px_60px_rgba(9,30,66,0.15)] overflow-hidden flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#D9E2EC]">
            <h3 className="text-lg font-bold text-[#091E42] tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#42526E] hover:text-[#091E42] p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  );
};
export default Modal;

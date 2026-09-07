import React from 'react';
import { Modal } from '@/shared/ui';
import { LivePreviewPanel } from './LivePreviewPanel';
import { MenuItem } from '../types/menu';

export interface PreviewNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarNav: MenuItem[];
  selectedItemId: string | null;
}

export const PreviewNavigationModal: React.FC<PreviewNavigationModalProps> = ({
  isOpen,
  onClose,
  sidebarNav,
  selectedItemId,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Navigation Shell Live Preview">
      <div className="py-2">
        <LivePreviewPanel sidebarNav={sidebarNav} selectedItemId={selectedItemId} />
      </div>
    </Modal>
  );
};

export default PreviewNavigationModal;

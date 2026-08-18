import React from 'react';
import { type InfoModalType, type InfoModalTab } from './modalUtils';
import { HelpModal } from './HelpModal';
import { UpdatesModal } from './UpdatesModal';
import { ReportModal } from './ReportModal';
import { FeedbackModal } from './FeedbackModal';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';

export type { InfoModalType, InfoModalTab };
export { HelpModal, UpdatesModal, ReportModal, FeedbackModal, TermsModal, PrivacyModal };

/* ── 7. COMPOSITE INFOMODAL WRAPPER (SWITCHER FOR INDIVIDUAL MODALS) ── */
export const InfoModal: React.FC<{
  isOpen: boolean;
  initialTab?: InfoModalType;
  roomCode?: string | null;
  onClose: () => void;
  onOpenFeedback?: () => void;
}> = ({ isOpen, initialTab = 'help', roomCode, onClose, onOpenFeedback }) => {
  if (!isOpen) return null;

  switch (initialTab) {
    case 'help':
      return <HelpModal isOpen={isOpen} onClose={onClose} />;
    case 'updates':
      return <UpdatesModal isOpen={isOpen} onClose={onClose} />;
    case 'report':
      return <ReportModal isOpen={isOpen} roomCode={roomCode} onClose={onClose} />;
    case 'feedback':
      return <FeedbackModal isOpen={isOpen} roomCode={roomCode} onClose={onClose} />;
    case 'terms':
      return <TermsModal isOpen={isOpen} onClose={onClose} />;
    case 'privacy':
      return <PrivacyModal isOpen={isOpen} onClose={onClose} onOpenFeedback={onOpenFeedback} />;
    default:
      return <HelpModal isOpen={isOpen} onClose={onClose} />;
  }
};

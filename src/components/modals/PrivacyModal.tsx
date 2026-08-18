import React from 'react';
import { X, Shield } from 'lucide-react';
import { ModalPortal, useModalBehavior } from './modalUtils';

/* ── 6. PRIVACY POLICY MODAL ── */
export const PrivacyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void;
}> = ({ isOpen, onClose, onOpenFeedback }) => {
  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><Shield size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Privacy Policy</h2>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Privacy modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section info-legal-text">

              <h3>1. No Account Required</h3>
              <p>Karaoke Go does not require you to create an account, provide an email address, or set a password to use the app.</p>

              <h3>2. Temporary Session Data</h3>
              <p>To make each karaoke session work, Karaoke Go temporarily stores information such as room codes, nicknames, and song queue data. This information is only used for the active karaoke session.</p>

              <h3>3. Browser Storage</h3>
              <p>We may use browser storage to remember your preferences, such as your selected theme and room connection. We do not use tracking cookies or advertising cookies.</p>

              <h3>4. Third-Party Services</h3>
              <p>Karaoke Go may use third-party services for features such as real-time room synchronization and video playback. Only the information necessary to provide these features is shared with those services.</p>

              <h3>5. No Selling of Personal Data</h3>
              <p>Karaoke Go does not sell, rent, or monetize your personal information.</p>

              <h3>6. Contact Us</h3>
              <p>If you have questions or concerns about this Privacy Policy, you can contact us through the {onOpenFeedback ? (
                <button type="button" className="info-inline-btn" onClick={() => { onClose(); onOpenFeedback(); }}>Feedback</button>
              ) : 'Feedback'} form available in Karaoke Go.</p>
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Privacy Policy</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

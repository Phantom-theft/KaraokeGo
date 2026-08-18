import React from 'react';
import { X, FileText } from 'lucide-react';
import { ModalPortal, useModalBehavior } from './modalUtils';

/* ── 5. TERMS OF SERVICE MODAL ── */
export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><FileText size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Terms of Service</h2>
                <p className="info-modal-subheading">Guidelines, rights, and responsibilities for using Karaoke Go</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Terms modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section info-legal-text">

              <h3>1. Acceptance of Terms</h3>
              <p>By using Karaoke Go, you agree to these Terms of Service.</p>

              <h3>2. Using Karaoke Go</h3>
              <p>Karaoke Go is a free web-based karaoke platform where a host can create a room and participants can join using a room code or QR code to search and add songs to the queue.</p>

              <h3>3. Third-Party Content</h3>
              <p>Karaoke Go uses third-party services, including YouTube, for video and music playback. All videos, music, lyrics, and other content belong to their respective owners. Karaoke Go does not claim ownership of this content.</p>

              <h3>4. Responsible Use</h3>
              <p>Please use Karaoke Go responsibly. Do not attempt to abuse, disrupt, or interfere with the app or its services.</p>

              <h3>5. Service Availability</h3>
              <p>Karaoke Go is provided as available. We cannot guarantee that the service will always be uninterrupted or error-free.</p>

              <h3>6. Changes to These Terms</h3>
              <p>These Terms may be updated from time to time. Continued use of Karaoke Go means you accept any updated Terms.</p>
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Terms of Service</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

import React from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { ModalPortal, useModalBehavior } from './modals/modalUtils';

interface PwaInstallButtonProps {
  disabled?: boolean;
}

const IosInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div
          className="search-modal-box info-modal-box landing-pwa-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon">
                <Smartphone size={22} />
              </div>
              <div>
                <h2 id="pwa-install-title" className="info-modal-heading">Install Karaoke Go</h2>
                <p className="info-modal-subheading">Add the app to your home screen</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close install instructions">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div ref={contentRef} className="info-modal-content custom-scrollbar landing-pwa-modal-body">
            <ol className="landing-pwa-steps">
              <li>
                <span className="landing-pwa-step-icon" aria-hidden="true">
                  <Share size={18} strokeWidth={2.2} />
                </span>
                <span>Tap the <strong>Share</strong> button in Safari.</span>
              </li>
              <li>
                <span className="landing-pwa-step-icon landing-pwa-step-icon--plus" aria-hidden="true">+</span>
                <span>Choose <strong>Add to Home Screen</strong>.</span>
              </li>
              <li>
                <span className="landing-pwa-step-icon landing-pwa-step-icon--check" aria-hidden="true">✓</span>
                <span>Tap <strong>Add</strong> to install Karaoke Go.</span>
              </li>
            </ol>
            <p className="landing-pwa-note">
              Tap the Share button, then choose Add to Home Screen.
            </p>
          </div>

          <div className="info-modal-footer">
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({ disabled = false }) => {
  const {
    isInstalled,
    canInstall,
    install,
    showIosInstructions,
    closeIosInstructions,
  } = usePwaInstall();

  if (isInstalled) {
    return (
      <div className="landing-install-installed" role="status">
        <CheckCircle2 size={16} strokeWidth={2.4} aria-hidden="true" />
        <span>App installed</span>
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <>
      <div className="landing-install-section">
        <p className="landing-install-kicker">Install the app</p>
        <button
          type="button"
          className="landing-install-btn"
          onClick={() => void install()}
          disabled={disabled}
        >
          <span className="landing-install-icon" aria-hidden="true">
            <Download size={20} strokeWidth={2.2} />
          </span>
          <span className="landing-install-copy">
            <span className="landing-install-title">Install Karaoke Go</span>
            <span className="landing-install-desc">Add to your home screen for quick access</span>
          </span>
        </button>
      </div>

      <IosInstallModal isOpen={showIosInstructions} onClose={closeIosInstructions} />
    </>
  );
};

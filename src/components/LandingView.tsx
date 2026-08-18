import React, { useState } from 'react';
import { Mic2, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import phonePreview from '../assets/img/img1.png';
import laptopPreview from '../assets/img/laptop_img.png';
import tvPreview from '../assets/img/tv_img.png';
import brandLogo from '../assets/logo/icon-96x96.png';
import { ThemeToggle } from './ThemeToggle';
import { InfoModal, type InfoModalTab } from './InfoModal';

interface LandingViewProps {
  onSelectHost: () => void;
  onSelectJoin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onSelectHost, onSelectJoin }) => {
  const [exitingTo, setExitingTo] = useState<'host' | 'join' | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<InfoModalTab>('help');

  const previewJoinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://karaokego.app';

  const navigate = (target: 'host' | 'join') => {
    if (exitingTo) return;
    setExitingTo(target);
    window.setTimeout(() => {
      if (target === 'host') onSelectHost();
      else onSelectJoin();
    }, 380);
  };

  const openInfoModal = (tab: InfoModalTab) => {
    setInfoModalTab(tab);
    setInfoModalOpen(true);
  };

  return (
    <div className={`landing-page ${exitingTo ? 'is-exiting' : ''}`}>
      <header className="landing-site-header">
        <div className="landing-site-header-inner">
          <div className="landing-header-brand-wrap">
            <img
              src={brandLogo}
              alt=""
              width={28}
              height={28}
              className="landing-header-logo"
              aria-hidden="true"
            />
            <p className="landing-brand">Karaoke Go</p>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero-left">
            <p className="landing-min-kicker">Live karaoke nights</p>
            <h1 className="landing-hero-brand">Karaoke Go</h1>
            <p className="landing-min-subtitle">
              Host from your TV or laptop, then let guests join instantly with a
              4-letter code.
            </p>

            <div className="landing-min-card">
              <header className="landing-min-header">
                <p className="landing-min-kicker">Get started</p>
                <h2>Choose your role</h2>
              </header>

              <p className="landing-choice-hint">
                Pick how you want to jump into the party.
              </p>

              <div className="landing-choice-grid">
                <button
                  type="button"
                  className={`landing-choice-btn ${exitingTo === 'host' ? 'is-pressed' : ''}`}
                  onClick={() => navigate('host')}
                  disabled={!!exitingTo}
                >
                  <span className="landing-choice-icon" aria-hidden="true">
                    <Mic2 size={22} strokeWidth={2.2} />
                  </span>
                  <span className="landing-choice-copy">
                    <span className="landing-choice-title">Host</span>
                    <span className="landing-choice-desc">Create a room and run the stage</span>
                  </span>
                </button>

                <button
                  type="button"
                  className={`landing-choice-btn ${exitingTo === 'join' ? 'is-pressed' : ''}`}
                  onClick={() => navigate('join')}
                  disabled={!!exitingTo}
                >
                  <span className="landing-choice-icon" aria-hidden="true">
                    <Smartphone size={22} strokeWidth={2.2} />
                  </span>
                  <span className="landing-choice-copy">
                    <span className="landing-choice-title">Join</span>
                    <span className="landing-choice-desc">Enter a code and add songs</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-device-cluster">
              <div className="landing-phone-glow" aria-hidden="true" />

              <div className="landing-device-wrap landing-device-wrap--tv">
                <div className="landing-device-frame">
                  <img
                    src={tvPreview}
                    alt="Karaoke Go stage view on a TV"
                    className="landing-device landing-device--tv"
                  />
                </div>
              </div>

              <div className="landing-phone-stage">
                <div className="landing-phone-ring" aria-hidden="true" />

                <div className="landing-phone-frame">
                  <img
                    src={phonePreview}
                    alt="Karaoke Go guest app on a phone showing the live queue and song search"
                    className="landing-phone-img"
                  />
                </div>

                <div className="landing-phone-qr glass-qr">
                  <div className="glass-qr-code">
                    <QRCodeSVG
                      value={previewJoinUrl}
                      size={72}
                      bgColor="transparent"
                      fgColor="#121212"
                      level="M"
                    />
                  </div>
                  <div className="glass-qr-copy">
                    <span className="glass-qr-label">Scan to join</span>
                    <span className="glass-qr-hint">Phone guests, no app install</span>
                  </div>
                </div>
              </div>

              <div className="landing-device-wrap landing-device-wrap--laptop">
                <div className="landing-device-frame">
                  <img
                    src={laptopPreview}
                    alt="Karaoke Go host view on a laptop"
                    className="landing-device landing-device--laptop"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner landing-footer-inner--clean">
          <div className="landing-footer-brand">
            <img
              src={brandLogo}
              alt=""
              width={36}
              height={36}
              className="landing-footer-logo"
              aria-hidden="true"
            />
            <div>
              <p className="landing-footer-name">Karaoke Go</p>
              <p className="landing-footer-tag">Host the stage. Guests run the queue.</p>
            </div>
          </div>

          <div className="landing-footer-links-row">
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => openInfoModal('terms')}
            >
              Terms
            </button>
            <span className="landing-footer-bullet" aria-hidden="true">•</span>
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => openInfoModal('privacy')}
            >
              Privacy
            </button>
            <span className="landing-footer-bullet" aria-hidden="true">•</span>
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => openInfoModal('help')}
            >
              Help & FAQ
            </button>
            <span className="landing-footer-bullet" aria-hidden="true">•</span>
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => openInfoModal('updates')}
            >
              Updates
            </button>
            <span className="landing-footer-bullet" aria-hidden="true">•</span>
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => openInfoModal('report')}
            >
              Report
            </button>
            <span className="landing-footer-bullet" aria-hidden="true">•</span>
            <button
              type="button"
              className="landing-footer-link-btn"
              onClick={() => openInfoModal('feedback')}
            >
              Feedback
            </button>
          </div>

          <p className="landing-footer-copy">
            © {new Date().getFullYear()} Karaoke Go
          </p>
        </div>
      </footer>

      {/* Dedicated Modals for Terms, Privacy, Help & FAQ, Updates, Report, and Feedback */}
      <InfoModal
        isOpen={infoModalOpen}
        initialTab={infoModalTab}
        onClose={() => setInfoModalOpen(false)}
        onOpenFeedback={() => openInfoModal('feedback')}
      />
    </div>
  );
};

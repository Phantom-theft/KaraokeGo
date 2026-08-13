import React, { useState } from 'react';
import { Mic2, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import phonePreview from '../assets/img/img1.png';

interface LandingViewProps {
  onSelectHost: () => void;
  onSelectJoin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onSelectHost, onSelectJoin }) => {
  const [exitingTo, setExitingTo] = useState<'host' | 'join' | null>(null);
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

  return (
    <div className={`landing-page ${exitingTo ? 'is-exiting' : ''}`}>
      <header className="landing-site-header">
        <div className="landing-site-header-inner">
          <p className="landing-brand">Karaoke Go</p>
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

          <div className="landing-hero-visual" aria-hidden="false">
            <div className="landing-phone-stage">
              <img
                src={phonePreview}
                alt="Karaoke Go guest app on a phone showing the live queue and song search"
                className="landing-phone-img"
              />

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
          </div>
        </section>
      </main>
    </div>
  );
};

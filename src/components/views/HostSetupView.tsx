import React, { useState } from 'react';
import { ArrowLeft, Music2, Smartphone, Radio, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import brandLogo from '../../assets/logo/icon-96x96.png';
import { ThemeToggle } from '../ThemeToggle';

interface HostSetupViewProps {
  onHost: (roomCode: string, userId: string, userName: string) => void;
  onBack: () => void;
}

export const HostSetupView: React.FC<HostSetupViewProps> = ({ onHost, onBack }) => {
  const [hostName, setHostName] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const { createRoom } = useRealtimeRoom(null, null);

  const handleBack = () => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(onBack, 280);
  };

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    setActionError(null);
    try {
      const name = hostName.trim() || 'Host';
      const userId = 'host_' + Math.random().toString(36).substring(2, 9);
      const code = await createRoom(name, userId);
      onHost(code, userId, name);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to create room. Please check Firebase setup.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className={`setup-page ${isExiting ? 'is-exiting' : ''}`}>
      <header className="setup-header">
        <button type="button" onClick={handleBack} className="setup-back-btn" aria-label="Back to Home">
          <ArrowLeft size={18} strokeWidth={2.4} />
          Back
        </button>
        <div className="setup-header-brand">
          <img
            src={brandLogo}
            alt=""
            width={32}
            height={32}
            className="setup-header-logo"
            aria-hidden="true"
          />
          <span className="setup-header-name">Karaoke Go</span>
        </div>
        <div className="setup-header-spacer">
          <ThemeToggle />
        </div>
      </header>

      <main className="setup-shell">
        <div className="setup-two-col">
          <div className="setup-form-panel">
            <div className="setup-form-icon setup-form-icon--logo" aria-hidden="true">
              <img src={brandLogo} alt="" width={52} height={52} />
            </div>
            <h1 className="setup-form-title">Start Your Party</h1>
            <p className="setup-form-subtitle">
              Create a karaoke room in seconds. Share the code and let the singing begin.
            </p>

            {actionError && <div className="setup-error">{actionError}</div>}

            <form onSubmit={handleHostSubmit} className="setup-form">
              <div className="form-field">
                <label htmlFor="hostNameInput" className="form-label">Your host name</label>
                <input
                  id="hostNameInput"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value.slice(0, 32))}
                  placeholder="e.g. Alex"
                  className="setup-input"
                  required
                  maxLength={32}
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label">Room mode</label>
                <div className="form-read-only-pill">
                  <Radio size={15} aria-hidden="true" />
                  Live Sync Party Mode
                </div>
              </div>

              <button type="submit" className="setup-submit-btn" disabled={loadingAction}>
                {loadingAction ? 'Creating Room...' : 'Create Room'}
                {!loadingAction && <Sparkles size={16} aria-hidden="true" />}
              </button>
            </form>
          </div>

          <div className="setup-info-panel">
            <p className="setup-info-kicker">What you get</p>
            <h2 className="setup-info-title">Host a live karaoke experience</h2>
            <p className="setup-info-desc">
              No accounts required join instantly in your browser or install the Karaoke Go app. 
              Add songs, and the host plays them live on the big screen.
            </p>

            <ul className="setup-feature-list">
              {[
                { icon: Music2, label: 'Search millions of YouTube karaoke tracks' },
                { icon: Smartphone, label: 'Guests join via 4-letter code or QR scan' },
                { icon: Radio, label: 'Real-time queue synced to all devices' },
                { icon: SlidersHorizontal, label: 'Full playback, skip & volume controls' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.label} className="setup-feature-item">
                    <span className="setup-feature-icon" aria-hidden="true">
                      <Icon size={16} strokeWidth={2.2} />
                    </span>
                    <span>{f.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

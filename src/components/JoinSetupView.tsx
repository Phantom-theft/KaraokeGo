import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic2, Music2, Smartphone, Search, ListMusic, Trash2, Radio } from 'lucide-react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

interface JoinSetupViewProps {
  onJoin: (roomCode: string, userId: string, userName: string) => void;
  onBack: () => void;
  initialCode?: string;
}

export const JoinSetupView: React.FC<JoinSetupViewProps> = ({ onJoin, onBack, initialCode = '' }) => {
  const [joinCode, setJoinCode] = useState(initialCode);
  const [joinName, setJoinName] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const { joinRoom } = useRealtimeRoom(null, null);

  const handleBack = () => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(onBack, 280);
  };

  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode.trim().toUpperCase());
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      setJoinCode(roomParam.trim().toUpperCase());
    }
  }, [initialCode]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setActionError('Please enter the 4-character room code.');
      return;
    }
    setLoadingAction(true);
    setActionError(null);
    try {
      const name = joinName.trim() || 'Guest';
      const userId = 'user_' + Math.random().toString(36).substring(2, 9);
      await joinRoom(code, name, userId);
      onJoin(code, userId, name);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to join room. Please check the room code.');
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
          <span className="setup-header-icon" aria-hidden="true">
            <Mic2 size={18} strokeWidth={2.4} />
          </span>
          <span className="setup-header-name">Karaoke Go</span>
        </div>
        <div className="setup-header-spacer" />
      </header>

      <main className="setup-shell">
        <div className="setup-two-col">
          <div className="setup-form-panel">
            <div className="setup-form-icon" aria-hidden="true">
              <Smartphone size={28} strokeWidth={2.2} />
            </div>
            <h1 className="setup-form-title">Join a Room</h1>
            <p className="setup-form-subtitle">
              Got a 4-letter code from the host? Enter it below and join the party.
            </p>

            {actionError && <div className="setup-error">{actionError}</div>}

            <form onSubmit={handleJoinSubmit} className="setup-form">
              <div className="form-field">
                <span className="form-label" id="joinCodeLabel">Room code</span>
                <InputOTP
                  maxLength={4}
                  value={joinCode}
                  onChange={(value) => setJoinCode(value.toUpperCase())}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  autoFocus={!joinCode}
                  aria-label="Room code"
                  containerClassName="setup-otp"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="form-field">
                <label htmlFor="joinNameInput" className="form-label">Your name</label>
                <input
                  id="joinNameInput"
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Jordan"
                  className="setup-input"
                  required
                />
              </div>

              <button type="submit" className="setup-submit-btn" disabled={loadingAction || joinCode.length !== 4}>
                {loadingAction ? 'Joining Room...' : 'Join Party'}
                {!loadingAction && <Radio size={16} aria-hidden="true" />}
              </button>
            </form>
          </div>

          <div className="setup-info-panel">
            <p className="setup-info-kicker">Guest experience</p>
            <h2 className="setup-info-title">Control the party from your phone</h2>
            <p className="setup-info-desc">
              No downloads, no accounts — open the link in your browser and start adding songs.
              The host plays them live on the big screen.
            </p>

            <ul className="setup-feature-list">
              {[
                { icon: Search, label: 'Search any karaoke song instantly' },
                { icon: ListMusic, label: 'Add songs directly to the live queue' },
                { icon: Music2, label: 'See what is coming up next' },
                { icon: Trash2, label: 'Remove your own songs if needed' },
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

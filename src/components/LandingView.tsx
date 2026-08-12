import React, { useState, useEffect } from 'react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';

interface LandingViewProps {
  onHost: (roomCode: string, userId: string, userName: string) => void;
  onJoin: (roomCode: string, userId: string, userName: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onHost, onJoin }) => {
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      setJoinCode(roomParam.trim().toUpperCase());
      setActiveTab('join');
    }
  }, []);

  const { createRoom, joinRoom } = useRealtimeRoom(null, null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    setActionError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      if (!code) return;
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
    <div className={`landing-page ${darkMode ? 'dark-mode' : ''}`}>
      <header className="landing-site-header">
        <div className="landing-site-header-inner">
          <p className="landing-brand">Karaoke Go</p>
          <button
            type="button"
            className="landing-theme-toggle"
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <main className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-min-kicker">Simple karaoke for any screen</p>
            <h1>Start a karaoke room in seconds.</h1>
            <p className="landing-min-subtitle">
              Host from your TV or laptop, then let guests join instantly with a
              4-letter code.
            </p>
            <ul className="landing-hero-points">
              <li>Real-time synced queue</li>
              <li>Easy guest control from phones</li>
              <li>No app install required</li>
            </ul>
          </div>

          <section className="landing-min-card">
            <header className="landing-min-header">
              <div>
                <p className="landing-min-kicker">Get started</p>
                <h2>{activeTab === 'host' ? 'Host a Room' : 'Join a Room'}</h2>
              </div>
            </header>

            {actionError && <div className="landing-error">{actionError}</div>}

            <div className="landing-tabs" role="tablist" aria-label="Room action">
              <button
                type="button"
                className={`landing-tab ${activeTab === 'host' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('host')}
                role="tab"
                aria-selected={activeTab === 'host'}
              >
                Host
              </button>
              <button
                type="button"
                className={`landing-tab ${activeTab === 'join' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('join')}
                role="tab"
                aria-selected={activeTab === 'join'}
              >
                Join
              </button>
            </div>

            {activeTab === 'host' ? (
              <form onSubmit={handleHostSubmit} className="landing-form">
                <div>
                  <label htmlFor="hostNameInput">Host display name</label>
                  <input
                    id="hostNameInput"
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="landing-input"
                    required
                  />
                </div>
                <button type="submit" className="landing-submit" disabled={loadingAction}>
                  {loadingAction ? 'Creating room...' : 'Create room'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinSubmit} className="landing-form">
                <div>
                  <label htmlFor="joinCodeInput">Room code</label>
                  <input
                    id="joinCodeInput"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABCD"
                    maxLength={4}
                    className="landing-input landing-room-code"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="joinNameInput">Your name</label>
                  <input
                    id="joinNameInput"
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="e.g. Jordan"
                    className="landing-input"
                    required
                  />
                </div>
                <button type="submit" className="landing-submit" disabled={loadingAction}>
                  {loadingAction ? 'Joining room...' : 'Join room'}
                </button>
              </form>
            )}
          </section>
        </section>

        <section className="landing-info-grid">
          <article className="landing-info-card">
            <h3>Create and share</h3>
            <p>Launch a room and share the 4-letter code with your friends.</p>
          </article>
          <article className="landing-info-card">
            <h3>Build the queue</h3>
            <p>Guests can add songs from their phones while the host controls playback.</p>
          </article>
          <article className="landing-info-card">
            <h3>Sing together</h3>
            <p>Keep the party moving with a smooth and simple shared experience.</p>
          </article>
        </section>

        <section className="landing-steps">
          <h2>How it works</h2>
          <div className="landing-steps-grid">
            <div><span>1</span>Create room</div>
            <div><span>2</span>Share code</div>
            <div><span>3</span>Start singing</div>
          </div>
        </section>
      </main>
    </div>
  );
};

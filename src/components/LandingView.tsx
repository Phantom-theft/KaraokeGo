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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      setJoinCode(roomParam.trim().toUpperCase());
      const launchpadEl = document.getElementById('launchpad');
      if (launchpadEl) {
        launchpadEl.scrollIntoView({ behavior: 'smooth' });
      }
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

  const scrollToLaunchpad = () => {
    const el = document.getElementById('launchpad');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Navigation Bar */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#" className="brand-logo">
            KaraokeGo
          </a>

          <nav>
            <ul className="nav-links">
              <li><a href="#features" className="nav-link">Features</a></li>
              <li><a href="#how-it-works" className="nav-link">How It Works</a></li>
              <li><a href="#launchpad" className="nav-link">Launch Room</a></li>
            </ul>
          </nav>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={scrollToLaunchpad} className="button-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Join Room
            </button>
            <button onClick={scrollToLaunchpad} className="button-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
              Host Stage
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main style={{ flex: 1 }}>
        {/* 2. Hero Banner Section */}
        <section style={{ padding: '5rem 1.5rem 4rem 1.5rem', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="modern-badge modern-badge-indigo floating-element" style={{ marginBottom: '1.5rem' }}>
            Real-Time Party Stage • No App Download Needed
          </div>
          <h1 style={{ fontSize: '3.8rem', lineHeight: 1.1, margin: '0 0 1.25rem 0', fontWeight: 900, background: 'linear-gradient(180deg, #ffffff 0%, #00f3ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 30px rgba(0, 243, 255, 0.2)' }}>
            Turn Any TV or Laptop into a Full Karaoke Stage
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', lineHeight: 1.6, maxWidth: '680px', margin: '0 auto 2.5rem auto' }}>
            Stream 4K YouTube karaoke tracks on your main TV screen while guests search songs, request tracks, and queue music live directly from their mobile phones.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
            <button onClick={scrollToLaunchpad} className="button-primary" style={{ fontSize: '1.05rem', padding: '0.95rem 2rem' }}>
              Host Stage Room
            </button>
            <button onClick={scrollToLaunchpad} className="button-secondary" style={{ fontSize: '1.05rem', padding: '0.95rem 2rem' }}>
              Join Remote Controller
            </button>
          </div>

          {/* Highlights Pills */}
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>Instant 4-Letter QR Join</span>
            <span>•</span>
            <span>Millions of YouTube Karaoke Songs</span>
            <span>•</span>
            <span>Real-Time Mobile Queue Sync</span>
          </div>
        </section>

        {/* 3. Launchpad Section (Interactive Host & Join Forms) */}
        <section id="launchpad" style={{ padding: '3rem 1.5rem', maxWidth: '960px', margin: '0 auto' }}>
          <div className="modern-card" style={{ padding: '2.5rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="modern-badge modern-badge-pink" style={{ marginBottom: '0.75rem' }}>
                LIVE PARTY LAUNCHPAD
              </div>
              <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
                Get Started in Seconds
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Select whether you are setting up the TV stage screen or joining as a mobile guest.
              </p>
              {actionError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '10px', marginTop: '1rem', fontSize: '0.9rem' }}>
                  {actionError}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {/* Host Room Box */}
              <div className="modern-card" style={{ background: 'rgba(3, 7, 18, 0.7)', borderColor: 'rgba(0, 243, 255, 0.25)', padding: '1.75rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#00f3ff' }}>Host Stage Screen</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Recommended for TV, Laptop, or Projector. Plays video/audio, generates QR code, and shows master stage controls.
                </p>
                <form onSubmit={handleHostSubmit}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor="hostNameInput" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      HOST NAME
                    </label>
                    <input
                      id="hostNameInput"
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="modern-input"
                      required
                    />
                  </div>
                  <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loadingAction}>
                    {loadingAction ? 'Creating Room...' : 'Launch Stage Room'}
                  </button>
                </form>
              </div>

              {/* Join Remote Box */}
              <div className="modern-card" style={{ background: 'rgba(3, 7, 18, 0.7)', borderColor: 'rgba(255, 255, 255, 0.15)', padding: '1.75rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>Join Remote Controller</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Recommended for Smartphones & Tablets. Search songs, request tracks, and view the live queue without video streaming.
                </p>
                <form onSubmit={handleJoinSubmit}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="joinCodeInput" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      4-LETTER ROOM CODE
                    </label>
                    <input
                      id="joinCodeInput"
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ABCD"
                      maxLength={4}
                      className="modern-input"
                      style={{
                        fontSize: '1.25rem',
                        letterSpacing: '4px',
                        textAlign: 'center',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor="joinNameInput" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      YOUR NAME
                    </label>
                    <input
                      id="joinNameInput"
                      type="text"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      placeholder="e.g. Jordan"
                      className="modern-input"
                      required
                    />
                  </div>
                  <button type="submit" className="button-secondary" style={{ width: '100%' }} disabled={loadingAction}>
                    {loadingAction ? 'Joining Room...' : 'Join Remote Controller'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Features Section */}
        <section id="features" style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="modern-badge modern-badge-emerald" style={{ marginBottom: '0.75rem' }}>
              POWERFUL FEATURES
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.75rem 0', fontWeight: 800 }}>
              Everything You Need for the Ultimate Party
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '580px', margin: '0 auto' }}>
              Designed from the ground up for seamless social singing on TV screens and mobile remotes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="modern-card feature-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#00f3ff' }}>TV Stage Video Player</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Dedicated widescreen video stage display designed for big screens, TVs, or laptops with auto-advancing tracks.
                </p>
              </div>
            </div>

            <div className="modern-card feature-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#00f3ff' }}>Mobile Remote Controller</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Lightweight web controller for smartphones. Guests search songs and add requests without video streaming overhead.
                </p>
              </div>
            </div>

            <div className="modern-card feature-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#00f3ff' }}>Instant Real-Time Queue</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Queue updates instantly across all connected mobile remotes and the TV stage screen with zero refresh needed.
                </p>
              </div>
            </div>

            <div className="modern-card feature-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#00f3ff' }}>Scannable QR Code Join</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Display a scannable QR Code on the host stage screen so guests can point their camera to join the room in 1 second.
                </p>
              </div>
            </div>

            <div className="modern-card feature-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#00f3ff' }}>YouTube Track Integration</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Search popular karaoke hits or paste custom YouTube URLs to queue any song available on YouTube.
                </p>
              </div>
            </div>

            <div className="modern-card feature-card">
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#00f3ff' }}>Host Master Controls</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Host retains master control to Play, Pause, Skip Next, or remove songs from the queue at any time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. How It Works Section */}
        <section id="how-it-works" style={{ padding: '4rem 1.5rem 5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div className="modern-badge modern-badge-indigo" style={{ marginBottom: '0.75rem' }}>
              SIMPLE SETUP
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.75rem 0', fontWeight: 800 }}>
              How KaraokeGo Works in 3 Steps
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              No app store downloads or complicated setup needed.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            <div className="modern-card" style={{ textAlign: 'left' }}>
              <div className="step-number">1</div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Launch Host Stage</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Click <strong>Host Stage Room</strong> on your TV or Laptop browser to create a new room.
              </p>
            </div>

            <div className="modern-card" style={{ textAlign: 'left' }}>
              <div className="step-number">2</div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Scan QR Code</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Guests scan the TV QR Code or enter the 4-letter room code on their mobile phones.
              </p>
            </div>

            <div className="modern-card" style={{ textAlign: 'left' }}>
              <div className="step-number">3</div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Queue & Sing!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Everyone searches songs, adds tracks to the queue, and enjoys the live party!
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer Section */}
      <footer style={{ background: 'rgba(3, 7, 18, 0.95)', borderTop: '1px solid rgba(0, 243, 255, 0.15)', padding: '2.5rem 1.5rem', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <a href="#" className="brand-logo" style={{ fontSize: '1.2rem' }}>
              KaraokeGo
            </a>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Real-time video stage and mobile remote control experience.
            </p>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            © {new Date().getFullYear()} KaraokeGo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
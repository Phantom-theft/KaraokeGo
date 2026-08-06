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
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', inset: 0 }}>
      {/* Navbar Header */}
      <header className="landing-nav" style={{ flexShrink: 0, padding: '0.65rem 1.75rem' }}>
        <div className="landing-nav-inner" style={{ maxWidth: '1300px' }}>
          <a href="#" className="brand-logo" style={{ fontSize: '1.3rem' }}>
            KaraokeGo
          </a>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button onClick={() => setActiveTab('join')} className={activeTab === 'join' ? 'button-primary' : 'button-secondary'} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              Join Remote
            </button>
            <button onClick={() => setActiveTab('host')} className={activeTab === 'host' ? 'button-primary' : 'button-secondary'} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              Host Stage
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Content Grid */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '1rem 2.5rem', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1400px', width: '100%', display: 'grid', gridTemplateColumns: 'minmax(460px, 600px) 1fr', gap: '3rem', alignItems: 'center', height: '100%' }}>
          
          {/* LEFT SIDE: Hero Info + Enlarge LIVE PARTY LAUNCHPAD Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center' }}>
            
            {/* Top Text Content above Launchpad */}
            <div>
              <div className="modern-badge modern-badge-indigo floating-element" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                Real-Time Party Stage • No App Download Needed
              </div>
              
              <h1 style={{ fontSize: '2.4rem', lineHeight: 1.15, margin: '0 0 0.6rem 0', fontWeight: 900, background: 'linear-gradient(180deg, #ffffff 0%, #FFFFFB 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 30px rgba(255, 255, 251, 0.15)' }}>
                Turn Any TV or Laptop into a Full Karaoke Stage
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.45, margin: 0 }}>
                Stream 4K YouTube karaoke tracks on your main TV screen while guests search songs, request tracks, and queue music live directly from their mobile phones.
              </p>
            </div>

            {/* LIVE PARTY LAUNCHPAD Container (Expanded width & height) */}
            <div className="modern-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)', minHeight: '380px' }}>
              <div>
                <div className="modern-badge modern-badge-pink" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                  LIVE PARTY LAUNCHPAD
                </div>
                <h2 style={{ fontSize: '1.65rem', margin: '0 0 0.25rem 0', fontWeight: 800 }}>
                  Get Started
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
                  Host the TV stage player or join as a mobile remote controller.
                </p>
              </div>

              {actionError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {actionError}
                </div>
              )}

              {/* Selector Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('host')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeTab === 'host' ? 'var(--primary-gradient)' : 'transparent',
                    color: activeTab === 'host' ? '#030712' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Host Stage
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeTab === 'join' ? 'var(--primary-gradient)' : 'transparent',
                    color: activeTab === 'join' ? '#030712' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Join Remote
                </button>
              </div>

              {/* Tab Form Content */}
              {activeTab === 'host' ? (
                <form onSubmit={handleHostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <label htmlFor="hostNameInput" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      HOST DISPLAY NAME
                    </label>
                    <input
                      id="hostNameInput"
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g. Alex (Stage TV)"
                      className="modern-input"
                      style={{ padding: '0.8rem 1rem', fontSize: '0.95rem' }}
                      required
                    />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                    Creates a stage TV room with video player, live queue sync, and scannable guest QR code.
                  </p>
                  <button type="submit" className="button-primary" style={{ width: '100%', padding: '0.85rem 1.4rem', fontSize: '0.95rem' }} disabled={loadingAction}>
                    {loadingAction ? 'Creating Room...' : 'Launch Stage Room'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <label htmlFor="joinCodeInput" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
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
                        padding: '0.75rem',
                        fontSize: '1.25rem',
                        letterSpacing: '4px',
                        textAlign: 'center',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="joinNameInput" style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      YOUR NAME
                    </label>
                    <input
                      id="joinNameInput"
                      type="text"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      placeholder="e.g. Jordan"
                      className="modern-input"
                      style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                      required
                    />
                  </div>
                  <button type="submit" className="button-secondary" style={{ width: '100%', padding: '0.85rem 1.4rem', fontSize: '0.95rem' }} disabled={loadingAction}>
                    {loadingAction ? 'Joining Room...' : 'Join Remote Controller'}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: Reserved empty area for your custom plans */}
          <div style={{ width: '100%', height: '100%' }} />

        </div>
      </main>
    </div>
  );
};
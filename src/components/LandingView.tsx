import React, { useState, useEffect } from 'react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import heroImg from '../assets/img/img1.png';
import { Hero } from '@/components/ui/tailwind-css-background-snippet';

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
    <div
      className={darkMode ? 'dark-mode' : ''}
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        color: darkMode ? '#e2e8f0' : '#000000',
        transition: 'color 0.4s ease',
      }}
    >
      {/* ── Radial Gradient Background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 1, pointerEvents: 'none' }}>
        <Hero variant={darkMode ? 'dark' : 'light'} />
      </div>

      {/* Solid color base behind gradient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: darkMode ? '#000000' : 'var(--bg-main)', transition: 'background 0.4s ease' }} />

      {/* ── Main Centered Hero Layout ── */}
      <main className="landing-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="landing-outer-wrapper" style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* 1. Karaoke Image centered above the Main Card */}
          <div className="landing-hero-img-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <div className="floating-element" style={{ width: '100%', maxWidth: '1060px', borderRadius: '36px', overflow: 'hidden', position: 'relative' }}>
              <img
                src={heroImg}
                alt="Karaoke Stage Preview"
                style={{ width: '100%', height: 'auto', opacity: 0.88, objectFit: 'cover', display: 'block', borderRadius: '36px', border: 'none', boxShadow: 'none' }}
              />
              {/* Bottom Gradient Fade Overlay (Dark/Violet Fade) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  borderRadius: '36px',
                  background: darkMode
                    ? 'linear-gradient(to bottom, rgba(22, 27, 39, 0) 35%, rgba(22, 27, 39, 0.6) 70%, rgba(22, 27, 39, 0.98) 100%)'
                    : 'linear-gradient(to bottom, rgba(236, 248, 248, 0) 35%, rgba(236, 248, 248, 0.65) 70%, rgba(236, 248, 248, 0.98) 100%)',
                  transition: 'background 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* 2. Main Bordered Container Overlapping Lower Part of Widescreen Image */}
          <div
            className="modern-card landing-main-card"
            style={{
              width: '100%',
              maxWidth: '580px',
              position: 'relative',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.4rem',
              textAlign: 'left',
              background: darkMode ? '#161b27' : 'var(--bg-main)',
              boxShadow: darkMode ? '0 12px 36px rgba(0,0,0,0.65)' : 'var(--shadow-raised)',
              border: darkMode ? '1px solid rgba(124, 58, 237, 0.45)' : '1px solid rgba(194, 216, 216, 0.85)',
              transition: 'background 0.4s ease, border-color 0.4s ease',
            }}
          >

            {/* 3. "Karaoke Go" Title Overlapping Top Border Center */}
            <div
              className="landing-title-badge"
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: darkMode ? '#161b27' : 'var(--bg-main)',
                borderRadius: '9999px',
                color: darkMode ? '#a78bfa' : '#7c3aed',
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                boxShadow: darkMode ? '0 0 16px rgba(124, 58, 237, 0.4)' : 'var(--shadow-raised-sm)',
                border: darkMode ? '1px solid rgba(124, 58, 237, 0.5)' : '1px solid rgba(194, 216, 216, 0.8)',
                zIndex: 10,
                transition: 'background 0.4s ease, color 0.4s ease',
              }}
            >
              Karaoke Go
            </div>

            {/* STAGE LAUNCHPAD Header & Dark Mode Button */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.75rem' }}>
                <div className="modern-badge" style={{ fontSize: '0.78rem', color: darkMode ? '#e2e8f0' : '#000000', background: darkMode ? '#1e2736' : undefined, boxShadow: darkMode ? 'none' : undefined }}>
                  STAGE LAUNCHPAD
                </div>
                <button
                  onClick={() => setDarkMode(d => !d)}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  style={{
                    width: '38px',
                    height: '38px',
                    minWidth: '38px',
                    borderRadius: '50%',
                    border: darkMode ? '2px solid rgba(124,58,237,0.5)' : '2px solid rgba(194,216,216,0.8)',
                    background: darkMode ? '#1e2736' : 'var(--bg-main)',
                    boxShadow: darkMode ? '0 0 12px rgba(124,58,237,0.3), inset 2px 2px 6px rgba(0,0,0,0.3)' : 'var(--shadow-raised-sm)',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                    flexShrink: 0,
                  }}
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
              </div>

              <h2 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', margin: '0 0 0.25rem 0', fontWeight: 800, color: darkMode ? '#f1f5f9' : '#000000' }}>
                {activeTab === 'host' ? 'Host a New Stage Room' : 'Join an Existing Party'}
              </h2>
              <p style={{ color: darkMode ? '#94a3b8' : '#000000', margin: 0, fontSize: '0.88rem', fontWeight: 500 }}>
                {activeTab === 'host' ? 'Display the video player screen on your TV or monitor.' : 'Enter the 4-letter room code from the host TV screen.'}
              </p>
            </div>

            {actionError && (
              <div style={{ background: darkMode ? '#1e2736' : 'var(--bg-main)', boxShadow: 'var(--shadow-raised-sm)', border: '1px solid rgba(239, 68, 68, 0.4)', color: darkMode ? '#fca5a5' : '#000000', padding: '0.65rem 0.9rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                {actionError}
              </div>
            )}

            {/* Selector Tabs (Neumorphic Inset Pill) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: darkMode ? '#0f1117' : 'var(--bg-main)', boxShadow: darkMode ? 'inset 2px 2px 6px rgba(0,0,0,0.4)' : 'var(--shadow-inset)', padding: '6px', borderRadius: '14px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('host')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'host' ? (darkMode ? '#1e2736' : 'var(--bg-main)') : 'transparent',
                  boxShadow: activeTab === 'host' ? (darkMode ? '0 2px 8px rgba(0,0,0,0.4)' : 'var(--shadow-raised-sm)') : 'none',
                  color: darkMode ? '#e2e8f0' : '#000000',
                  fontWeight: 800,
                  fontSize: '0.92rem',
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
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'join' ? (darkMode ? '#1e2736' : 'var(--bg-main)') : 'transparent',
                  boxShadow: activeTab === 'join' ? (darkMode ? '0 2px 8px rgba(0,0,0,0.4)' : 'var(--shadow-raised-sm)') : 'none',
                  color: darkMode ? '#e2e8f0' : '#000000',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Join Remote
              </button>
            </div>

            {/* Tab Form Content */}
            {activeTab === 'host' ? (
              <form onSubmit={handleHostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label htmlFor="hostNameInput" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.8rem', fontWeight: 800, color: darkMode ? '#94a3b8' : '#000000', letterSpacing: '0.05em' }}>
                    HOST DISPLAY NAME
                  </label>
                  <input
                    id="hostNameInput"
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Alex (Stage TV)"
                    className="modern-input"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.9rem 1.1rem', fontSize: '0.98rem', color: darkMode ? '#e2e8f0' : '#000000', background: darkMode ? '#0f1117' : undefined, boxShadow: darkMode ? 'inset 2px 2px 6px rgba(0,0,0,0.5)' : undefined }}
                    required
                  />
                </div>
                <p style={{ color: darkMode ? '#64748b' : '#000000', fontSize: '0.84rem', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                  Creates a real-time room with full YouTube player, sync queue, and guest QR code.
                </p>
                <button type="submit" className="button-primary" style={{ width: '100%', padding: '0.95rem 1.5rem', fontSize: '1.05rem', color: '#ffffff' }} disabled={loadingAction}>
                  {loadingAction ? 'Creating Stage...' : 'Launch Stage Room'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="joinCodeInput" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 800, color: darkMode ? '#94a3b8' : '#000000', letterSpacing: '0.05em' }}>
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
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.85rem',
                      fontSize: 'clamp(1.1rem, 6vw, 1.4rem)',
                      letterSpacing: 'clamp(3px, 1.5vw, 6px)',
                      textAlign: 'center',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: darkMode ? '#e2e8f0' : '#000000',
                      background: darkMode ? '#0f1117' : undefined,
                      boxShadow: darkMode ? 'inset 2px 2px 6px rgba(0,0,0,0.5)' : undefined,
                    }}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="joinNameInput" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 800, color: darkMode ? '#94a3b8' : '#000000', letterSpacing: '0.05em' }}>
                    YOUR NAME
                  </label>
                  <input
                    id="joinNameInput"
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="e.g. Jordan"
                    className="modern-input"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.85rem 1.1rem', fontSize: '0.98rem', color: darkMode ? '#e2e8f0' : '#000000', background: darkMode ? '#0f1117' : undefined, boxShadow: darkMode ? 'inset 2px 2px 6px rgba(0,0,0,0.5)' : undefined }}
                    required
                  />
                </div>
                <button type="submit" className="button-primary" style={{ width: '100%', padding: '0.95rem 1.5rem', fontSize: '1.05rem', color: '#ffffff' }} disabled={loadingAction}>
                  {loadingAction ? 'Joining Room...' : 'Connect Remote Controller'}
                </button>
              </form>
            )}
          </div>

          {/* Subtitle Pitch underneath */}
          <p style={{ color: darkMode ? '#cbd5e1' : '#000000', fontSize: 'clamp(0.82rem, 2.5vw, 0.95rem)', lineHeight: 1.5, margin: '1.75rem 0 0 0', textAlign: 'center', fontWeight: 600, padding: '0 0.5rem' }}>
            Turn Any Screen into a Live Karaoke Stage • Instant Phone Pairing
          </p>

        </div>
      </main>
    </div>
  );
};

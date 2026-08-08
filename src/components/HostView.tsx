import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import { searchKaraokeTracks, type SongSearchResult } from '../services/youtube';
import type { Song, QueueItem } from '../types';

interface HostViewProps {
  roomCode: string;
  userId: string;
  userName: string;
  onLeave?: () => void;
}

export const HostView: React.FC<HostViewProps> = ({ roomCode, userId, userName, onLeave }) => {
  const { room, loading, error, addToQueue, removeFromQueue, updatePlayback } = useRealtimeRoom(roomCode, userId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'search' | 'queue'>('search');
  const [showQrModal, setShowQrModal] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Always-current ref to room so timer callbacks don't capture stale state
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; }, [room]);

  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // Live YouTube search as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchKaraokeTracks(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddSong = (song: SongSearchResult) => {
    const songData: Song = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      duration: song.duration,
    };
    addToQueue(songData, `${userName} (Host)`);
  };

  const handlePlayPause = () => {
    if (!room) return;
    const currentlyPlaying = room.playback.status === 'playing';
    updatePlayback({
      status: currentlyPlaying ? 'paused' : 'playing',
    });
  };

  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextUpInfo, setNextUpInfo] = useState<{ title: string; addedBy: string } | null>(null);
  const [videoBlocked, setVideoBlocked] = useState(false);

  const handleSkipNext = useCallback(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    const sortedQueue = Object.values(currentRoom.queue).sort((a, b) => a.timestamp - b.timestamp);
    if (currentRoom.playback.currentQueueId) {
      removeFromQueue(currentRoom.playback.currentQueueId);
    }
    const remaining = sortedQueue.filter(item => item.queueId !== currentRoom.playback.currentQueueId);
    if (remaining.length > 0) {
      const nextSong = remaining[0];
      setNextUpInfo({ title: nextSong.title, addedBy: nextSong.addedBy });
      setCountdown(3);
    } else {
      updatePlayback({ currentQueueId: null, currentTime: 0, status: 'idle' });
    }
  }, [removeFromQueue, updatePlayback]);

  // Countdown timer effect before playing next song
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setNextUpInfo(null);
      if (!room) return;
      const sortedQueue = Object.values(room.queue).sort((a, b) => a.timestamp - b.timestamp);
      if (sortedQueue.length > 0) {
        updatePlayback({
          currentQueueId: sortedQueue[0].queueId,
          currentTime: 0,
          status: 'playing',
        });
      }
    }
  }, [countdown, room]);

  const getCurrentSong = (): QueueItem | null => {
    if (!room || !room.playback.currentQueueId) return null;
    return room.queue[room.playback.currentQueueId] || null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSong = getCurrentSong();
  const sortedQueue = room ? Object.values(room.queue).sort((a, b) => a.timestamp - b.timestamp) : [];

  // Wrapper to handle deleting from queue
  const handleRemoveFromQueue = (queueId: string) => {
    if (!room) return;
    
    // If we're deleting the currently playing song, skip to next
    if (room.playback.currentQueueId === queueId) {
      handleSkipNext();
    } else {
      removeFromQueue(queueId);
    }
  };

  // Auto-play next song whenever currentQueueId becomes null or invalid but queue is not empty
  useEffect(() => {
    if (!room) return;
    const queueList = Object.values(room.queue).sort((a, b) => a.timestamp - b.timestamp);
    if (queueList.length > 0) {
      const currentExists = queueList.some(item => item.queueId === room.playback.currentQueueId);
      if (!room.playback.currentQueueId || !currentExists) {
        updatePlayback({
          currentQueueId: queueList[0].queueId,
          currentTime: 0,
          status: 'playing',
        });
      }
    } else if (room.playback.currentQueueId) {
      updatePlayback({
        currentQueueId: null,
        currentTime: 0,
        status: 'idle',
      });
    }
  }, [room?.queue, room?.playback.currentQueueId]);

  // ── Duration-based auto-next: fires exactly once when the song finishes ──
  const skipFiredRef = useRef(false);

  useEffect(() => {
    if (!currentSong) return;
    // Reset guard + blocked flag for each new song
    skipFiredRef.current = false;
    setVideoBlocked(false);

    const duration = currentSong.duration;
    if (!duration || duration <= 0) return;

    console.log(`[AutoNext] Song "${currentSong.title}" will auto-next in ${duration}s`);

    const timer = setTimeout(() => {
      if (!skipFiredRef.current) {
        skipFiredRef.current = true;
        console.log('[AutoNext] Timer fired → handleSkipNext');
        handleSkipNext();
      }
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [currentSong?.queueId]);

  // Detect YouTube error 101/150 = embedding disabled by video owner
  useEffect(() => {
    const handleYTError = (event: MessageEvent) => {
      if (!event.origin.includes('youtube')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onError' && (data?.info === 101 || data?.info === 150)) {
          console.warn('[YouTube] Embedding disabled — auto-skipping in 3s');
          setVideoBlocked(true);
          setTimeout(() => {
            if (!skipFiredRef.current) {
              skipFiredRef.current = true;
              handleSkipNext();
            }
          }, 3000);
        }
      } catch (_) {}
    };
    window.addEventListener('message', handleYTError);
    return () => window.removeEventListener('message', handleYTError);
  }, [currentSong?.queueId, handleSkipNext]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: 'var(--bg-main)' }}>
      <div className="simple-spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>Loading host stage...</p>
    </div>
  );
  if (error) return <div className="container modern-card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}><h2 style={{ color: '#0f172a' }}>Error: {error}</h2></div>;
  if (!room) return <div className="container modern-card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}><h2 style={{ color: '#0f172a' }}>Room missing or expired</h2></div>;

  const isPlaying = room.playback.status === 'playing';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-main)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* ── Top Bar (Neumorphic Header) ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        background: 'var(--bg-main)',
        boxShadow: '0 4px 16px rgba(194, 216, 216, 0.6)',
        borderBottom: 'var(--border-card)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="brand-logo" style={{ fontSize: '1.4rem' }}>KaraokeGo</span>
          <div style={{ width: '1px', height: '24px', background: '#c2d8d8' }} />
          <span className="modern-badge modern-badge-indigo" style={{ fontSize: '0.75rem' }}>HOST</span>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '2px', color: '#0f172a' }}>
            {roomCode}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {Object.keys(room.participants).length} online
          </span>
          <button
            onClick={() => setShowQrModal(true)}
            className="button-primary"
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}
          >
            QR Code
          </button>
          {onLeave && (
            <button
              onClick={onLeave}
              className="button-secondary"
              style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}
            >
              Exit
            </button>
          )}
        </div>
      </header>

      {/* ── Main Body: Video (left) + Sidebar (right) ── */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        gap: 0,
      }}>

        {/* ════════════ VIDEO STAGE ════════════ */}
        <div style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {countdown !== null && nextUpInfo ? (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
                zIndex: 20,
                animation: 'fadeIn 0.3s ease-out',
                padding: '2rem',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                }}>
                  Up Next
                </div>
                <div style={{
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  marginBottom: '0.75rem',
                  maxWidth: '80%',
                  lineHeight: 1.2,
                }}>
                  {nextUpInfo.title}
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  color: '#cbd5e1',
                  marginBottom: '2rem',
                }}>
                  Requested by <strong style={{ color: '#38bdf8' }}>{nextUpInfo.addedBy}</strong>
                </div>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '4px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  boxShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
                  background: 'rgba(56, 189, 248, 0.1)',
                }}>
                  {countdown}
                </div>
              </div>
            ) : currentSong ? (
              <>
                <iframe
                  ref={iframeRef}
                  key={currentSong.id}
                  src={`https://www.youtube-nocookie.com/embed/${currentSong.id}?autoplay=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                  width="100%"
                  height="100%"
                  style={{ position: 'absolute', top: 0, left: 0, border: 'none' }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={currentSong.title}
                />
                {videoBlocked && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: '#0f172a',
                    textAlign: 'center', padding: '2rem',
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                      Video Unavailable
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '380px' }}>
                      <strong style={{ color: '#ffffff' }}>"{currentSong.title}"</strong> cannot be played on external sites — the owner disabled embedding.
                    </div>
                    <div style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                      Auto-skipping to next song in 3 seconds…
                    </div>
                    <button
                      onClick={() => { skipFiredRef.current = true; handleSkipNext(); }}
                      className="button-primary"
                      style={{ padding: '0.5rem 1.5rem' }}
                    >
                      Skip Now
                    </button>
                  </div>
                )}
              </>

            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)',
              }}>
                <h2 style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '1.8rem' }}>
                  Stage is Empty
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                  Search and add karaoke songs from the sidebar!
                </p>
              </div>
            )}
          </div>

          {currentSong && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.85rem 1.4rem',
              background: 'var(--bg-main)',
              boxShadow: 'var(--shadow-raised-sm)',
              borderTop: 'var(--border-card)',
              flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '1rem',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: '#0f172a',
                }}>
                  {currentSong.title}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                  {currentSong.artist} &nbsp;·&nbsp;
                  <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>added by {currentSong.addedBy}</span>
                  &nbsp;·&nbsp;
                  <span style={{ color: 'var(--text-muted)' }}>
                    {formatTime(room.playback.currentTime)} / {formatTime(currentSong.duration || 240)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
                <button
                  onClick={handlePlayPause}
                  className="button-primary"
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', minWidth: '90px' }}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={handleSkipNext}
                  className="button-secondary"
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}
                >
                  Skip
                </button>
              </div>

              <span className={isPlaying ? 'modern-badge modern-badge-emerald' : 'modern-badge modern-badge-indigo'}>
                {isPlaying ? 'LIVE' : room.playback.status === 'paused' ? 'PAUSED' : 'IDLE'}
              </span>
            </div>
          )}
        </div>

        {/* ════════════ SIDEBAR (Neumorphic) ════════════ */}
        <div style={{
          width: '340px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-main)',
          borderLeft: 'var(--border-card)',
          overflow: 'hidden',
        }}>

          {/* Neumorphic Inset Tabs Header */}
          <div style={{
            margin: '0.85rem',
            background: 'var(--bg-main)',
            boxShadow: 'var(--shadow-inset)',
            borderRadius: '14px',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            flexShrink: 0,
          }}>
            {(['search', 'queue'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  border: 'none',
                  borderRadius: '10px',
                  background: selectedTab === tab ? 'var(--bg-main)' : 'transparent',
                  boxShadow: selectedTab === tab ? 'var(--shadow-raised-sm)' : 'none',
                  color: selectedTab === tab ? 'var(--primary-dark)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab === 'search' ? 'Search' : `Queue (${sortedQueue.length})`}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.85rem 0.85rem 0.85rem' }}>

            {/* Search Tab */}
            {selectedTab === 'search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <input
                  type="text"
                  placeholder="Search song title or artist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modern-input"
                  style={{ marginBottom: '0.25rem' }}
                />
                {isSearching && (
                  <p style={{ color: 'var(--primary-dark)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', margin: '0.5rem 0' }}>Searching YouTube...</p>
                )}
                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>No results found.</p>
                )}
                {searchResults.map(song => (
                  <div
                    key={song.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--bg-main)',
                      boxShadow: 'var(--shadow-raised-sm)',
                      borderRadius: '12px',
                      border: 'var(--border-card)',
                    }}
                  >
                    <img src={song.thumbnail} alt={song.title} style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '6px', marginRight: '0.5rem' }} />
                    <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {song.artist}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSong(song)}
                      className="button-primary"
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', borderRadius: '8px', flexShrink: 0 }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Queue Tab */}
            {selectedTab === 'queue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {sortedQueue.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Queue is empty</div>
                  </div>
                ) : (
                  sortedQueue.map((item, index) => {
                    const isCurrent = room.playback.currentQueueId === item.queueId;
                    return (
                      <div
                        key={item.queueId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.75rem',
                          background: 'var(--bg-main)',
                          boxShadow: isCurrent ? 'var(--shadow-inset)' : 'var(--shadow-raised-sm)',
                          borderRadius: '12px',
                          border: isCurrent ? '2px solid var(--primary-light)' : 'var(--border-card)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem', color: isCurrent ? 'var(--primary-dark)' : 'var(--text-muted)', flexShrink: 0 }}>
                            {isCurrent ? '►' : index + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              {item.addedBy}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromQueue(item.queueId)}
                          className="button-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', borderRadius: '8px', flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}

                <div style={{
                  marginTop: '1rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid rgba(194, 216, 216, 0.5)',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Online ({Object.keys(room.participants).length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {Object.values(room.participants).map(p => (
                      <span key={p.id} className="modern-badge modern-badge-indigo" style={{ textTransform: 'none', fontSize: '0.74rem' }}>
                        {p.isHost ? 'Host: ' : ''}{p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal (Neumorphic) */}
      {showQrModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(236, 248, 248, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="modern-card" style={{ maxWidth: '360px', width: '100%', textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>Join Stage Room</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>
              Scan with your mobile camera to join as a participant.
            </p>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '20px', display: 'inline-block', margin: '1.25rem 0', boxShadow: 'var(--shadow-raised-sm)' }}>
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '5px', color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>
              {roomCode}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', fontWeight: 500 }}>{joinUrl}</p>
            <button onClick={() => setShowQrModal(false)} className="button-primary" style={{ width: '100%', marginTop: '1.25rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
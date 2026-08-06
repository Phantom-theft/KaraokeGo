import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { QRCodeSVG } from 'qrcode.react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import { searchKaraokeTracks, fetchYouTubeVideoInfo, type SongSearchResult } from '../services/youtube';
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

  const handleSkipNext = () => {
    if (!room) return;
    const sortedQueue = Object.values(room.queue).sort((a, b) => a.timestamp - b.timestamp);
    if (room.playback.currentQueueId) {
      removeFromQueue(room.playback.currentQueueId);
    }

    const remaining = sortedQueue.filter(item => item.queueId !== room.playback.currentQueueId);
    if (remaining.length > 0) {
      updatePlayback({
        currentQueueId: remaining[0].queueId,
        currentTime: 0,
        status: 'playing',
      });
    } else {
      updatePlayback({
        currentQueueId: null,
        currentTime: 0,
        status: 'idle',
      });
    }
  };

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

  // Automatic song playback timer when current song duration finishes
  useEffect(() => {
    if (!currentSong || room?.playback.status !== 'playing') return;

    const duration = currentSong.duration || 240;
    const remainingSeconds = duration - (room?.playback.currentTime || 0);

    if (remainingSeconds <= 0) {
      handleSkipNext();
      return;
    }

    const timer = setTimeout(() => {
      handleSkipNext();
    }, remainingSeconds * 1000);

    return () => clearTimeout(timer);
  }, [currentSong?.queueId, room?.playback.status]);

  if (room && room.playback.status === 'idle' && sortedQueue.length > 0 && !room.playback.currentQueueId) {
    updatePlayback({
      currentQueueId: sortedQueue[0].queueId,
      currentTime: 0,
      status: 'playing',
    });
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
      <div className="simple-spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Loading host stage...</p>
    </div>
  );
  if (error) return <div className="container modern-card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}><h2>Error: {error}</h2></div>;
  if (!room) return <div className="container modern-card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}><h2>Room missing or expired</h2></div>;

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
      {/* ── Top Bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.6rem 1.25rem',
        background: 'rgba(3, 7, 18, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 251, 0.2)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff, #FFFFFB)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>KaraokeGo</span>
          <div style={{ width: '1px', height: '24px', background: 'rgba(0, 243, 255, 0.2)' }} />
          <span className="modern-badge modern-badge-indigo" style={{ fontSize: '0.7rem' }}>HOST</span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '2px', color: '#FFFFFB' }}>
            {roomCode}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {Object.keys(room.participants).length} online
          </span>
          <button
            onClick={() => setShowQrModal(true)}
            className="button-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          >
            QR Code
          </button>
          {onLeave && (
            <button
              onClick={onLeave}
              className="button-secondary"
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
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
          background: '#030712',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {currentSong ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${currentSong.id}?autoplay=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`}
                width="100%"
                height="100%"
                style={{ position: 'absolute', top: 0, left: 0, border: 'none' }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={currentSong.title}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'radial-gradient(ellipse at center, rgba(255, 255, 251, 0.06) 0%, #030712 100%)',
              }}>
                <h2 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.6rem' }}>
                  Stage is Empty
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
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
              padding: '0.75rem 1.25rem',
              background: 'rgba(3, 7, 18, 0.96)',
              borderTop: '1px solid rgba(255, 255, 251, 0.2)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}>
                  {currentSong.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                  {currentSong.artist} &nbsp;·&nbsp;
                  <span style={{ color: '#BEB8AF' }}>added by {currentSong.addedBy}</span>
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

        {/* ════════════ SIDEBAR ════════════ */}
        <div style={{
          width: '320px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(3, 7, 18, 0.98)',
          borderLeft: '1px solid rgba(255, 255, 251, 0.12)',
          overflow: 'hidden',
        }}>

          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 251, 0.12)',
            flexShrink: 0,
          }}>
            {(['search', 'queue'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  flex: 1,
                  padding: '0.75rem 0.4rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  border: 'none',
                  background: 'transparent',
                  color: selectedTab === tab ? '#FFFFFB' : 'var(--text-muted)',
                  borderBottom: selectedTab === tab ? '2px solid #FFFFFB' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
              >
                {tab === 'search' ? 'Search' : `Queue (${sortedQueue.length})`}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

            {/* Search Tab */}
            {selectedTab === 'search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search song title or artist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modern-input"
                  style={{ marginBottom: '0.5rem' }}
                />
                {isSearching && (
                  <p style={{ color: '#FFFFFB', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0' }}>Searching YouTube...</p>
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
                      padding: '0.55rem 0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 251, 0.1)',
                    }}
                  >
                    <img src={song.thumbnail} alt={song.title} style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '6px', marginRight: '0.5rem' }} />
                    <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {song.artist}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSong(song)}
                      className="button-primary"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', borderRadius: '8px', flexShrink: 0 }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}



            {/* Queue Tab */}
            {selectedTab === 'queue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedQueue.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '0.85rem' }}>Queue is empty</div>
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
                          padding: '0.6rem 0.75rem',
                          background: isCurrent ? 'rgba(255, 255, 251, 0.1)' : 'rgba(255,255,255,0.03)',
                          borderRadius: '10px',
                          border: isCurrent ? '1px solid rgba(255, 255, 251, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem', color: isCurrent ? '#FFFFFB' : 'var(--text-muted)', flexShrink: 0 }}>
                            {isCurrent ? '►' : index + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              {item.addedBy}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromQueue(item.queueId)}
                          className="button-secondary"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.7rem', borderRadius: '8px', flexShrink: 0 }}
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
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Online ({Object.keys(room.participants).length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {Object.values(room.participants).map(p => (
                      <span key={p.id} className="modern-badge modern-badge-indigo" style={{ textTransform: 'none', fontSize: '0.72rem' }}>
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

      {/* QR Code Modal */}
      {showQrModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(3, 7, 18, 0.9)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="modern-card" style={{ maxWidth: '360px', width: '100%', textAlign: 'center', background: '#090d16', padding: '2rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFB' }}>Join Stage Room</h2>
            <p style={{ color: '#BEB8AF', fontSize: '0.88rem' }}>
              Scan with your mobile camera to join as a participant.
            </p>
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '16px', display: 'inline-block', margin: '1.25rem 0', boxShadow: '0 10px 30px rgba(255,255,251,0.15)' }}>
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '5px', color: '#FFFFFB', marginBottom: '0.5rem' }}>
              {roomCode}
            </div>
            <p style={{ fontSize: '0.72rem', color: '#BEB8AF', wordBreak: 'break-all' }}>{joinUrl}</p>
            <button onClick={() => setShowQrModal(false)} className="button-primary" style={{ width: '100%', marginTop: '1.25rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
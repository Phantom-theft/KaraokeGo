import React, { useState, useEffect } from 'react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import { searchKaraokeTracks, type SongSearchResult } from '../services/youtube';
import type { Song } from '../types';

interface ParticipantViewProps {
  roomCode: string;
  userId: string;
  userName: string;
  onLeave: () => void;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  roomCode,
  userId,
  userName,
  onLeave,
}) => {
  const { room, loading, error, addToQueue, removeFromQueue } = useRealtimeRoom(roomCode, userId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'search' | 'queue'>('search');
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

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
    addToQueue(songData, userName);
    showToast(`Added "${song.title}" to queue!`);
  };

  const showToast = (msg: string) => {
    setAddSuccessMessage(msg);
    setTimeout(() => {
      setAddSuccessMessage(null);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSong = (): Song | null => {
    if (!room || !room.playback.currentQueueId) return null;
    const queueItem = room.queue[room.playback.currentQueueId];
    return queueItem ? queueItem : null;
  };

  const currentSong = getCurrentSong();
  const sortedQueue = room ? Object.values(room.queue).sort((a, b) => a.timestamp - b.timestamp) : [];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: 'var(--bg-main)' }}>
      <div className="simple-spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>Connecting to room {roomCode}...</p>
    </div>
  );
  if (error) return <div className="container modern-card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}><h2 style={{ color: '#0f172a' }}>Error: {error}</h2><button className="button-primary" onClick={onLeave} style={{ marginTop: '1rem' }}>Back to Home</button></div>;
  if (!room) return <div className="container modern-card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}><h2 style={{ color: '#0f172a' }}>Room not found</h2><button className="button-primary" onClick={onLeave} style={{ marginTop: '1rem' }}>Back to Home</button></div>;

  return (
    <div className="container" style={{ maxWidth: '640px', margin: '1rem auto', padding: '1rem' }}>
      {/* Remote Header */}
      <div className="modern-card" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="modern-badge modern-badge-indigo">ROOM CODE</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--primary-dark)' }}>{roomCode}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
            {userName} (Remote Controller)
          </div>
        </div>
        <button onClick={onLeave} className="button-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
          Leave
        </button>
      </div>

      {/* Now Playing Widget */}
      <div className="modern-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Playing on Stage</h3>
          <span className={room.playback.status === 'playing' ? 'modern-badge modern-badge-emerald' : 'modern-badge modern-badge-indigo'}>
            {room.playback.status === 'playing' ? 'PLAYING' : room.playback.status === 'paused' ? 'PAUSED' : 'IDLE'}
          </span>
        </div>

        {currentSong ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', boxShadow: 'var(--shadow-inset)', borderRadius: '14px' }}>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '10px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentSong.title}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{currentSong.artist}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', marginTop: '2px', fontWeight: 600 }}>
                Requested by: {room.queue[room.playback.currentQueueId || '']?.addedBy || 'Host'}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '0.75rem 0', fontSize: '0.95rem', fontWeight: 500 }}>
            No song playing right now. Add one below!
          </p>
        )}
      </div>

      {/* Toast Notification */}
      {addSuccessMessage && (
        <div style={{
          background: 'var(--bg-main)',
          boxShadow: 'var(--shadow-raised-sm)',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          color: '#059669',
          padding: '0.75rem 1rem',
          borderRadius: '14px',
          marginBottom: '1rem',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '0.9rem'
        }}>
          {addSuccessMessage}
        </div>
      )}

      {/* Navigation Tabs (Neumorphic Inset) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-main)', boxShadow: 'var(--shadow-inset)', padding: '6px', borderRadius: '14px' }}>
        <button
          onClick={() => setSelectedTab('search')}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '10px',
            border: 'none',
            background: selectedTab === 'search' ? 'var(--bg-main)' : 'transparent',
            boxShadow: selectedTab === 'search' ? 'var(--shadow-raised-sm)' : 'none',
            color: selectedTab === 'search' ? 'var(--primary-dark)' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Search
        </button>
        <button
          onClick={() => setSelectedTab('queue')}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '10px',
            border: 'none',
            background: selectedTab === 'queue' ? 'var(--bg-main)' : 'transparent',
            boxShadow: selectedTab === 'queue' ? 'var(--shadow-raised-sm)' : 'none',
            color: selectedTab === 'queue' ? 'var(--primary-dark)' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Queue ({sortedQueue.length})
        </button>
      </div>

      {/* Tab 1: Song Search Library */}
      {selectedTab === 'search' && (
        <div className="modern-card">
          <input
            type="text"
            placeholder="Search song title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="modern-input"
            style={{ marginBottom: '1rem' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
            {isSearching && (
              <p style={{ color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>Searching YouTube...</p>
            )}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No songs matched your search.</p>
            )}
            {!isSearching && !searchQuery && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Type a song name above to search live YouTube karaoke tracks!</p>
            )}
            {searchResults.map(song => (
              <div
                key={song.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'var(--bg-main)',
                  boxShadow: 'var(--shadow-raised-sm)',
                  borderRadius: '14px',
                  border: 'var(--border-card)',
                  gap: '0.75rem'
                }}
              >
                <img src={song.thumbnail} alt={song.title} style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{song.artist} • {formatTime(song.duration)}</div>
                </div>
                <button
                  onClick={() => handleAddSong(song)}
                  className="button-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '10px' }}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Real-Time Queue */}
      {selectedTab === 'queue' && (
        <div className="modern-card">
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>Live Queue</h3>
          {sortedQueue.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>The queue is currently empty!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
              {sortedQueue.map((item, index) => {
                const isCurrent = room.playback.currentQueueId === item.queueId;
                return (
                  <div
                    key={item.queueId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'var(--bg-main)',
                      boxShadow: isCurrent ? 'var(--shadow-inset)' : 'var(--shadow-raised-sm)',
                      borderRadius: '14px',
                      border: isCurrent ? '2px solid var(--primary-light)' : 'var(--border-card)'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: isCurrent ? 'var(--primary-dark)' : 'var(--text-muted)', width: '20px', fontSize: '0.9rem' }}>
                      {index + 1}
                    </span>
                    <img src={item.thumbnail} alt={item.title} style={{ width: '52px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title} {isCurrent && <span style={{ fontSize: '0.75rem', color: 'var(--primary-dark)' }}>(Now Playing)</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.artist}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', fontWeight: 600 }}>By: {item.addedBy}</div>
                    </div>
                    {item.addedBy === userName && !isCurrent && (
                      <button
                        onClick={() => removeFromQueue(item.queueId)}
                        className="button-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '10px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import { type SongSearchResult } from '../services/youtube';
import type { Song } from '../types';
import { SearchModal } from './SearchModal';

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
  const [selectedTab, setSelectedTab] = useState<'search' | 'queue'>('search');
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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
  if (error) return (
    <div className="container modern-card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>Error: {error}</h2>
      <button className="button-primary" onClick={onLeave} style={{ marginTop: '1rem' }}>Back to Home</button>
    </div>
  );
  if (!room) return (
    <div className="container modern-card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>Room not found</h2>
      <button className="button-primary" onClick={onLeave} style={{ marginTop: '1rem' }}>Back to Home</button>
    </div>
  );

  return (
    <div className="container participant-page" style={{ maxWidth: '640px', margin: '1rem auto', padding: '1rem' }}>
      {/* Remote Header */}
      <div className="modern-card" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="modern-badge modern-badge-indigo">ROOM CODE</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--accent)' }}>{roomCode}</span>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Playing on Stage</h3>
          <span className={room.playback.status === 'playing' ? 'modern-badge modern-badge-emerald' : 'modern-badge modern-badge-indigo'}>
            {room.playback.status === 'playing' ? 'PLAYING' : room.playback.status === 'paused' ? 'PAUSED' : 'IDLE'}
          </span>
        </div>

        {currentSong ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(18,18,18,0.65)', border: '1px solid rgba(176,141,87,0.22)', borderRadius: '14px' }}>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '10px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentSong.title}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{currentSong.artist}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '2px', fontWeight: 600 }}>
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
          background: 'rgba(122, 46, 58, 0.2)',
          boxShadow: 'none',
          border: '1px solid rgba(176, 141, 87, 0.4)',
          color: 'var(--accent)',
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

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(18,18,18,0.7)', border: '1px solid rgba(176,141,87,0.22)', padding: '6px', borderRadius: '14px' }}>
        <button
          onClick={() => setSelectedTab('search')}
          className={selectedTab === 'search' ? 'button-primary' : 'button-secondary'}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '10px',
            fontSize: '0.88rem',
            boxShadow: 'none',
          }}
        >
          Search Library
        </button>
        <button
          onClick={() => setSelectedTab('queue')}
          className={selectedTab === 'queue' ? 'button-primary' : 'button-secondary'}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '10px',
            fontSize: '0.88rem',
            boxShadow: 'none',
          }}
        >
          Queue ({sortedQueue.length})
        </button>
      </div>

      {/* Tab 1: Song Search Bar Trigger */}
      {selectedTab === 'search' && (
        <div className="modern-card" style={{ padding: '1.75rem', textAlign: 'center' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsSearchModalOpen(true)}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.7 }}>
              🔎
            </span>
            <input
              type="text"
              readOnly
              placeholder="Search songs or artists..."
              className="modern-input"
              style={{
                cursor: 'pointer',
                paddingLeft: '2.8rem',
                paddingRight: '3rem',
                fontSize: '1.02rem',
                border: '2px solid rgba(176, 141, 87, 0.35)',
              }}
              onClick={() => setIsSearchModalOpen(true)}
            />
            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.15rem' }}>
              🎤
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '1.1rem', fontWeight: 600 }}>
            Click the search bar above to open the full Karaoke song library & voice search!
          </p>
        </div>
      )}

      {/* Tab 2: Real-Time Queue */}
      {selectedTab === 'queue' && (
        <div className="modern-card">
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800 }}>Live Queue</h3>
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
                      background: isCurrent ? 'rgba(122, 46, 58, 0.18)' : 'rgba(18, 18, 18, 0.65)',
                      boxShadow: 'none',
                      borderRadius: '14px',
                      border: isCurrent ? '1px solid rgba(122, 46, 58, 0.65)' : '1px solid rgba(176, 141, 87, 0.22)'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: isCurrent ? 'var(--accent)' : 'var(--text-muted)', width: '20px', fontSize: '0.9rem' }}>
                      {index + 1}
                    </span>
                    <img src={item.thumbnail} alt={item.title} style={{ width: '52px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title} {isCurrent && <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>(Now Playing)</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.artist}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>By: {item.addedBy}</div>
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

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddSong={handleAddSong}
      />
    </div>
  );
};

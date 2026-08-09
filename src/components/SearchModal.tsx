import React, { useState, useEffect } from 'react';
import { searchKaraokeTracks, type SongSearchResult } from '../services/youtube';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (song: SongSearchResult) => void;
  buttonLabel?: string;
}

const POPULAR_SUGGESTIONS: SongSearchResult[] = [
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody (Karaoke Version)',
    artist: 'Queen',
    thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    duration: 354,
    isKaraoke: true,
  },
  {
    id: '1k8craCGwV4',
    title: "Don't Stop Believin' (Karaoke Version)",
    artist: 'Journey',
    thumbnail: 'https://i.ytimg.com/vi/1k8craCGwV4/hqdefault.jpg',
    duration: 250,
    isKaraoke: true,
  },
  {
    id: 'xFrGuyw1V8s',
    title: 'Dancing Queen (Karaoke Version)',
    artist: 'ABBA',
    thumbnail: 'https://i.ytimg.com/vi/xFrGuyw1V8s/hqdefault.jpg',
    duration: 232,
    isKaraoke: true,
  },
  {
    id: 'rYEDA3JcQqw',
    title: 'Rolling in the Deep (Karaoke Version)',
    artist: 'Adele',
    thumbnail: 'https://i.ytimg.com/vi/rYEDA3JcQqw/hqdefault.jpg',
    duration: 228,
    isKaraoke: true,
  },
  {
    id: 'JGwWNGJdvx8',
    title: 'Shape of You (Karaoke Version)',
    artist: 'Ed Sheeran',
    thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    duration: 233,
    isKaraoke: true,
  },
  {
    id: 'L0MK7qz13bU',
    title: 'Sweet Caroline (Karaoke Version)',
    artist: 'Neil Diamond',
    thumbnail: 'https://i.ytimg.com/vi/L0MK7qz13bU/hqdefault.jpg',
    duration: 202,
    isKaraoke: true,
  },
];

const SUGGESTION_TAGS = [
  'Air Supply',
  'Westlife',
  'Backstreet Boys',
  'Bee Gees',
  'The Beatles',
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onAddSong,
  buttonLabel = '+ Add to Queue',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [addedSongId, setAddedSongId] = useState<string | null>(null);

  // Debounced search effect
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
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Voice Search (Web Speech API)
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in your browser. Please type to search.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
        }
      };
      recognition.start();
    } catch (e) {
      console.error('Speech recognition error', e);
      setIsListening(false);
    }
  };

  const handleAdd = (song: SongSearchResult) => {
    onAddSong(song);
    setAddedSongId(song.id);
    setTimeout(() => {
      setAddedSongId(null);
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const displayList = searchQuery.trim() ? searchResults : POPULAR_SUGGESTIONS;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 17, 23, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '1.25rem',
        animation: 'hostFadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes modalPulseGlow {
          0%, 100% { box-shadow: 0 0 25px rgba(124, 58, 237, 0.35); }
          50% { box-shadow: 0 0 45px rgba(124, 58, 237, 0.65); }
        }
        @keyframes micPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        .song-modal-card {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .song-modal-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(124, 58, 237, 0.25);
          border-color: rgba(124, 58, 237, 0.6) !important;
        }
        .suggestion-tag-btn:hover {
          background: var(--primary-gradient) !important;
          color: #ffffff !important;
          transform: scale(1.04);
        }
        @media (max-width: 640px) {
          .song-grid-container {
            grid-template-columns: 1fr !important;
          }
          .search-modal-box {
            width: 95vw !important;
            height: 92vh !important;
            padding: 1.25rem 1rem !important;
          }
        }
      `}</style>

      {/* Main Large Modal Box */}
      <div
        className="search-modal-box"
        style={{
          width: '90vw',
          maxWidth: '1100px',
          height: '85vh',
          maxHeight: '850px',
          background: 'var(--bg-main)',
          border: '1px solid rgba(124, 58, 237, 0.45)',
          borderRadius: '28px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 35px rgba(124, 58, 237, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '1.75rem 2rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎵</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Search Songs
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid rgba(194, 216, 216, 0.8)',
              background: 'var(--bg-main)',
              boxShadow: 'var(--shadow-raised-sm)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              transition: 'all 0.2s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Large Search Bar Input with Voice Search Button */}
        <div style={{ position: 'relative', marginBottom: '0.85rem', flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', pointerEvents: 'none', opacity: 0.7 }}>
            🔎
          </span>
          <input
            type="text"
            placeholder="Search songs or artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="modern-input"
            style={{
              width: '100%',
              padding: '1.1rem 3.5rem 1.1rem 3.2rem',
              fontSize: '1.1rem',
              borderRadius: '20px',
              fontWeight: 600,
              border: '2px solid rgba(124, 58, 237, 0.4)',
              boxShadow: 'var(--shadow-inset-deep), 0 0 16px rgba(124, 58, 237, 0.15)',
            }}
          />
          {/* Microphone Voice Search Button */}
          <button
            onClick={handleVoiceSearch}
            title={isListening ? 'Listening...' : 'Search with Voice'}
            style={{
              position: 'absolute',
              right: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-main)',
              border: isListening ? '2px solid #ef4444' : '1px solid rgba(194, 216, 216, 0.8)',
              boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'var(--shadow-raised-sm)',
              borderRadius: '12px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.15rem',
              animation: isListening ? 'micPulse 1.2s infinite' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            🎤
          </button>
        </div>

        {/* Suggested Quick Search Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.25rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.2rem' }}>
            💡 Quick Suggestions:
          </span>
          {SUGGESTION_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="suggestion-tag-btn"
              style={{
                padding: '0.32rem 0.75rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                borderRadius: '9999px',
                border: '1px solid rgba(124, 58, 237, 0.35)',
                background: 'var(--bg-main)',
                boxShadow: 'var(--shadow-raised-sm)',
                color: 'var(--primary-dark)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🎵 {tag}
            </button>
          ))}
        </div>

        {/* Scrollable Results / Suggestions Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>
          {isSearching && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
              <div className="simple-spinner" />
              <p style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                Searching YouTube Karaoke Library…
              </p>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                No karaoke tracks found for "{searchQuery}".
              </p>
            </div>
          )}

          {/* Section Header for Popular Suggestions vs Search Results */}
          {!isSearching && (
            <div style={{ marginBottom: '1rem', fontSize: '0.86rem', fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {searchQuery.trim() ? `Search Results (${searchResults.length})` : '🔥 Popular Karaoke Hits & Suggestions'}
            </div>
          )}

          {/* 2-Column Grid on Desktop, 1-Column on Mobile */}
          {!isSearching && displayList.length > 0 && (
            <div
              className="song-grid-container"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.35rem',
                paddingBottom: '1.5rem',
              }}
            >
              {displayList.map((song) => (
                <div
                  key={song.id}
                  className="song-modal-card modern-card"
                  style={{
                    padding: '0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    border: '1px solid rgba(194, 216, 216, 0.85)',
                    background: 'var(--bg-main)',
                    boxShadow: 'var(--shadow-raised-sm)',
                  }}
                >
                  {/* Large 16:9 Thumbnail Image */}
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden', background: '#000000' }}>
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.35s ease',
                      }}
                    />
                    {song.duration > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.82)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontVariantNumeric: 'tabular-nums',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {formatTime(song.duration)}
                      </span>
                    )}
                  </div>

                  {/* Card Content & Action Button */}
                  <div style={{ padding: '1rem 1.15rem 1.15rem 1.15rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.85rem' }}>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 0.35rem 0',
                          fontSize: '1.02rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {song.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {song.artist}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAdd(song)}
                      className="button-primary"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        fontSize: '0.92rem',
                        borderRadius: '12px',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {addedSongId === song.id ? '✓ Added!' : buttonLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

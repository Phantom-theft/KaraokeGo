import React, { useState, useEffect } from 'react';
import { searchKaraokeTracks, type SongSearchResult } from '../services/youtube';
import { Wave } from './ui/wave';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (song: SongSearchResult) => void;
  buttonLabel?: string;
}

const POPULAR_SUGGESTIONS: SongSearchResult[] = [
  {
    id: 'tYPAxX8fdzQ',
    title: 'Two Less Lonely People (HD Karaoke)',
    artist: 'Air Supply',
    thumbnail: 'https://i.ytimg.com/vi/tYPAxX8fdzQ/hqdefault.jpg',
    duration: 0,
    isKaraoke: true,
  },
  {
    id: 'aopznAD6m9w',
    title: 'My Love (HD Karaoke)',
    artist: 'Westlife',
    thumbnail: 'https://i.ytimg.com/vi/aopznAD6m9w/hqdefault.jpg',
    duration: 0,
    isKaraoke: true,
  },
  {
    id: 'h0oahkr7dBk',
    title: 'As Long As You Love Me (HD Karaoke)',
    artist: 'Backstreet Boys',
    thumbnail: 'https://i.ytimg.com/vi/h0oahkr7dBk/hqdefault.jpg',
    duration: 0,
    isKaraoke: true,
  },
  {
    id: 'VQJKXVy67K0',
    title: "Don't Forget To Remember (HD Karaoke)",
    artist: 'Bee Gees',
    thumbnail: 'https://i.ytimg.com/vi/VQJKXVy67K0/hqdefault.jpg',
    duration: 0,
    isKaraoke: true,
  },
  {
    id: 'ETpX2HK8XaE',
    title: 'The Long And Winding Road (HD Karaoke)',
    artist: 'The Beatles',
    thumbnail: 'https://i.ytimg.com/vi/ETpX2HK8XaE/hqdefault.jpg',
    duration: 0,
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
      className="search-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="search-modal-box"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Search Songs
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="button-secondary"
            style={{
              padding: '0.5rem 0.9rem',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '0.85rem', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search songs or artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="modern-input"
            style={{
              width: '100%',
              padding: '1.1rem 1.25rem',
              fontSize: '1.1rem',
              borderRadius: '20px',
              fontWeight: 600,
              border: '2px solid rgba(176, 141, 87, 0.4)',
              boxShadow: '0 0 0 3px rgba(176, 141, 87, 0.08)',
            }}
          />
        </div>

        {/* Suggested Quick Search Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.25rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginRight: '0.2rem' }}>
            Quick Suggestions:
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
                border: '1px solid rgba(176, 141, 87, 0.35)',
                background: 'var(--chip-bg)',
                boxShadow: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Scrollable Results / Suggestions Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>
          {isSearching && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
              <Wave className="size-10" />
              <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                Searching YouTube Karaoke Library…
              </p>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                No karaoke tracks found for "{searchQuery}".
              </p>
            </div>
          )}

          {/* Section Header for Popular Suggestions vs Search Results */}
          {!isSearching && (
            <div style={{ marginBottom: '1rem', fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {searchQuery.trim() ? `Search Results (${searchResults.length})` : 'Popular Karaoke Hits'}
            </div>
          )}

          {/* 2-Column Grid on Desktop, 1-Column on Mobile */}
          {!isSearching && displayList.length > 0 && (
            <div className="song-grid-container">
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
                    border: '1px solid rgba(176, 141, 87, 0.28)',
                    background: 'var(--bg-card)',
                    boxShadow: 'none',
                  }}
                >
                  {/* Large 16:9 Thumbnail Image */}
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden', background: 'var(--bg-inset)' }}>
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
                          color: '#f8f4ef',
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
                          color: 'var(--text-primary)',
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
                      {addedSongId === song.id ? 'Added!' : buttonLabel}
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

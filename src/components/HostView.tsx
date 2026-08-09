import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useRealtimeRoom } from '../hooks/useRealtimeRoom';
import { searchKaraokeTracks, type SongSearchResult } from '../services/youtube';
import type { Song, QueueItem } from '../types';

// The YouTube IFrame Player API attaches itself to window at runtime.
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

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
  const [showQrModal, setShowQrModal] = useState(false);

  // playerContainerRef is kept for direct/imperative access (e.g. inside
  // event handlers where we don't want a re-render). containerNode is the
  // React-state twin of it, updated via a callback ref, so effects can
  // depend on "the container actually exists in the DOM" as real state
  // instead of silently missing it.
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const setPlayerContainerNode = useCallback((node: HTMLDivElement | null) => {
    playerContainerRef.current = node;
    setContainerNode(node);
  }, []);

  const playerRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  // Whether the player is still muted (autoplay requires muted start; the
  // user must tap once to unmute, which counts as the user gesture browsers
  // require before allowing audio).
  const [needsUnmute, setNeedsUnmute] = useState(true);
  // Always-current ref to room so timer callbacks don't capture stale state
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; }, [room]);

  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // Load the YouTube IFrame Player API once. We rely on its real onStateChange
  // (ENDED) event to know when a song actually finishes, instead of guessing
  // from a duration timer.
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      console.log('[YT API] Already loaded');
      setApiReady(true);
      return;
    }
    console.log('[YT API] Loading script...');
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => console.error('[YT API] Script failed to load!');
      document.body.appendChild(tag);
    } else {
      console.log('[YT API] Script tag already present');
    }
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      console.log('[YT API] onYouTubeIframeAPIReady fired');
      if (typeof previousCallback === 'function') previousCallback();
      setApiReady(true);
    };
  }, []);

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
    if (playerRef.current) {
      if (currentlyPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
    updatePlayback({
      status: currentlyPlaying ? 'paused' : 'playing',
    });
  };

  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextUpInfo, setNextUpInfo] = useState<{ title: string; addedBy: string } | null>(null);
  const [videoBlocked, setVideoBlocked] = useState(false);
  const [songEnded, setSongEnded] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);

  const handleSkipNext = useCallback(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    // Stop audio immediately — otherwise the finished/skipped song can keep
    // playing underneath the "Up Next" countdown overlay for a moment.
    playerRef.current?.pauseVideo();
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

  // Auto-play next song whenever currentQueueId becomes null or invalid but queue is not empty.
  // Bails out while a countdown is in progress (countdown !== null) — otherwise this effect
  // and handleSkipNext's countdown race each other: removing the finished song from the queue
  // makes currentQueueId "invalid", which used to make this effect jump straight to playing
  // the next song while the "Up Next" countdown was still visibly counting down on screen.
  useEffect(() => {
    if (!room || countdown !== null) return;
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
  }, [room?.queue, room?.playback.currentQueueId, countdown]);

  // Always-current ref to currentSong so the player's event handlers (set up
  // once) never see stale data.
  const currentSongRef = useRef<QueueItem | null>(null);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

  // Guards against double-firing the skip when both ENDED and a lingering
  // error event could otherwise trigger it twice for the same song.
  const skipFiredRef = useRef(false);

  // ── Create the YouTube player ONCE and reuse it for every song ──
  useEffect(() => {
    console.log('[YT Player Effect] apiReady:', apiReady, 'containerNode:', !!containerNode, 'playerAlreadyExists:', !!playerRef.current);
    if (!apiReady || !containerNode || playerRef.current) return;

    console.log('[YT Player Effect] Creating new YT.Player...');
    playerRef.current = new window.YT.Player(containerNode, {
      // youtube-nocookie.com doesn't carry a signed-in viewer's YouTube
      // session/preferences into the embed — this stops the player from
      // inheriting an account-level "always show captions" setting that
      // would otherwise override cc_load_policy below. It does NOT override
      // captions the video's uploader has forced on for everyone.
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1,
        mute: 1,           // required: browsers block unmuted autoplay that
                            // isn't triggered by a direct user gesture, and
                            // this player is started from a Firebase-driven
                            // effect, not a click. Starting muted lets
                            // playback actually begin; see the "Tap to
                            // unmute" overlay below for restoring sound.
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        cc_load_policy: 0, // default captions off (viewer/uploader forcing can still override)
        fs: 0,              // hide fullscreen button
        disablekb: 1,        // disable keyboard shortcuts from hijacking the page
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          console.log('[YT Player] onReady fired');
          setPlayerReady(true);
          if (currentSongRef.current) {
            console.log('[YT Player] Loading initial song:', currentSongRef.current.id);
            playerRef.current.loadVideoById(currentSongRef.current.id);
          }
        },
        onStateChange: (event: any) => {
          // 0 = YT.PlayerState.ENDED
          if (event.data === 0 && !skipFiredRef.current) {
            // Cover the player immediately — YouTube shows its own light-colored
            // "related videos" end screen for a moment before we switch songs,
            // and that's what was showing as a blank/white flash.
            setSongEnded(true);
            skipFiredRef.current = true;
            console.log('[AutoNext] Video actually ended → handleSkipNext');
            handleSkipNext();
          }
        },
        onError: (event: any) => {
          // 100 = video removed/not found, 101/150 = embedding disabled by owner
          if ([100, 101, 150].includes(event.data)) {
            console.warn('[YouTube] Playback error', event.data, '— auto-skipping in 3s');
            setVideoBlocked(true);
            setTimeout(() => {
              if (!skipFiredRef.current) {
                skipFiredRef.current = true;
                handleSkipNext();
              }
            }, 3000);
          }
        },
      },
    });
    console.log('[YT Player Effect] YT.Player constructor returned:', playerRef.current);

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiReady, containerNode]);

  // ── Load a new video into the existing player whenever the current song changes ──
  useEffect(() => {
    if (!playerReady || !playerRef.current) {
      console.log('[YT Load Effect] Skipping — playerReady:', playerReady, 'playerRef:', !!playerRef.current);
      return;
    }
    console.log('[YT Load Effect] Loading video for currentSong:', currentSong?.id);
    skipFiredRef.current = false;
    setVideoBlocked(false);
    setSongEnded(false);
    setLocalCurrentTime(0);

    if (currentSong) {
      playerRef.current.loadVideoById(currentSong.id);
    } else if (typeof playerRef.current.stopVideo === 'function') {
      playerRef.current.stopVideo();
    }
  }, [currentSong?.queueId, playerReady]);

  // ── Poll the real player for its current playback position ──
  useEffect(() => {
    if (room?.playback.status !== 'playing' || !currentSong) return;
    let tick = 0;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;
      const t = player.getCurrentTime();
      setLocalCurrentTime(t);
      tick += 1;
      if (tick % 5 === 0) {
        updatePlayback({ currentTime: Math.floor(t) });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.playback.status, currentSong?.queueId, updatePlayback]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.1rem', background: 'var(--bg-main)' }}>
      <div className="simple-spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, fontWeight: 600, letterSpacing: '0.01em' }}>Setting up your stage…</p>
    </div>
  );
  if (error) return (
    <div className="modern-card" style={{ maxWidth: '440px', margin: '4rem auto', textAlign: 'center', padding: '2.75rem 2.25rem' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>⚠️</div>
      <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', color: '#0f172a' }}>Something went wrong</h2>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
    </div>
  );
  if (!room) return (
    <div className="modern-card" style={{ maxWidth: '440px', margin: '4rem auto', textAlign: 'center', padding: '2.75rem 2.25rem' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>🔍</div>
      <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', color: '#0f172a' }}>Room missing or expired</h2>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Head back and start a new stage room.</p>
    </div>
  );

  const isPlaying = room.playback.status === 'playing';
  const duration = currentSong?.duration || 240;
  const progressPct = currentSong ? Math.min(100, (localCurrentTime / duration) * 100) : 0;
  const onlineCount = Object.keys(room.participants).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-main)',
      fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        @keyframes hostFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .host-list-item { animation: hostFadeIn 0.25s ease-out; }
        .host-list-item:hover .host-add-btn { transform: scale(1.04); }
        .host-tab-btn:focus-visible, .host-icon-btn:focus-visible, .host-add-btn:focus-visible { outline: 2px solid var(--primary-light); outline-offset: 2px; }
      `}</style>

      {/* ── Top Bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.8rem 1.5rem',
        background: 'var(--bg-main)',
        boxShadow: '0 4px 16px rgba(194, 216, 216, 0.6)',
        borderBottom: 'var(--border-card)',
        flexShrink: 0,
        zIndex: 10,
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <span className="brand-logo" style={{ fontSize: '1.35rem', flexShrink: 0 }}>
            <span style={{ color: 'var(--primary)' }}>Karaoke</span>Go
          </span>
          <div style={{ width: '1px', height: '22px', background: '#c2d8d8', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
            <span className="modern-badge modern-badge-indigo" style={{ fontSize: '0.7rem' }}>HOST</span>
            <span style={{
              fontWeight: 900,
              fontSize: '1.05rem',
              letterSpacing: '3px',
              color: 'var(--primary-dark)',
              background: 'var(--bg-main)',
              boxShadow: 'var(--shadow-inset)',
              padding: '0.25rem 0.7rem',
              borderRadius: '8px',
            }}>
              {roomCode}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            fontWeight: 700,
            padding: '0.3rem 0.7rem',
            borderRadius: '9999px',
            background: 'var(--bg-main)',
            boxShadow: 'var(--shadow-inset)',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: onlineCount > 0 ? '#10b981' : '#94a3b8', display: 'inline-block' }} />
            {onlineCount} online
          </span>
          <button
            onClick={() => setShowQrModal(true)}
            className="button-primary host-icon-btn"
            style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM21 14v3M14 21h3M18 18h3v3h-3z" />
            </svg>
            QR Code
          </button>
          {onLeave && (
            <button
              onClick={onLeave}
              className="button-secondary host-icon-btn"
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem' }}
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
            <div
              ref={setPlayerContainerNode}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />

            {currentSong && needsUnmute && countdown === null && (
              <button
                onClick={() => {
                  playerRef.current?.unMute();
                  playerRef.current?.setVolume(100);
                  setNeedsUnmute(false);
                }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 15,
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>🔊</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Tap to unmute</span>
              </button>
            )}

            {countdown !== null && nextUpInfo && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
                zIndex: 20,
                animation: 'hostFadeIn 0.3s ease-out',
                padding: '2rem',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  marginBottom: '1.1rem',
                }}>
                  Up Next
                </div>
                <div style={{
                  fontSize: '2.3rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  marginBottom: '0.75rem',
                  maxWidth: '80%',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}>
                  {nextUpInfo.title}
                </div>
                <div style={{
                  fontSize: '1.05rem',
                  color: '#94a3b8',
                  marginBottom: '2.25rem',
                }}>
                  Requested by <strong style={{ color: '#38bdf8', fontWeight: 700 }}>{nextUpInfo.addedBy}</strong>
                </div>
                <div style={{
                  width: '86px',
                  height: '86px',
                  borderRadius: '50%',
                  border: '3px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.75rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  boxShadow: '0 0 36px rgba(56, 189, 248, 0.45)',
                  background: 'rgba(56, 189, 248, 0.1)',
                }}>
                  {countdown}
                </div>
              </div>
            )}

            {currentSong && songEnded && !videoBlocked && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0f172a',
              }}>
                <div className="simple-spinner" />
              </div>
            )}

            {currentSong && videoBlocked && (
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

            {!currentSong && countdown === null && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)',
                animation: 'hostFadeIn 0.3s ease-out',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(124, 58, 237, 0.12)', marginBottom: '1.25rem',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <h2 style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '1.7rem', letterSpacing: '-0.02em' }}>
                  Stage is Empty
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '0.5rem' }}>
                  Search and add karaoke songs from the sidebar!
                </p>
              </div>
            )}
          </div>


        </div>

        {/* ════════════ SIDEBAR ════════════ */}
        <div style={{
          width: '350px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-main)',
          borderLeft: 'var(--border-card)',
          overflow: 'hidden',
          gap: '0',
        }}>

          {/* ── 1. QUEUE Panel ── */}
          <div style={{
            margin: '0.9rem 0.9rem 0 0.9rem',
            background: 'var(--bg-main)',
            boxShadow: 'var(--shadow-raised-sm)',
            border: 'var(--border-card)',
            borderRadius: '16px',
            flexShrink: 0,
            maxHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '0.65rem 0.9rem 0.4rem 0.9rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--primary-dark)', borderBottom: '1px solid rgba(194,216,216,0.4)', flexShrink: 0 }}>
              Queue ({sortedQueue.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.7rem' }}>
              {sortedQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.25rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>📭</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Queue is empty</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {sortedQueue.map((item, index) => {
                    const isCurrent = room.playback.currentQueueId === item.queueId;
                    return (
                      <div
                        key={item.queueId}
                        className="host-list-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.6rem',
                          background: 'var(--bg-main)',
                          boxShadow: isCurrent ? 'var(--shadow-inset)' : 'var(--shadow-raised-sm)',
                          borderRadius: '11px',
                          border: isCurrent ? '2px solid var(--primary-light)' : 'var(--border-card)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                          <span style={{
                            width: '20px', height: '20px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.72rem', flexShrink: 0,
                            color: isCurrent ? '#ffffff' : 'var(--text-muted)',
                            background: isCurrent ? 'var(--primary-gradient)' : 'transparent',
                          }}>
                            {isCurrent ? '►' : index + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              {item.addedBy}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromQueue(item.queueId)}
                          className="button-secondary"
                          style={{ padding: '0.22rem 0.55rem', fontSize: '0.68rem', borderRadius: '8px', flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. SEARCH Panel ── */}
          <div style={{
            margin: '0.65rem 0.9rem 0 0.9rem',
            background: 'var(--bg-main)',
            boxShadow: 'var(--shadow-raised-sm)',
            border: 'var(--border-card)',
            borderRadius: '16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '0.65rem 0.9rem 0.4rem 0.9rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--primary-dark)', borderBottom: '1px solid rgba(194,216,216,0.4)', flexShrink: 0 }}>
              Search
            </div>
            <div style={{ padding: '0.6rem 0.7rem 0.4rem 0.7rem', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search song title or artist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modern-input"
                  style={{ paddingLeft: '2.2rem', fontSize: '0.88rem' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.7rem 0.7rem 0.7rem' }}>
              {isSearching && (
                <p style={{ color: 'var(--primary-dark)', fontSize: '0.83rem', fontWeight: 600, textAlign: 'center', margin: '0.6rem 0' }}>
                  Searching YouTube…
                </p>
              )}
              {!isSearching && !searchQuery && (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Start typing to find a song</div>
                </div>
              )}
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', textAlign: 'center', padding: '1rem 0' }}>
                  No results for "{searchQuery}".
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {searchResults.map(song => (
                  <div
                    key={song.id}
                    className="host-list-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.6rem',
                      background: 'var(--bg-main)',
                      boxShadow: 'var(--shadow-raised-sm)',
                      borderRadius: '11px',
                      border: 'var(--border-card)',
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      style={{ width: '46px', height: '34px', objectFit: 'cover', borderRadius: '7px', marginRight: '0.55rem', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, marginRight: '0.45rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        {song.artist}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSong(song)}
                      className="button-primary host-add-btn"
                      style={{ padding: '0.28rem 0.65rem', fontSize: '0.73rem', borderRadius: '8px', flexShrink: 0, transition: 'transform 0.15s ease' }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. PLAYBACK CONTROLS Panel ── */}
          <div style={{
            margin: '0.65rem 0.9rem 0.9rem 0.9rem',
            background: 'var(--bg-main)',
            boxShadow: 'var(--shadow-raised-sm)',
            border: 'var(--border-card)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            flexShrink: 0,
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--primary-dark)', marginBottom: '0.65rem' }}>
              Playback
            </div>
            <div style={{ height: '3px', width: '100%', background: 'rgba(194,216,216,0.5)', borderRadius: '9999px', marginBottom: '0.7rem' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--primary-gradient)',
                borderRadius: '9999px',
                transition: 'width 1s linear',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={handlePlayPause}
                className="button-primary host-icon-btn"
                style={{ flex: 1, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
                disabled={!currentSong}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={handleSkipNext}
                className="button-secondary host-icon-btn"
                style={{ flex: 1, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
                disabled={!currentSong}
              >
                ⏭ Skip
              </button>
              <span
                className={isPlaying ? 'modern-badge modern-badge-emerald' : 'modern-badge modern-badge-indigo'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
              >
                {isPlaying && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'livePulse 1.4s ease-in-out infinite' }} />
                )}
                {isPlaying ? 'LIVE' : room.playback.status === 'paused' ? 'PAUSED' : 'IDLE'}
              </span>
            </div>
            {currentSong && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(localCurrentTime)} / {formatTime(duration)}</span>
                <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>added by {currentSong.addedBy}</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(236, 248, 248, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'hostFadeIn 0.2s ease-out',
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="modern-card"
            style={{ maxWidth: '360px', width: '100%', textAlign: 'center', padding: '2.25rem 2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Join Stage Room
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500, margin: '0.3rem 0 0 0' }}>
              Scan with your phone camera to join as a participant.
            </p>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '20px', display: 'inline-block', margin: '1.4rem 0 1.1rem 0', boxShadow: 'var(--shadow-raised-sm)' }}>
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--primary-dark)', marginBottom: '0.4rem' }}>
              {roomCode}
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', wordBreak: 'break-all', fontWeight: 500, margin: 0 }}>
              {joinUrl}
            </p>
            <button onClick={() => setShowQrModal(false)} className="button-primary" style={{ width: '100%', marginTop: '1.4rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
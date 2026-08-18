import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import { type SongSearchResult, filterEmbeddableSongs } from '../../services/youtube';
import type { Song, QueueItem } from '../../types';
import { SearchModal } from '../modals/SearchModal';
import { Wave } from '../ui/wave';
import { ThemeToggle } from '../ThemeToggle';

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

const HOST_SUGGESTED_SONGS: SongSearchResult[] = [
  { id: 'tYPAxX8fdzQ', title: 'Two Less Lonely People', artist: 'Air Supply', thumbnail: 'https://i.ytimg.com/vi/tYPAxX8fdzQ/hqdefault.jpg', duration: 0, isKaraoke: true },
  { id: 'aopznAD6m9w', title: 'My Love', artist: 'Westlife', thumbnail: 'https://i.ytimg.com/vi/aopznAD6m9w/hqdefault.jpg', duration: 0, isKaraoke: true },
  { id: 'h0oahkr7dBk', title: 'As Long As You Love Me', artist: 'Backstreet Boys', thumbnail: 'https://i.ytimg.com/vi/h0oahkr7dBk/hqdefault.jpg', duration: 0, isKaraoke: true },
  { id: 'VQJKXVy67K0', title: "Don't Forget To Remember", artist: 'Bee Gees', thumbnail: 'https://i.ytimg.com/vi/VQJKXVy67K0/hqdefault.jpg', duration: 0, isKaraoke: true },
];

export const HostView: React.FC<HostViewProps> = ({ roomCode, userId, userName, onLeave }) => {
  const { room, loading, error, endRoom, addToQueue, removeFromQueue, updatePlayback } = useRealtimeRoom(roomCode, userId);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [hostAddedSongId, setHostAddedSongId] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [suggestedSongs, setSuggestedSongs] = useState<SongSearchResult[]>(HOST_SUGGESTED_SONGS);

  useEffect(() => {
    let cancelled = false;
    filterEmbeddableSongs(HOST_SUGGESTED_SONGS, HOST_SUGGESTED_SONGS.length).then((ok) => {
      if (!cancelled && ok.length > 0) setSuggestedSongs(ok);
    });
    return () => { cancelled = true; };
  }, []);

  const handleExitStage = useCallback(async () => {
    if (!onLeave || isExiting) return;
    setIsExiting(true);
    setExitError(null);
    try {
      // Wait until Firebase confirms the room ended — only then go home,
      // so the session never stays "active" after the host leaves.
      await endRoom();
      onLeave();
    } catch (err) {
      console.error('[Host] Failed to end room:', err);
      setExitError('Could not end the room. Check your connection and try again.');
      setIsExiting(false);
    }
  }, [onLeave, isExiting, endRoom]);

  // playerContainerRef is kept for direct/imperative access (e.g. inside
  // event handlers where we don't want a re-render). containerNode is the
  // React-state twin of it, updated via a callback ref, so effects can
  // depend on "the container actually exists in the DOM" as real state
  // instead of silently missing it.
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const setPlayerContainerNode = useCallback((node: HTMLDivElement | null) => {
    playerContainerRef.current = node;
    setContainerNode(node);
  }, []);

  const playerRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  // Whether the player is still waiting for the host's first interaction.
  // Browsers only allow unmuted playback to start from a real user gesture,
  // so until this is cleared we deliberately keep the player PAUSED (via
  // cueVideoById instead of loadVideoById — see the player-creation and
  // load-video effects below) rather than silently autoplaying muted.
  // It's real state (not just a ref) because a small play icon is rendered
  // based on it — see the "Click-to-start" overlay in the JSX.
  const [needsUnmute, setNeedsUnmute] = useState(true);
  const needsUnmuteRef = useRef(true);
  useEffect(() => { needsUnmuteRef.current = needsUnmute; }, [needsUnmute]);
  // Always-current ref to room so timer callbacks don't capture stale state
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; }, [room]);

  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // Fires on the host's first click of the play icon: unmutes, starts
  // actual playback (the player was only cued/paused until now), and marks
  // playback as 'playing' in the room so every other client stays in sync.
  const handleStartPlayback = useCallback(() => {
    if (playerRef.current?.unMute) {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      playerRef.current.playVideo();
    }
    setNeedsUnmute(false);
    needsUnmuteRef.current = false;
    if (roomRef.current && roomRef.current.playback.status !== 'playing') {
      updatePlayback({ status: 'playing' });
    }
  }, [updatePlayback]);

  const getFullscreenElement = () =>
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ??
    null;

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (getFullscreenElement()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
          await doc.webkitExitFullscreen?.();
        }
      } else if (stage.requestFullscreen) {
        await stage.requestFullscreen();
      } else {
        const el = stage as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };
        await el.webkitRequestFullscreen?.();
      }
    } catch (err) {
      console.warn('[Fullscreen] Toggle failed', err);
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(getFullscreenElement() === stageRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

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

  // Opening search pauses the current song so audio doesn't keep playing
  // under the modal while the host browses the library. We trust the YouTube
  // player state (not only room.playback.status) because after pause→play
  // cycles those can briefly desync and skip the pause entirely.
  const handleOpenSearch = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsSearchModalOpen(true);

    const player = playerRef.current;
    // YT.PlayerState: PLAYING = 1, BUFFERING = 3
    const ytState = typeof player?.getPlayerState === 'function' ? player.getPlayerState() : null;
    const isYtActive = ytState === 1 || ytState === 3;
    const roomStatus = roomRef.current?.playback.status;
    const roomPlaying = roomStatus === 'playing';

    if (!isYtActive && !roomPlaying) return;

    player?.pauseVideo();
    if (roomRef.current) {
      roomRef.current = {
        ...roomRef.current,
        playback: { ...roomRef.current.playback, status: 'paused' },
      };
    }
    if (roomStatus !== 'paused') {
      updatePlayback({ status: 'paused' });
    }
  }, [updatePlayback]);

  const handlePlayPause = () => {
    if (!room) return;

    // If we haven't had the first user gesture yet, delegate to handleStartPlayback
    // so the player is unmuted before playback begins.
    if (needsUnmuteRef.current) {
      handleStartPlayback();
      return;
    }

    const currentlyPlaying = roomRef.current?.playback.status === 'playing'
      || room.playback.status === 'playing';
    const nextStatus = currentlyPlaying ? 'paused' : 'playing';
    if (playerRef.current) {
      if (currentlyPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
    if (roomRef.current) {
      roomRef.current = {
        ...roomRef.current,
        playback: { ...roomRef.current.playback, status: nextStatus },
      };
    }
    updatePlayback({ status: nextStatus });
  };

  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextUpInfo, setNextUpInfo] = useState<{ title: string; addedBy: string } | null>(null);
  const [videoBlocked, setVideoBlocked] = useState(false);
  const [songEnded, setSongEnded] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);

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
  const nextToPlaySong = sortedQueue.find(item => item.queueId !== room?.playback.currentQueueId) ?? null;

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
        autoplay: 0,        // don't auto-start — see cueVideoById below.
                            // Playback only begins once the host clicks the
                            // play icon (handleStartPlayback), which is also
                            // the user gesture browsers require before audio
                            // is allowed to start unmuted.
        mute: 1,            // stays muted until handleStartPlayback runs;
                            // harmless once unMute() is called from a real click.
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
            if (needsUnmuteRef.current) {
              // cueVideoById loads the video WITHOUT playing it — the video
              // stays visibly paused/stopped until the host clicks the play
              // icon, instead of silently autoplaying muted.
              console.log('[YT Player] Cueing initial song (waiting for host click):', currentSongRef.current.id);
              playerRef.current.cueVideoById(currentSongRef.current.id);
            } else {
              console.log('[YT Player] Loading initial song:', currentSongRef.current.id);
              playerRef.current.loadVideoById(currentSongRef.current.id);
            }
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
    setPlayerDuration(0);

    if (currentSong) {
      if (needsUnmuteRef.current) {
        // Still waiting on the host's first click — cue only, don't play.
        playerRef.current.cueVideoById(currentSong.id);
      } else {
        playerRef.current.loadVideoById(currentSong.id);
      }
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
      const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
      if (d > 0) setPlayerDuration(d);
      tick += 1;
      if (tick % 5 === 0) {
        updatePlayback({ currentTime: Math.floor(t) });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.playback.status, currentSong?.queueId, updatePlayback]);

  if (loading && !isExiting) return (
    <div className="page-loading">
      <Wave className="size-10" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, fontWeight: 600, letterSpacing: '0.01em' }}>Setting up your stage…</p>
    </div>
  );
  if (error && !isExiting) return (
    <div className="modern-card page-state-card">
      <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>⚠️</div>
      <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>Something went wrong</h2>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
    </div>
  );
  if (!room && !isExiting) return (
    <div className="modern-card page-state-card">
      <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>🔍</div>
      <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>Room missing or expired</h2>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Head back and start a new stage room.</p>
    </div>
  );
  if (!room) {
    return <div className="host-page is-exiting" aria-hidden="true" />;
  }

  const isPlaying = room.playback.status === 'playing';
  const duration = playerDuration || currentSong?.duration || 0;
  const progressPct = currentSong ? Math.min(100, (localCurrentTime / duration) * 100) : 0;
  const onlineCount = Object.values(room.participants).filter((p) => p.online !== false).length;

  return (
    <div className={`host-page${isExiting ? ' is-exiting' : ''}`}>
      {/* ── Main Body: Video (left) + Sidebar (right) ── */}
      <div className="host-layout">

        {/* ════════════ ROUNDED VIDEO STAGE ════════════ */}
        <div className="host-stage" ref={stageRef}>
          <div className="host-stage-inner">
            <div
              ref={setPlayerContainerNode}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
            {/* Blocks YouTube iframe clicks and toggles play/pause instead,
                both in normal view and fullscreen. */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2,
                cursor: currentSong ? 'pointer' : 'default',
              }}
              onClick={currentSong ? handlePlayPause : undefined}
              aria-hidden="true"
            />

            {currentSong && countdown === null && !videoBlocked && (
              <button
                type="button"
                className="host-fullscreen-btn"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 size={18} strokeWidth={2.2} />
                ) : (
                  <Maximize2 size={18} strokeWidth={2.2} />
                )}
              </button>
            )}

            {/* Click-to-start icon — only for the host's first unmute gesture.
                After that, playback is controlled from the sidebar (or by
                clicking the player itself when fullscreen). */}
            {currentSong && needsUnmute && countdown === null && (
              <button
                onClick={handleStartPlayback}
                aria-label="Start playback"
                className="host-start-btn"
                style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  zIndex: 12,
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(122, 46, 58, 0.85)',
                  border: '1px solid rgba(176, 141, 87, 0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#f8f4ef" style={{ marginLeft: '3px' }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}

            {countdown !== null && nextUpInfo && (
              <div className="host-countdown-overlay">
                <p className="host-countdown-kicker">Up Next</p>
                <h3 className="host-countdown-title">{nextUpInfo.title}</h3>
                <p className="host-countdown-requester">
                  Requested by <strong>{nextUpInfo.addedBy}</strong>
                </p>
                <div className="host-countdown-ring" aria-live="polite" aria-atomic="true">
                  <span key={countdown} className="host-countdown-number">
                    {countdown}
                  </span>
                </div>
              </div>
            )}

            {currentSong && songEnded && !videoBlocked && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-stage)',
              }}>
                <Wave className="size-10" />
              </div>
            )}

            {currentSong && videoBlocked && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-stage)',
                textAlign: 'center', padding: '2rem',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Video Unavailable
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '380px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>"{currentSong.title}"</strong> cannot be played on external sites — the owner disabled embedding.
                </div>
                <div style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem' }}>
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
                background: 'radial-gradient(ellipse at center, var(--bg-card) 0%, var(--bg-stage) 100%)',
                animation: 'hostFadeIn 0.3s ease-out',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(176, 141, 87, 0.12)',
                  border: '1px solid rgba(176, 141, 87, 0.3)',
                  marginBottom: '1.25rem',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B08D57" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <h2 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.7rem', letterSpacing: '-0.02em' }}>
                  Stage is Empty
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.5rem' }}>
                  Search and add karaoke songs from the sidebar!
                </p>
              </div>
            )}
          </div>


        </div>

        {/* ════════════ SIDEBAR ════════════ */}
        <div className="host-sidebar">

          {/* ── 0. NEXT TO PLAY Panel ── */}
          <div className="host-panel">
            <div className="host-panel-title">
              Next to Play
            </div>
            <div style={{ padding: '0.6rem 0.8rem' }}>
              {nextToPlaySong ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <img
                    src={nextToPlaySong.thumbnail}
                    alt={nextToPlaySong.title}
                    style={{ width: '48px', height: '34px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid rgba(176,141,87,0.3)' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nextToPlaySong.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {nextToPlaySong.addedBy}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.6rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                  No upcoming song
                </div>
              )}
            </div>
          </div>

          {/* ── 1. QUEUE Panel ── */}
          <div className="host-panel host-panel--queue">
            <div className="host-panel-title">
              Queue ({sortedQueue.length})
            </div>
            <div className="host-queue-scroll">
              {sortedQueue.length === 0 ? (
                <div className="host-queue-empty">
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Queue is empty</div>
                </div>
              ) : (
                <div className="host-queue-list">
                  {sortedQueue.map((item, index) => {
                    const isCurrent = room.playback.currentQueueId === item.queueId;
                    return (
                      <div
                        key={item.queueId}
                        className={`host-list-item host-queue-item${isCurrent ? ' is-current' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
                          <span style={{
                            width: '20px', height: '20px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.72rem', flexShrink: 0,
                            color: isCurrent ? '#f8f4ef' : 'var(--text-muted)',
                            background: isCurrent ? 'var(--action)' : 'transparent',
                          }}>
                            {isCurrent ? '►' : index + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            {isCurrent ? (
                              <div className="host-queue-now">
                                <span className="host-queue-eq" aria-hidden="true">
                                  <span /><span /><span />
                                </span>
                                Now Playing
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                {item.addedBy}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="host-queue-remove"
                          aria-label={`Remove ${item.title} from queue`}
                          title="Remove from queue"
                          onClick={() => removeFromQueue(item.queueId)}
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. SEARCH Panel ── */}
          <div className="host-panel">
            <div className="host-panel-title">
              Search
            </div>
            <div style={{ padding: '0.6rem 0.7rem 0.4rem 0.7rem', flexShrink: 0 }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleOpenSearch}>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  readOnly
                  placeholder="Search song title or artist..."
                  className="modern-input"
                  style={{ paddingLeft: '2.2rem', paddingRight: '0.85rem', fontSize: '0.88rem', cursor: 'pointer', pointerEvents: 'none' }}
                />
              </div>
            </div>
            {/* Suggested Songs 2×2 grid */}
            <div style={{ padding: '0.5rem 0.7rem 0.7rem 0.7rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.55px', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                Suggest Song
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem',
              }}>
                {suggestedSongs.map((song) => {
                  const isAdded = hostAddedSongId === song.id;
                  return (
                    <div
                      key={song.id}
                      className="host-suggest-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                    >
                      {/* 16:9 Thumbnail */}
                      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: 'var(--bg-inset)', overflow: 'hidden', flexShrink: 0 }}>
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      {/* Card Body */}
                      <div style={{ padding: '0.4rem 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minHeight: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.76rem', color: 'var(--text-primary)', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '1.9em' }}>
                          {song.title}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {song.artist}
                        </div>
                        <button
                          onClick={() => {
                            if (isAdded) return;
                            handleAddSong(song as any);
                            setHostAddedSongId(song.id);
                            setTimeout(() => setHostAddedSongId(null), 2000);
                          }}
                          className="button-primary"
                          style={{
                            marginTop: 'auto',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.7rem',
                            borderRadius: '8px',
                            width: '100%',
                            justifyContent: 'center',
                            opacity: isAdded ? 0.7 : 1,
                            background: isAdded ? 'rgba(176, 141, 87, 0.35)' : undefined,
                          }}
                        >
                          {isAdded ? '✓ Added!' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 3. PLAYBACK CONTROLS Panel + INLINE VISIBLE QR CODE & EXIT ── */}
          <div className="host-panel host-panel--controls">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--accent)' }}>
                Playback & Controls
              </div>
              <ThemeToggle />
            </div>

            {/* Progress bar */}
            <div className="host-progress-track">
              <div className="host-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            {/* Play/Pause & Skip Controls */}
            <div className="host-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={handlePlayPause}
                className={`host-icon-btn host-play-btn ${isPlaying ? 'is-playing' : 'is-paused'}`}
                style={{ flex: 1, padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}
                disabled={!currentSong}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={handleSkipNext}
                className="button-secondary host-icon-btn"
                style={{ flex: 1, padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}
                disabled={!currentSong}
              >
                Skip
              </button>
              <span className="host-online-pill">
                <span className={`host-online-dot${onlineCount > 0 ? ' is-online' : ''}`} />
                {onlineCount} online
              </span>
            </div>

            {currentSong && (
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(localCurrentTime)} / {formatTime(duration)}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>added by {currentSong.addedBy}</span>
              </div>
            )}

            {/* Inline Visible QR Code + Room Info + Exit Button */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              paddingTop: '0.65rem',
              borderTop: '1px solid rgba(176, 141, 87, 0.22)',
              marginTop: '0.1rem',
            }}>
              <div className="host-qr-wrap">
                <QRCodeSVG value={joinUrl} size={76} />
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Scan to Join Stage
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', color: 'var(--accent)', margin: '-2px 0' }}>
                  {roomCode}
                </div>
                {onLeave && (
                  <>
                    <button
                      onClick={handleExitStage}
                      disabled={isExiting}
                      className="button-secondary host-icon-btn"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', width: '100%', marginTop: '0.15rem' }}
                    >
                      {isExiting ? 'Ending…' : 'Exit Stage'}
                    </button>
                    {exitError && (
                      <div style={{ fontSize: '0.7rem', color: '#e07070', fontWeight: 600, marginTop: '0.2rem', lineHeight: 1.3 }}>
                        {exitError}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          className="host-modal-backdrop"
          style={{ animation: 'hostFadeIn 0.2s ease-out' }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="modern-card host-qr-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Join Stage Room
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500, margin: '0.3rem 0 0 0' }}>
              Scan with your phone camera to join as a participant.
            </p>
            <div className="host-qr-wrap" style={{ display: 'inline-flex', margin: '1.4rem 0 1.1rem 0', padding: '1.25rem' }}>
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--accent)', marginBottom: '0.4rem' }}>
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

      {/* Large 90vw x 85vh Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddSong={handleAddSong}
      />
    </div>
  );
};
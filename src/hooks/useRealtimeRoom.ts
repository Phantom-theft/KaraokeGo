import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { RoomState, Song, QueueItem, Participant } from '../types';
import { LIMITS } from '../lib/limits';
import { enforceCooldown, enforceRateLimit } from '../lib/rateLimit';



function readLocalRoom(code: string): RoomState | null {
  try {
    const raw = localStorage.getItem('karaoke_room_' + code);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useRealtimeRoom(roomCode: string | null, userId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomEnded, setRoomEnded] = useState(false);
  const roomIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(userId);
  const roomCodeRef = useRef<string | null>(roomCode);
  const queueMapRef = useRef<Record<string, QueueItem>>({});
  const pendingAddsRef = useRef(0);
  const pendingVideoIdsRef = useRef<Set<string>>(new Set());
  userIdRef.current = userId;
  roomCodeRef.current = roomCode;

  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      setLoading(false);
      setRoomEnded(false);
      return;
    }

    setLoading(true);
    setRoomEnded(false);
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('karaoke_bc_' + roomCode);
      bc.onmessage = (e) => {
        if (e.data?.type === 'ROOM_UPDATE' && e.data?.room) setRoom(e.data.room);
      };
    }

    const unsubs: (() => void)[] = [];

    try {
      const roomQuery = query(
        collection(db, 'rooms'),
        where('roomCode', '==', roomCode.toUpperCase()),
        limit(1)
      );

      const unsubRoom = onSnapshot(roomQuery,
        (roomSnap) => {
          if (roomSnap.empty) {
            const local = readLocalRoom(roomCode);
            if (local) {
              setRoom(local);
              setError(null);
              setRoomEnded(false);
            } else {
              setRoom(null);
              setError('Room not found');
              setRoomEnded(false);
            }
            setLoading(false);
            return;
          }

          const roomDoc = roomSnap.docs[0];
          const roomData = roomDoc.data();

          if (roomData.status === 'ended') {
            setRoom(null);
            setRoomEnded(true);
            setError(null);
            setLoading(false);
            return;
          }

          const roomId = roomDoc.id;
          roomIdRef.current = roomId;

          const unsubParticipants = onSnapshot(
            collection(db, 'rooms', roomId, 'participants'),
            (pSnap) => {
              const participantsMap: Record<string, Participant> = {};
              pSnap.docs.forEach((pDoc) => {
                const d = pDoc.data();
                    participantsMap[pDoc.id] = {
                      id: pDoc.id,
                      name: d.username || 'Anonymous',
                      isHost: !!d.isHost,
                      joinedAt: d.joinedAt?.toMillis?.() ?? Date.now(),
                      online: d.online !== false,
                    };
              });

              const unsubQueue = onSnapshot(
                query(collection(db, 'rooms', roomId, 'queue'), orderBy('addedAt', 'asc')),
                (qSnap) => {
                  const queueMap: Record<string, QueueItem> = {};
                  let activeQueueId: string | null = null;

                  qSnap.docs.forEach((qDoc) => {
                    const d = qDoc.data();
                    queueMap[qDoc.id] = {
                      queueId: qDoc.id,
                      id: d.videoId,
                      title: d.title || 'Karaoke Track',
                      artist: d.artist || 'Karaoke',
                      thumbnail: `https://img.youtube.com/vi/${d.videoId}/0.jpg`,
                      duration: d.duration || 240,
                      addedBy: d.requestedBy || 'Guest',
                      timestamp: d.addedAt?.toMillis?.() ?? Date.now(),
                    };
                    if (d.status === 'playing') activeQueueId = qDoc.id;
                  });

                  if (!activeQueueId && roomData.currentSongId && queueMap[roomData.currentSongId]) {
                    activeQueueId = roomData.currentSongId;
                  }

                  queueMapRef.current = queueMap;

                  const newRoom: RoomState = {
                    roomCode: roomData.roomCode,
                    hostId: roomData.hostId,
                    playback: {
                      status: roomData.playbackStatus || (activeQueueId ? 'playing' : 'idle'),
                      currentQueueId: activeQueueId,
                      currentTime: roomData.currentTime || 0,
                      lastUpdated: roomData.lastUpdated?.toMillis?.() ?? Date.now(),
                    },
                    participants: participantsMap,
                    queue: queueMap,
                  };

                  setRoom(newRoom);
                  setLoading(false);
                  setError(null);
                  setRoomEnded(false);
                },
                (err) => {
                  console.error('[Firestore] Queue listener error:', err);
                  setLoading(false);
                }
              );
              unsubs.push(unsubQueue);
            },
            (err) => {
              console.error('[Firestore] Participants listener error:', err);
              setLoading(false);
            }
          );
          unsubs.push(unsubParticipants);
        },
        (err) => {
          console.error('[Firestore] Room listener error:', err);
          const local = readLocalRoom(roomCode);
          if (local) { setRoom(local); setError(null); }
          else setError('Could not connect to Firebase: ' + err.message);
          setLoading(false);
        }
      );
      unsubs.push(unsubRoom);

    } catch (e: any) {
      console.error('[Firestore] Connection error:', e);
      const local = readLocalRoom(roomCode);
      if (local) { setRoom(local); setError(null); }
      setLoading(false);
    }

    return () => {
      unsubs.forEach(u => u());
      bc?.close();
    };
  }, [roomCode]);

  const leaveRoom = useCallback(async (): Promise<void> => {
    const id = userIdRef.current;
    if (!id) return;

    let roomId = roomIdRef.current;
    if (!roomId && roomCodeRef.current) {
      const roomSnap = await getDocs(
        query(
          collection(db, 'rooms'),
          where('roomCode', '==', roomCodeRef.current.toUpperCase()),
          limit(1)
        )
      );
      if (!roomSnap.empty) roomId = roomSnap.docs[0].id;
    }
    if (!roomId) return;

    roomIdRef.current = roomId;
    const participantRef = doc(db, 'rooms', roomId, 'participants', id);

    // Mark offline (works even when Firestore rules block delete)
    await setDoc(participantRef, { online: false }, { merge: true });

    try {
      await deleteDoc(participantRef);
    } catch {
      // Delete may be denied by rules; online: false above is enough for the count
    }
  }, []);

  const createRoom = async (hostName: string, hostId: string): Promise<string> => {
    const name = hostName.trim().slice(0, LIMITS.roomCreate.maxNameLength) || 'Host';
    const safeHostId = hostId.trim().slice(0, 80);
    if (!safeHostId) throw new Error('Could not create a host session. Please try again.');

    enforceCooldown(
      'room-create-cooldown',
      LIMITS.roomCreate.cooldownMs,
      'Please wait a moment before creating another room.',
    );
    enforceRateLimit('room-create', {
      max: LIMITS.roomCreate.maxPerWindow,
      windowMs: LIMITS.roomCreate.windowMs,
      persist: 'local',
      message: 'Too many rooms created from this device.',
    });

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const roomRef = await addDoc(collection(db, 'rooms'), {
      roomCode: code,
      hostId: safeHostId,
      currentSongId: null,
      playbackStatus: 'idle',
      currentTime: 0,
      status: 'active',
      createdAt: serverTimestamp(),
    });

    const roomId = roomRef.id;
    roomIdRef.current = roomId;

    await setDoc(doc(db, 'rooms', roomId, 'participants', safeHostId), {
      username: name,
      isHost: true,
      online: true,
      joinedAt: serverTimestamp(),
    });

    return code;
  };

  const joinRoom = async (code: string, name: string, id: string): Promise<void> => {
    const roomCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(roomCode)) {
      throw new Error('Please enter the 4-character room code.');
    }

    enforceRateLimit('room-join', {
      max: LIMITS.roomJoin.maxPerWindow,
      windowMs: LIMITS.roomJoin.windowMs,
      persist: 'session',
      message: 'Too many join attempts.',
    });

    const roomSnap = await getDocs(
      query(
        collection(db, 'rooms'),
        where('roomCode', '==', roomCode),
        where('status', '==', 'active'),
        limit(1)
      )
    );

    if (roomSnap.empty) {
      throw new Error('Room not found. Please check the room code.');
    }

    const roomId = roomSnap.docs[0].id;
    roomIdRef.current = roomId;

    const username = name.trim().slice(0, LIMITS.roomJoin.maxNameLength) || 'Guest';
    const participantId = id.trim().slice(0, 80);
    if (!participantId) throw new Error('Could not join this room. Please try again.');

    await setDoc(doc(db, 'rooms', roomId, 'participants', participantId), {
      username,
      isHost: false,
      online: true,
      joinedAt: serverTimestamp(),
    }, { merge: true });
  };

  const addToQueue = async (song: Song, addedBy: string): Promise<void> => {
    const roomId = roomIdRef.current;
    if (!roomId) throw new Error('You are not connected to a room yet.');

    const videoId = (song.id || '').trim();
    if (!videoId) throw new Error('That song is missing a video id.');

    const requestedBy = addedBy.trim().slice(0, 80) || 'Guest';
    const queue = Object.values(queueMapRef.current);
    const pendingCount = pendingAddsRef.current;
    if (queue.length + pendingCount >= LIMITS.queue.maxRoomQueue) {
      throw new Error(`The queue is full (${LIMITS.queue.maxRoomQueue} songs). Wait until some songs have played.`);
    }
    if (queue.some((item) => item.id === videoId) || pendingVideoIdsRef.current.has(videoId)) {
      throw new Error('That song is already in the queue.');
    }
    const userCount = queue.filter((item) => item.addedBy === requestedBy).length;
    if (userCount >= LIMITS.queue.maxPerUser) {
      throw new Error(`You already have ${LIMITS.queue.maxPerUser} songs in the queue. Wait for some to play before adding more.`);
    }

    enforceRateLimit('queue-add', {
      max: LIMITS.queue.maxPerWindow,
      windowMs: LIMITS.queue.windowMs,
      persist: 'session',
      message: 'You are adding songs too quickly.',
    });

    const queueColRef = collection(db, 'rooms', roomId, 'queue');
    const position = queue.length + pendingCount + 1;
    const isFirst = queue.length + pendingCount === 0;
    const title = (song.title || '').trim().slice(0, LIMITS.queue.maxTitleLength) || 'Karaoke Track';
    const artist = (song.artist || '').trim().slice(0, LIMITS.queue.maxArtistLength) || 'Unknown';
    const duration = typeof song.duration === 'number' && song.duration > 0 ? song.duration : 240;

    pendingAddsRef.current += 1;
    pendingVideoIdsRef.current.add(videoId);
    try {
      const newQueueDoc = await addDoc(queueColRef, {
        videoId,
        title,
        artist,
        duration,
        requestedBy,
        position,
        status: isFirst ? 'playing' : 'waiting',
        addedAt: serverTimestamp(),
      });

      queueMapRef.current = {
        ...queueMapRef.current,
        [newQueueDoc.id]: {
          queueId: newQueueDoc.id,
          id: videoId,
          title,
          artist,
          thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`,
          duration,
          addedBy: requestedBy,
          timestamp: Date.now(),
        },
      };

      if (isFirst) {
        await updateDoc(doc(db, 'rooms', roomId), {
          currentSongId: newQueueDoc.id,
          playbackStatus: 'playing',
        });
      }
    } finally {
      pendingAddsRef.current = Math.max(0, pendingAddsRef.current - 1);
      pendingVideoIdsRef.current.delete(videoId);
    }
  };

  const removeFromQueue = async (queueId: string): Promise<void> => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await deleteDoc(doc(db, 'rooms', roomId, 'queue', queueId));
  };

  const updatePlayback = async (updates: Partial<RoomState['playback']>): Promise<void> => {
    const roomId = roomIdRef.current;
    if (!roomId) return;

    const payload: Record<string, any> = { lastUpdated: serverTimestamp() };
    if (updates.status !== undefined) payload.playbackStatus = updates.status;
    if (updates.currentQueueId !== undefined) payload.currentSongId = updates.currentQueueId;
    if (updates.currentTime !== undefined) payload.currentTime = updates.currentTime;

    await updateDoc(doc(db, 'rooms', roomId), payload);

    if (updates.currentQueueId) {
      await updateDoc(doc(db, 'rooms', roomId, 'queue', updates.currentQueueId), { status: 'playing' });
    }
  };

  const endRoom = async (): Promise<void> => {
    const roomId = roomIdRef.current;
    if (!roomId) return;

    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'ended',
      endedAt: serverTimestamp(),
      playbackStatus: 'idle',
    });
  };

  return { room, loading, error, roomEnded, createRoom, joinRoom, leaveRoom, addToQueue, removeFromQueue, updatePlayback, endRoom };
}
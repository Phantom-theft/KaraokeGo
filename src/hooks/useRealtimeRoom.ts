import { useState, useEffect, useRef } from 'react';
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
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { RoomState, Song, QueueItem, Participant } from '../types';



function readLocalRoom(code: string): RoomState | null {
  try {
    const raw = localStorage.getItem('karaoke_room_' + code);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useRealtimeRoom(roomCode: string | null, _userId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      setLoading(false);
      return;
    }

    setLoading(true);
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
        where('status', '==', 'active')
      );

      const unsubRoom = onSnapshot(roomQuery,
        (roomSnap) => {
          if (roomSnap.empty) {
            const local = readLocalRoom(roomCode);
            if (local) {
              setRoom(local);
              setError(null);
            } else {
              setError('Room not found or has ended');
            }
            setLoading(false);
            return;
          }

          const roomDoc = roomSnap.docs[0];
          const roomData = roomDoc.data();
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

  const createRoom = async (hostName: string, hostId: string): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const roomRef = await addDoc(collection(db, 'rooms'), {
      roomCode: code,
      hostId: hostId,
      currentSongId: null,
      playbackStatus: 'idle',
      currentTime: 0,
      status: 'active',
      createdAt: serverTimestamp(),
    });

    const roomId = roomRef.id;
    roomIdRef.current = roomId;

    await setDoc(doc(db, 'rooms', roomId, 'participants', hostId), {
      username: hostName,
      isHost: true,
      joinedAt: serverTimestamp(),
    });

    return code;
  };

  const joinRoom = async (code: string, name: string, id: string): Promise<void> => {
    const roomSnap = await getDocs(
      query(collection(db, 'rooms'), where('roomCode', '==', code.toUpperCase()), where('status', '==', 'active'))
    );

    if (roomSnap.empty) {
      throw new Error('Room not found. Please check the room code.');
    }

    const roomId = roomSnap.docs[0].id;
    roomIdRef.current = roomId;

    await setDoc(doc(db, 'rooms', roomId, 'participants', id), {
      username: name,
      isHost: false,
      joinedAt: serverTimestamp(),
    });
  };

  const addToQueue = async (song: Song, addedBy: string): Promise<void> => {
    const roomId = roomIdRef.current;
    if (!roomId) return;

    const queueColRef = collection(db, 'rooms', roomId, 'queue');
    const existingSnap = await getDocs(queueColRef);
    const position = existingSnap.size + 1;
    const isFirst = existingSnap.size === 0;

    const newQueueDoc = await addDoc(queueColRef, {
      videoId: song.id,
      title: song.title,
      artist: song.artist || 'Unknown',
      duration: song.duration || 240,
      requestedBy: addedBy,
      position,
      status: isFirst ? 'playing' : 'waiting',
      addedAt: serverTimestamp(),
    });

    if (isFirst) {
      await updateDoc(doc(db, 'rooms', roomId), {
        currentSongId: newQueueDoc.id,
        playbackStatus: 'playing',
      });
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

  return { room, loading, error, createRoom, joinRoom, addToQueue, removeFromQueue, updatePlayback };
}
export interface Song {
  id: string;        // YouTube Video ID or Custom ID
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;  // in seconds
}

export interface QueueItem extends Song {
  queueId: string;   // Unique push ID in the Firebase queue list
  addedBy: string;   // Participant name
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  online?: boolean;
}

export interface PlaybackState {
  status: 'idle' | 'playing' | 'paused';
  currentQueueId: string | null; // queueId of the song currently playing
  currentTime: number;           // Current playhead in seconds
  lastUpdated: number;           // Epoch millisecond timestamp of last update
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  playback: PlaybackState;
  queue: Record<string, QueueItem>;
  participants: Record<string, Participant>;
}
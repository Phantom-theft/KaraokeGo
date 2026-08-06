import { useState, useEffect } from 'react';
import { LandingView } from './components/LandingView';
import { HostView } from './components/HostView';
import { ParticipantView } from './components/ParticipantView';
import './App.css';

type AppView = 'landing' | 'host' | 'participant';

interface SessionState {
  view: AppView;
  roomCode: string;
  userId: string;
  userName: string;
}

const SESSION_KEY = 'karaokego_session';

function loadSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: SessionState = JSON.parse(raw);
    // Only restore if we have all the required fields
    if (s.view && s.roomCode && s.userId && s.userName && s.view !== 'landing') {
      return s;
    }
    return null;
  } catch {
    return null;
  }
}

function saveSession(state: SessionState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function App() {
  // Restore from sessionStorage on first load
  const saved = loadSession();

  const [view, setView] = useState<AppView>(saved?.view ?? 'landing');
  const [roomCode, setRoomCode] = useState<string | null>(saved?.roomCode ?? null);
  const [userId, setUserId] = useState<string | null>(saved?.userId ?? null);
  const [userName, setUserName] = useState<string | null>(saved?.userName ?? null);

  // Also check URL params for ?room=CODE (joining via QR)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    // Only redirect if we're currently on landing and a room code is in URL
    if (roomParam && view === 'landing') {
      // Pre-fill room code — LandingView will handle the actual join flow
    }
  }, []);

  // Persist session whenever state changes
  useEffect(() => {
    if (view !== 'landing' && roomCode && userId && userName) {
      saveSession({ view, roomCode, userId, userName });
    }
  }, [view, roomCode, userId, userName]);

  const handleHost = (code: string, id: string, name: string) => {
    setRoomCode(code);
    setUserId(id);
    setUserName(name);
    setView('host');
  };

  const handleJoin = (code: string, id: string, name: string) => {
    setRoomCode(code);
    setUserId(id);
    setUserName(name);
    setView('participant');
  };

  const handleLeave = () => {
    clearSession();
    setRoomCode(null);
    setUserId(null);
    setUserName(null);
    setView('landing');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div className="app">
      {view === 'landing' && (
        <LandingView
          onHost={handleHost}
          onJoin={handleJoin}
        />
      )}
      {view === 'host' && roomCode && userId && userName && (
        <HostView
          roomCode={roomCode}
          userId={userId}
          userName={userName}
          onLeave={handleLeave}
        />
      )}
      {view === 'participant' && roomCode && userId && userName && (
        <ParticipantView
          roomCode={roomCode}
          userId={userId}
          userName={userName}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}

export default App;
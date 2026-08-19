import { useState, useEffect } from 'react';
import { LandingView } from './components/views/LandingView';
import { HostSetupView } from './components/views/HostSetupView';
import { JoinSetupView } from './components/views/JoinSetupView';
import { HostView } from './components/views/HostView';
import { ParticipantView } from './components/views/ParticipantView';
import { OfflineView } from './components/views/OfflineView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { initPwaInstallCapture } from './hooks/usePwaInstall';
import './App.css';

initPwaInstallCapture();

type AppView = 'landing' | 'host-setup' | 'join-setup' | 'host' | 'participant';

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
    if (
      s.view &&
      s.roomCode &&
      s.userId &&
      s.userName &&
      (s.view === 'host' || s.view === 'participant')
    ) {
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
  const { isOnline, checking, refresh } = useOnlineStatus();
  const saved = loadSession();
  const initialRoomParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room') ||
        new URLSearchParams(window.location.search).get('code')
      : null;

  const [view, setView] = useState<AppView>(() => {
    if (saved?.view) return saved.view;
    if (initialRoomParam) return 'join-setup';
    return 'landing';
  });
  const [roomCode, setRoomCode] = useState<string | null>(saved?.roomCode ?? null);
  const [userId, setUserId] = useState<string | null>(saved?.userId ?? null);
  const [userName, setUserName] = useState<string | null>(saved?.userName ?? null);
  const [joinInitialCode, setJoinInitialCode] = useState(initialRoomParam?.trim().toUpperCase() ?? '');

  useEffect(() => {
    if (view === 'host' || view === 'participant') {
      if (roomCode && userId && userName) {
        saveSession({ view, roomCode, userId, userName });
      }
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
    setJoinInitialCode('');
    setView('landing');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const goBackToLanding = () => {
    setView('landing');
  };

  if (!isOnline) {
    return (
      <div className="app">
        <OfflineView checking={checking} onRetry={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'landing' && (
        <div key="landing" className="view-transition view-enter">
          <LandingView
            onSelectHost={() => setView('host-setup')}
            onSelectJoin={() => {
              setJoinInitialCode('');
              setView('join-setup');
            }}
          />
        </div>
      )}
      {view === 'host-setup' && (
        <div key="host-setup" className="view-transition view-enter">
          <HostSetupView onHost={handleHost} onBack={goBackToLanding} />
        </div>
      )}
      {view === 'join-setup' && (
        <div key="join-setup" className="view-transition view-enter">
          <JoinSetupView
            onJoin={handleJoin}
            onBack={goBackToLanding}
            initialCode={joinInitialCode}
          />
        </div>
      )}
      {view === 'host' && roomCode && userId && userName && (
        <div key="host" className="view-transition view-enter">
          <HostView
            roomCode={roomCode}
            userId={userId}
            userName={userName}
            onLeave={handleLeave}
          />
        </div>
      )}
      {view === 'participant' && roomCode && userId && userName && (
        <div key="participant" className="view-transition view-enter">
          <ParticipantView
            roomCode={roomCode}
            userId={userId}
            userName={userName}
            onLeave={handleLeave}
          />
        </div>
      )}
    </div>
  );
}

export default App;

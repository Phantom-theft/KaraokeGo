import { useCallback, useEffect, useState } from 'react';

async function probeOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    // External check the SW will not satisfy from the app shell cache.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    await fetch(`https://www.gstatic.com/generate_204?t=${Date.now()}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine)
  );
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const online = await probeOnline();
      setIsOnline(online);
      return online;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const goOnline = () => {
      void refresh();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    void refresh();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [refresh]);

  return { isOnline, checking, refresh };
}

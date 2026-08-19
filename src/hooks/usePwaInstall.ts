import { useCallback, useEffect, useState } from 'react';

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    nav.standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

let deferredPromptCache: BeforeInstallPromptEvent | null = null;
let installedCache = false;
let captureStarted = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

/** Capture beforeinstallprompt once so it survives leaving the landing page. */
export function initPwaInstallCapture() {
  if (captureStarted || typeof window === 'undefined') return;
  captureStarted = true;

  if (isStandaloneMode()) {
    installedCache = true;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPromptCache = event as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    installedCache = true;
    deferredPromptCache = null;
    notifySubscribers();
  });

  const standaloneMedia = window.matchMedia('(display-mode: standalone)');
  standaloneMedia.addEventListener('change', () => {
    if (isStandaloneMode()) {
      installedCache = true;
      deferredPromptCache = null;
      notifySubscribers();
    }
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => deferredPromptCache,
  );
  const [isInstalled, setIsInstalled] = useState(() => installedCache || isStandaloneMode());
  const [isIos] = useState(() => isIosDevice());
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    initPwaInstallCapture();

    const syncFromCache = () => {
      setDeferredPrompt(deferredPromptCache);
      setIsInstalled(installedCache || isStandaloneMode());
    };

    syncFromCache();
    subscribers.add(syncFromCache);
    return () => {
      subscribers.delete(syncFromCache);
    };
  }, []);

  const canNativeInstall = !!deferredPrompt;
  const canIosInstall = isIos && !isInstalled;
  const canInstall = !isInstalled && (canNativeInstall || canIosInstall);

  const install = useCallback(async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPromptCache = null;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        installedCache = true;
        setIsInstalled(true);
      }
      notifySubscribers();
      return;
    }

    if (isIos) {
      setShowIosInstructions(true);
    }
  }, [deferredPrompt, isInstalled, isIos]);

  const closeIosInstructions = useCallback(() => {
    setShowIosInstructions(false);
  }, []);

  return {
    isInstalled,
    canInstall,
    canNativeInstall,
    canIosInstall,
    install,
    showIosInstructions,
    closeIosInstructions,
  };
}

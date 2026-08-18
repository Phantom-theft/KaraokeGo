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

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [isIos] = useState(() => isIosDevice());
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) {
      setIsInstalled(true);
    }

    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosInstructions(false);
    };

    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => {
      if (isStandaloneMode()) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    standaloneMedia.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      standaloneMedia.removeEventListener('change', onDisplayModeChange);
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
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
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

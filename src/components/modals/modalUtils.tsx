import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type InfoModalType = 'terms' | 'privacy' | 'help' | 'updates' | 'report' | 'feedback';
export type InfoModalTab = InfoModalType;

/* ── MODAL SCROLL & VIEWPORT BEHAVIOR HOOK ── */
export function useModalBehavior(isOpen: boolean, onClose: () => void) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset the modal's own scroll area to the top
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    // Capture the current scroll position before locking
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    // Save original overflow & overscroll styles
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;

    // Lock background scrolling cleanly
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restore background styles
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;

      // Restore exact page scroll position
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return contentRef;
}

// ── Portal helper ──────────────────────────────────────────────────────────
// Renders modal directly into document.body to break free from any parent stacking
// context (such as CSS isolation, animations, filters, and transforms on landing-page).
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

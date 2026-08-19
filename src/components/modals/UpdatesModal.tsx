import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ModalPortal, useModalBehavior } from './modalUtils';

/* ── 2. UPDATES MODAL ── */
export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  badge?: string;
  highlights: string[];
  order: number;
}

export const UpdatesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'updates'), orderBy('order', 'asc'), limit(50));
    getDocs(q)
      .then((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChangelogEntry));
        setEntries(data);
      })
      .catch(() => setError('Could not load updates. Please try again.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><History size={22} /></div>
              <div>
                <h2 className="info-modal-heading">What's New &amp; Updates</h2>
                <p className="info-modal-subheading">Changelog and recent improvements to Karaoke Go</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Updates modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section">
              {loading && (
                <div className="info-updates-status">
                  <div className="info-updates-status-icon">
                    <RefreshCw size={24} className="info-updates-spinner" />
                  </div>
                  <p className="info-updates-status-title">Loading updates…</p>
                </div>
              )}
              {error && !loading && (
                <div className="info-updates-status info-updates-error">
                  <div className="info-updates-status-icon info-updates-error-icon">
                    <AlertTriangle size={24} />
                  </div>
                  <p className="info-updates-status-title">{error}</p>
                </div>
              )}
              {!loading && !error && entries.length === 0 && (
                <div className="info-updates-empty">
                  <div className="info-updates-empty-icon">
                    <History size={30} strokeWidth={1.8} />
                  </div>
                  <p className="info-updates-empty-title">No updates posted yet</p>
                  <span className="info-updates-empty-desc">Check back soon for new features and improvements.</span>
                </div>
              )}
              {!loading && !error && entries.length > 0 && (
                <div className="info-updates-timeline">
                  {entries.map((update) => (
                    <div key={update.id} className="info-update-card">
                      <div className="info-update-header">
                        <div className="info-update-version-row">
                          <span className="info-update-version">{update.version}</span>
                          {update.badge && <span className="info-update-badge">{update.badge}</span>}
                          <span className="info-update-date">{update.date}</span>
                        </div>
                        <h3 className="info-update-title">{update.title}</h3>
                      </div>
                      <ul className="info-update-list">
                        {(update.highlights || []).map((point, pIdx) => (
                          <li key={pIdx}>
                            <span className="info-update-dot" aria-hidden="true" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Updates</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

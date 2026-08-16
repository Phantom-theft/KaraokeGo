import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineViewProps {
  checking?: boolean;
  onRetry: () => void;
}

export const OfflineView: React.FC<OfflineViewProps> = ({ checking = false, onRetry }) => {
  return (
    <div className="page-loading offline-page">
      <div className="modern-card page-state-card offline-card">
        <div className="offline-icon" aria-hidden="true">
          <WifiOff size={28} strokeWidth={2.2} />
        </div>
        <h1 className="offline-title">No internet</h1>
        <p className="offline-copy">
          Karaoke Go needs a connection for rooms, the queue, and YouTube.
          Check your Wi‑Fi or mobile data, then try again.
        </p>
        <button
          type="button"
          className="button-primary"
          onClick={onRetry}
          disabled={checking}
          style={{ marginTop: '1.5rem', width: '100%' }}
        >
          {checking ? 'Checking…' : 'Try again'}
        </button>
      </div>
    </div>
  );
};

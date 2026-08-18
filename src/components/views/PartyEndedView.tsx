import React from 'react';

interface PartyEndedViewProps {
  onGoHome: () => void;
}

export const PartyEndedView: React.FC<PartyEndedViewProps> = ({ onGoHome }) => {
  return (
    <div className="page-loading">
      <div className="modern-card page-state-card">
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
          Party is end
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          The host has ended this karaoke session. Thanks for joining!
        </p>
        <button className="button-primary" onClick={onGoHome} style={{ marginTop: '1.5rem', width: '100%' }}>
          Back to Home
        </button>
      </div>
    </div>
  );
};

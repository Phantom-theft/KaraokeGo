import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={() => toggleTheme()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span key={isDark ? 'sun' : 'moon'} className="theme-toggle-icon" aria-hidden="true">
        {isDark ? <Sun size={18} strokeWidth={2.3} /> : <Moon size={18} strokeWidth={2.3} />}
      </span>
    </button>
  );
};

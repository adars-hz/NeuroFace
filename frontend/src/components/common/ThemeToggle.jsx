import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 border ${
        isDark
          ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 hover:border-slate-600'
          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-slate-400'
      } shadow-sm active:scale-95 ${className}`}
    >
      <div className="flex items-center space-x-2">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-spin-slow transition-transform" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 transition-transform" />
        )}
        {showLabel && (
          <span className="text-xs font-semibold select-none">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;


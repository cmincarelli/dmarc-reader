/**
 * Theme Hook
 *
 * Manages application theme (light/dark/system) with persistence
 */

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    // Use system preference
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    // Use explicit theme
    root.classList.add(theme);
  }
}

/**
 * Hook for managing application theme
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        const savedTheme = settings.theme || 'system';
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } catch (error) {
        console.error('Failed to load theme:', error);
        applyTheme('system');
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Function to change theme
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Save to settings
    try {
      await window.electronAPI.updateSettings({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  return { theme, setTheme, isLoading };
}

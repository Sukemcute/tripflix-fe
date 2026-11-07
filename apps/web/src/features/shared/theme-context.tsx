'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved =
      window.localStorage.getItem('tripflix.theme') ??
      window.localStorage.getItem('tripflix.inspiration.theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem('tripflix.theme', theme);
      window.localStorage.setItem('tripflix.inspiration.theme', theme);
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  function setTheme(next: AppTheme) {
    setThemeState(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


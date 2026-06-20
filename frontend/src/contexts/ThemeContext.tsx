import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeCtx { dark: boolean; toggleTheme: () => void }
const Ctx = createContext<ThemeCtx>({ dark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('wp-theme');
    return s ? s === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('wp-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <Ctx.Provider value={{ dark, toggleTheme: () => setDark(d => !d) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);

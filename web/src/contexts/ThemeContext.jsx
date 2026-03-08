import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme] = useState('light');

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }, [theme]);

    const value = useMemo(() => ({
        theme: 'light',
        isDark: false,
        setTheme: () => { },
        toggleTheme: () => { },
    }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

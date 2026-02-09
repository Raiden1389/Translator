"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
    theme: "light" | "dark";
    setTheme: (theme: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function RaidenProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            const saved = localStorage.getItem("theme") as "light" | "dark" | null;
            const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const initialTheme = saved || (systemPrefersDark ? "dark" : "light");

            setThemeState(initialTheme);
            document.documentElement.classList.toggle("dark", initialTheme === "dark");
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const setTheme = (newTheme: "light" | "dark") => {
        setThemeState(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <div
                className="flex-1 flex flex-col min-h-0"
                style={{ visibility: mounted ? "visible" : "hidden" }}
            >
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export const useRaiden = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useRaiden must be used within a RaidenProvider");
    }
    return context;
};

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface RaidenContextType {
    isRaidenMode: boolean;
    toggleRaidenMode: () => void;
}

const RaidenContext = createContext<RaidenContextType | undefined>(undefined);

export function RaidenProvider({ children }: { children: React.ReactNode }) {
    const [isRaidenMode, setIsRaidenMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            const saved = localStorage.getItem("raiden-mode");
            if (saved === "true") {
                setIsRaidenMode(true);
                document.documentElement.classList.add("raiden-mode");
            }
            setMounted(true);
        }, 0);
    }, []);

    const toggleRaidenMode = () => {
        setIsRaidenMode((prev) => {
            const next = !prev;
            localStorage.setItem("raiden-mode", String(next));
            if (next) {
                document.documentElement.classList.add("raiden-mode");
            } else {
                document.documentElement.classList.remove("raiden-mode");
            }
            return next;
        });
    };

    return (
        <RaidenContext.Provider value={{ isRaidenMode, toggleRaidenMode }}>
            <div style={{ visibility: mounted ? "visible" : "hidden" }}>
                {children}
            </div>
        </RaidenContext.Provider>
    );
}

export const useRaiden = () => {
    const context = useContext(RaidenContext);
    if (!context) {
        throw new Error("useRaiden must be used within a RaidenProvider");
    }
    return context;
};

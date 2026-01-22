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
        const saved = localStorage.getItem("raiden-mode");
        if (saved === "true") {
            setIsRaidenMode(true);
            document.documentElement.classList.add("raiden-mode");
        }
        setMounted(true);
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

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <RaidenContext.Provider value={{ isRaidenMode, toggleRaidenMode }}>
            {children}
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

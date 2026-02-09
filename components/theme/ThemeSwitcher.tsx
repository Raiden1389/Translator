"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Sun, Moon, Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "raiden-gray" | "macos";

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<Theme>("dark");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const className = document.documentElement.className;
    if (className.includes("macos")) {
      setCurrentTheme("macos");
    } else if (className.includes("raiden-gray")) {
      setCurrentTheme("raiden-gray");
    } else if (className.includes("dark")) {
      setCurrentTheme("dark");
    } else {
      setCurrentTheme("light");
    }
  }, []);

  const switchTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem("theme", theme);

    // Use requestAnimationFrame to avoid React Compiler warning
    requestAnimationFrame(() => {
      if (theme === "light") {
        document.documentElement.className = "";
      } else {
        document.documentElement.className = theme;
      }
    });

    setIsOpen(false);
  };

  const themes = [
    { id: "light" as Theme, label: "Light", icon: Sun, desc: "Sáng, trắng tinh" },
    { id: "raiden-gray" as Theme, label: "Gray", icon: Palette, desc: "Xám trung tính" },
    { id: "dark" as Theme, label: "Dark", icon: Moon, desc: "Tối, blue accent" },
    { id: "macos" as Theme, label: "macOS", icon: Sun, desc: "🍎 Apple-inspired" },
  ];

  return (
    <div className="relative ml-auto">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-8 h-8 rounded-xl transition-all duration-300",
          "text-muted-foreground hover:text-primary hover:bg-primary/10"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Zap className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 bottom-full mb-2 w-56 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isActive = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => switchTheme(theme.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left",
                    isActive && "bg-primary/10"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                  <div className="flex-1">
                    <div className={cn("font-medium text-sm", isActive && "text-primary font-bold")}>{theme.label}</div>
                    <div className="text-[10px] text-muted-foreground">{theme.desc}</div>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

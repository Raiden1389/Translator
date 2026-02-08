import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Merriweather, Noto_Serif, Literata, Crimson_Text, Nunito } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raiden AI Translator",
  description: "Advanced AI Novel Translator",
};

import { Toaster } from "sonner";
import { TitleBar } from "@/components/layout/TitleBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RaidenProvider } from "@/components/theme/RaidenProvider";
import { TranslationProvider } from "@/components/workspace/hooks/TranslationProvider.v2";
import { GlobalTranslationProgress } from "@/components/layout/GlobalTranslationProgress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalShortcutsManager } from "@/components/layout/GlobalShortcutsManager";
import { CommandPalette } from "@/components/CommandPalette/CommandPalette";
import { CommandRegistrar } from "@/components/layout/CommandRegistrar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${merriweather.variable} ${notoSerif.variable} ${literata.variable} ${crimsonText.variable} ${nunito.variable} antialiased bg-transparent h-screen w-screen overflow-hidden flex flex-col p-px select-none`}
      >
        <div className="flex-1 flex flex-col bg-background rounded-lg border border-border shadow-2xl overflow-hidden relative group/window">
          <RaidenProvider>
            <GlobalShortcutsManager />
            <ErrorBoundary>
              <TranslationProvider>
                <TooltipProvider delayDuration={400}>
                  <TitleBar />
                  <main className="flex-1 overflow-hidden flex flex-col relative z-0">
                    {children}
                    <GlobalTranslationProgress />
                  </main>
                  <StatusBar />
                  <Toaster
                    position="bottom-right"
                    expand={true}
                    richColors
                    theme="light"
                    toastOptions={{
                      className: "bg-card border border-border text-foreground shadow-2xl rounded-xl",
                    }}
                  />
                  <CommandPalette />
                  <CommandRegistrar />
                </TooltipProvider>
              </TranslationProvider>
            </ErrorBoundary>
          </RaidenProvider>
        </div>
      </body>
    </html >
  );
}

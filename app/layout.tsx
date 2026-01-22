import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Merriweather } from "next/font/google";
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



export const metadata: Metadata = {
  title: "Raiden AI Translator",
  description: "Advanced AI Novel Translator",
};

import { Toaster } from "sonner";
import { TitleBar } from "@/components/layout/TitleBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Script from "next/script";
import { RaidenProvider } from "@/components/theme/RaidenProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${merriweather.variable} antialiased bg-transparent h-screen w-screen overflow-hidden flex flex-col p-[1px] select-none`}
      >
        <div className="flex-1 flex flex-col bg-background rounded-lg border border-border shadow-2xl overflow-hidden relative group/window">
          {/* Window Shadow Overlay */}
          <div className="absolute inset-0 rounded-lg pointer-events-none shadow-[0_0_20px_rgba(0,0,0,0.05)]" />

          <TitleBar />
          <main className="flex-1 overflow-hidden flex flex-col relative z-0">
            <ErrorBoundary>
              <RaidenProvider>
                {children}
              </RaidenProvider>
            </ErrorBoundary>
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
        </div >
      </body >
    </html >
  );
}

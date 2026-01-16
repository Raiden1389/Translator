import { WorkspaceList } from "@/components/dashboard/WorkspaceList";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent p-8 pt-16">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center text-white shadow-[0_0_20px_rgba(108,92,231,0.3)] border border-white/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight font-[var(--font-lora)] italic">Raiden</h1>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.3em] -mt-1">AI Translator Engine</p>
            </div>
          </div>
        </header>

        <div className="mb-10 selectable">
          <h2 className="text-4xl font-black text-white mb-3 tracking-tight">My Library</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#6c5ce7] to-transparent rounded-full mb-4"></div>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Manage your localized translations with Raiden's advanced neural engine.
            <span className="text-white/20 ml-2 italic">Dữ liệu được lưu trữ cục bộ và bảo mật.</span>
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#6c5ce7]/5 to-transparent blur-3xl rounded-full opacity-50 pointer-events-none" />
          <WorkspaceList />
        </div>
      </div>
    </div>
  );
}

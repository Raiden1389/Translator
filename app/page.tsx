import { WorkspaceList } from "@/components/dashboard/WorkspaceList";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 pt-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Raiden AI Translator</h1>
            </div>
          </div>
          <div>
          </div>
        </header>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Workspace</h2>
          <p className="text-white/50">Không giới hạn workspace cho bộ nhớ cục bộ. Đăng nhập để đồng bộ.</p>
        </div>

        <WorkspaceList />
      </div>
    </main>
  );
}

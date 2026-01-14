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
              <h1 className="text-2xl font-bold text-white">Antigravity AI</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10 bg-transparent rounded-full px-4">Đăng nhập</Button>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 rounded-full px-4 shadow-lg shadow-orange-500/20">
              <Zap className="mr-1 h-3 w-3" /> Nâng cấp ngay
            </Button>
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

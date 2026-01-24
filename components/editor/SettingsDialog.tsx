"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Sub-components
import { AISettingsTab } from "./settings/AISettingsTab"
import { DictionaryTab } from "./settings/DictionaryTab"

interface SettingsDialogProps {
    workspaceId?: string;
    defaultTab?: string;
    trigger?: React.ReactNode;
}

export function SettingsDialog({ workspaceId, defaultTab = "ai", trigger }: SettingsDialogProps) {
    const [open, setOpen] = useState(false)

    // We only use the count here for the tab label
    const dicCount = useLiveQuery(
        () => workspaceId
            ? db.dictionary.where("workspaceId").equals(workspaceId).count()
            : db.dictionary.count(),
        [workspaceId]
    ) || 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-[#1a0b2e] border-white/10 text-white shadow-2xl shadow-black/50 overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Settings className="h-5 w-5 text-primary animate-pulse" />
                        Cài đặt Hệ thống
                    </DialogTitle>
                    <DialogDescription className="text-white/40 font-medium">
                        Quản lý API Key, Model AI và các cấu hình dịch thuật.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3 bg-[#2b2b40]/50 p-1 border border-white/5 rounded-xl">
                        <TabsTrigger
                            value="ai"
                            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            AI / API Keys
                        </TabsTrigger>
                        <TabsTrigger
                            value="dic"
                            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            Từ điển ({dicCount})
                        </TabsTrigger>
                        <TabsTrigger
                            value="general"
                            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            Cấu hình chung
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai">
                        <AISettingsTab />
                    </TabsContent>

                    <TabsContent value="dic">
                        <DictionaryTab workspaceId={workspaceId} />
                    </TabsContent>

                    <TabsContent value="general" className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                            <Settings className="h-6 w-6" />
                        </div>
                        <p className="text-sm text-white/30 italic font-medium">Tính năng "Cấu hình chung" đang được phát triển...</p>
                    </TabsContent>
                </Tabs>

                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="text-white/40 hover:text-white hover:bg-white/5 font-bold"
                    >
                        Đóng Settings
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

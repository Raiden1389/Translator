"use client"

import React, { useState, useEffect, useRef } from "react"
import { db } from "@/lib/db"
import { settingsRepo } from "@/lib/repositories/settings"
import { checkKeyHealth, parseKeyPool } from "@/lib/services/ai-health"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Key, Database, Sparkles, Loader2, RefreshCw, Settings, XCircle } from "lucide-react"
import { AI_MODELS } from "@/lib/ai-models"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import pLimit from "p-limit"

export function AISettingsTab() {
    const [primaryKey, setPrimaryKey] = useState("")
    const [poolKeys, setPoolKeys] = useState("")
    const [model, setModel] = useState("gemini-2.0-flash")
    const [availableModels, setAvailableModels] = useState<{ value: string, label: string }[]>(AI_MODELS)
    const [isLoadingModels, setIsLoadingModels] = useState(false)

    // Key Check State
    const [checkingKeys, setCheckingKeys] = useState(false)
    const [keyStatuses, setKeyStatuses] = useState<{ key: string, status: 'valid' | 'invalid' | 'checking', ms?: number, error?: string }[]>([])

    // Refs for optimization and control
    const lastFetchRef = useRef(0)
    const stopCheckingRef = useRef(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        loadSettings()
        return () => { mountedRef.current = false }
    }, [])

    const loadSettings = async () => {
        const [k1, k2, m] = await Promise.all([
            db.settings.get("apiKeyPrimary"),
            db.settings.get("apiKeyPool"),
            db.settings.get("aiModel")
        ])

        if (!mountedRef.current) return

        if (k1) setPrimaryKey(k1.value as string)
        if (k2) setPoolKeys(k2.value as string)
        if (m) setModel(m.value as string)
    }

    const fetchModels = async () => {
        if (!primaryKey) return

        // Anti-spam: Throttle 30s
        const now = Date.now()
        if (now - lastFetchRef.current < 30000) {
            toast.info(`Hãy đợi thêm ${Math.ceil((30000 - (now - lastFetchRef.current)) / 1000)} giây để cập nhật lại.`)
            return
        }

        setIsLoadingModels(true)
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${primaryKey}`)
            const data = await response.json()

            if (!mountedRef.current) return

            if (data.models) {
                const models = data.models
                    .map((m: any) => {
                        const id = m.name.replace("models/", "")
                        return { value: id, label: id }
                    })
                    .filter((m: { value: string }) => m.value.includes("gemini"))

                setAvailableModels(models)
                lastFetchRef.current = Date.now()
                toast.success("Đã cập nhật danh sách Model.")
            } else {
                toast.error("Không thể lấy ID model. Kiểm tra lại Key.")
            }
        } catch (e) {
            console.error(e)
            toast.error("Lỗi kết nối khi lấy models.")
        } finally {
            if (mountedRef.current) setIsLoadingModels(false)
        }
    }

    const checkAllKeys = async () => {
        setCheckingKeys(true)
        stopCheckingRef.current = false

        const uniqueKeys = Array.from(new Set([
            primaryKey,
            ...parseKeyPool(poolKeys)
        ])).filter(k => k.length > 5)

        if (uniqueKeys.length === 0) {
            setCheckingKeys(false)
            return
        }

        setKeyStatuses(uniqueKeys.map(k => ({ key: k, status: 'checking' })))

        const limit = pLimit(3)

        const tasks = uniqueKeys.map((key) => limit(async () => {
            if (stopCheckingRef.current) return

            try {
                const { ms } = await checkKeyHealth(key)

                if (!mountedRef.current || stopCheckingRef.current) return

                const result = { key, status: 'valid' as const, ms }
                setKeyStatuses(prev => prev.map(s => s.key === key ? result : s))
                return result
            } catch (e: any) {
                console.warn("Key Check Failed:", e)
                let errorMsg = e.message || e.toString()

                if (e.status === 429 || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
                    errorMsg = "Hết hạn mức (Quota Exceeded)"
                } else if (errorMsg.includes("API key expired")) {
                    errorMsg = "Key đã hết hạn"
                } else if (e.status) {
                    errorMsg = `${e.status} - ${e.statusText || errorMsg}`
                }

                if (!mountedRef.current || stopCheckingRef.current) return

                const result = { key, status: 'invalid' as const, error: errorMsg }
                setKeyStatuses(prev => prev.map(s => s.key === key ? result : s))
                return result
            }
        }))

        await Promise.all(tasks)

        if (mountedRef.current) {
            setCheckingKeys(false)
            if (stopCheckingRef.current) {
                toast.info("Đã dừng kiểm tra key.")
            } else {
                toast.success("Kiểm tra key hoàn tất.")
            }
        }
    }

    const handleSave = async () => {
        try {
            await settingsRepo.saveAISettings(primaryKey, poolKeys, model)
            toast.success("Đã lưu cấu hình AI.")
        } catch (e) {
            console.error("Save failed", e)
            toast.error("Lỗi khi lưu cấu hình.")
        }
    }

    const activeKeyCount = parseKeyPool(poolKeys).length

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Key className="h-4 w-4" /> Primary API Key (Gemini)
                </Label>
                <div className="flex gap-2">
                    <Input
                        type="password"
                        placeholder="AIzaSy..."
                        value={primaryKey}
                        onChange={(e) => setPrimaryKey(e.target.value)}
                        className="bg-[#2b2b40] border-white/10 text-white focus-visible:ring-primary flex-1 h-9 text-sm"
                    />
                    <Button
                        variant="outline"
                        onClick={fetchModels}
                        disabled={!primaryKey || isLoadingModels}
                        className="border-white/10 hover:bg-white/10 h-9 px-3"
                        title="Fetch Available Models"
                    >
                        {isLoadingModels ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Database className="h-4 w-4" />
                    Key Pool (Mỗi dòng 1 key)
                    <span className="ml-auto text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-300 border border-indigo-500/30">
                        {activeKeyCount} keys active
                    </span>
                </Label>
                <Textarea
                    placeholder={`AIzaSy... (Key 1)\nAIzaSy... (Key 2)`}
                    value={poolKeys}
                    onChange={(e) => setPoolKeys(e.target.value)}
                    className="bg-[#2b2b40] border-white/10 text-white focus-visible:ring-primary font-mono text-xs h-[120px] resize-none"
                />

                <div className="pt-2 flex gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={checkAllKeys}
                        disabled={checkingKeys}
                        className="flex-1 bg-white/5 hover:bg-primary/20 text-indigo-300 border border-indigo-500/30 transition-all h-8 text-[11px] font-bold uppercase tracking-widest"
                    >
                        {checkingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                        {checkingKeys ? "Đang kiểm tra..." : "Kiểm tra tình trạng keys"}
                    </Button>

                    {checkingKeys && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => stopCheckingRef.current = true}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 h-8 px-3"
                            title="Dừng kiểm tra"
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {keyStatuses.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto p-2 bg-black/40 rounded-lg border border-white/5 custom-scrollbar">
                        {keyStatuses.map((k, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded bg-white/5 border border-white/5">
                                <div className="flex items-center gap-2 truncate max-w-[65%]">
                                    <div className={cn("h-2 w-2 rounded-full shrink-0",
                                        k.status === 'valid' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                            k.status === 'invalid' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                                                "bg-amber-500 animate-pulse"
                                    )} />
                                    <span className="font-mono text-white/60 truncate">{k.key.substring(0, 12)}...{k.key.substring(k.key.length - 6)}</span>
                                </div>
                                <div className="text-right max-w-[35%]">
                                    {k.status === 'valid' ? (
                                        <span className="text-emerald-400 font-mono font-bold tracking-tighter">{k.ms}ms</span>
                                    ) : k.status === 'invalid' ? (
                                        <span className="text-rose-400 text-[9px] break-all block leading-tight font-medium" title={k.error}>{k.error || "Lỗi!"}</span>
                                    ) : (
                                        <span className="text-amber-400 animate-pulse">Checking...</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" /> Default AI Model
                </Label>
                <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-[#2b2b40] border-white/10 text-white h-9">
                        <SelectValue placeholder="Chọn Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2b2b40] border-white/20 text-white">
                        <SelectGroup>
                            {availableModels.map((m) => (
                                <SelectItem key={m.value} value={m.value} className="focus:bg-primary/20 focus:text-white cursor-pointer hover:bg-white/5">
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            <div className="pt-4 border-t border-white/5">
                <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 shadow-lg shadow-primary/20">
                    Lưu Cấu Hình AI
                </Button>
            </div>
        </div>
    )
}

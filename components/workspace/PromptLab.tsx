"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Swords, Trophy, Sparkles, RefreshCw, Copy, Check, FileText, SparklesIcon, Save, Beaker, Wand2 } from "lucide-react";
import { db } from "@/lib/db";
import { translateChapter, generatePromptVariants, evaluateTranslation, analyzeStyleDNA } from "@/lib/gemini";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SAMPLE_TEXT = `许七安走在京城的街道上，周围是熙熙攘攘的人群。他必须要搞清楚，这个世界到底发生了什么。"天道崩塌，妖魔横行..." 脑海中回荡着这句话。作为一名穿越者，他本想安稳度日，但命运似乎并不打算放过他。前方的打更人衙门威严耸立，那是他唯一的去处。`;

export const PromptLab = ({ workspaceId }: { workspaceId: string }) => {
    const [testSample, setTestSample] = useState("");
    const [promptGoals, setPromptGoals] = useState("Văn phong trôi chảy, tự nhiên. Giữ nguyên Hán Việt các từ tu tiên.");
    const [promptA, setPromptA] = useState("Mày là dịch giả chuyên nghiệp Trung - Việt. Dịch tự nhiên, giữ nguyên tên riêng.");
    const [promptB, setPromptB] = useState("Dịch văn phong kiếm hiệp, tiên hiệp cổ điển. Dùng nhiều từ Hán Việt sang trọng, trau chuốt.");
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch first chapter for sample
    const firstChapter = useLiveQuery(() =>
        db.chapters.where("workspaceId").equals(workspaceId).sortBy("order").then(c => c[0]),
        [workspaceId]
    );

    useEffect(() => {
        if (firstChapter?.content_original && !testSample) {
            // Take first 800 chars as sample
            setTestSample(firstChapter.content_original.substring(0, 800) + "...");
        } else if (!firstChapter && !testSample) {
            setTestSample(SAMPLE_TEXT);
        }
    }, [firstChapter, testSample]);

    const [resultA, setResultA] = useState("");
    const [resultB, setResultB] = useState("");
    const [scoreA, setScoreA] = useState<number | null>(null);
    const [scoreB, setScoreB] = useState<number | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [isFighting, setIsFighting] = useState(false);

    // Save Prompt State
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [pendingSaveContent, setPendingSaveContent] = useState("");

    const openSaveDialog = (defaultName: string, content: string) => {
        setSaveName(defaultName);
        setPendingSaveContent(content);
        setIsSaveDialogOpen(true);
    };

    const confirmSavePrompt = async () => {
        if (!saveName.trim()) {
            toast.error("Vui lòng nhập tên prompt!");
            return;
        }
        await db.prompts.add({
            title: saveName,
            content: pendingSaveContent,
            createdAt: new Date()
        });
        toast.success("Đã lưu prompt vào thư viện!");
        setIsSaveDialogOpen(false);
    };

    const handleGeneratePrompts = async () => {
        if (!promptGoals.trim()) {
            toast.error("Vui lòng nhập mục tiêu prompt!");
            return;
        }
        setIsGenerating(true);
        toast.info("Đang suy nghĩ prompt...");
        try {
            const { promptA, promptB } = await generatePromptVariants(promptGoals);
            setPromptA(promptA);
            setPromptB(promptB);
            toast.success("Đã tạo xong 2 variants!");
        } catch (e: any) {
            toast.error("Lỗi: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExtractSpirit = async () => {
        setIsGenerating(true);
        toast.info("Đang trích xuất linh hồn (Spirit Extraction)...");
        try {
            // 1. Fetch first 5 chapters
            const chapters = await db.chapters.where("workspaceId").equals(workspaceId).sortBy("order");
            if (chapters.length === 0) {
                throw new Error("Không tìm thấy chương nào để phân tích!");
            }
            const samples = chapters.slice(0, 5).map(c => c.content_original);

            // 2. Analyze DNA
            const dna = await analyzeStyleDNA(samples);

            // 3. Fill Goals
            const newGoals = `Phong cách: ${dna.tone}. Bối cảnh: ${dna.setting}. Xưng hô: ${dna.pronouns}. Mô tả: ${dna.description}`;
            setPromptGoals(newGoals);

            toast.success("Đã trích xuất DNA thành công!", {
                description: dna.tone + " - " + dna.setting
            });

            // Auto generate prompts after extraction? Optional but cool.
            handleGeneratePrompts();

        } catch (e: any) {
            toast.error("Lỗi: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };


    const handleFight = async () => {
        if (!testSample.trim()) {
            toast.error("Vui lòng nhập văn bản mẫu!");
            return;
        }
        setIsFighting(true);
        setResultA("");
        setResultB("");
        setScoreA(null);
        setScoreB(null);
        setWinner(null);
        setReason("");

        try {
            // 1. Run both translations
            toast.info("Đang bắt đầu so tài...");

            const runA = new Promise<string>((resolve, reject) => {
                translateChapter(workspaceId, testSample, () => { }, (res) => resolve(res.translatedText), promptA)
                    .catch(reject);
            });

            const runB = new Promise<string>((resolve, reject) => {
                translateChapter(workspaceId, testSample, () => { }, (res) => resolve(res.translatedText), promptB)
                    .catch(reject);
            });

            const [resA, resB] = await Promise.all([runA, runB]);
            setResultA(resA);
            setResultB(resB);

            // 2. AI Rating
            toast.info("Trọng tài AI đang chấm điểm...");
            const evalResult = await evaluateTranslation(testSample, resA, resB);

            setScoreA(evalResult.scoreA);
            setScoreB(evalResult.scoreB);
            setWinner(evalResult.winner === "Draw" ? "Hòa" : (evalResult.winner === "A" ? "Prompt A" : "Prompt B"));
            setReason(evalResult.reason);

        } catch (e: any) {
            toast.error("Lỗi khi chạy Test: " + e.message);
        } finally {
            setIsFighting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <Swords className="w-6 h-6 text-orange-500" />
                        Prompt Lab
                    </h2>
                    <p className="text-white/40 text-sm">Thử nghiệm và tối ưu hóa câu lệnh dịch (A/B Testing)</p>
                </div>
                <Button
                    onClick={handleFight}
                    disabled={isFighting}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-orange-900/20 gap-3 group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <RefreshCw className={cn("w-5 h-5", isFighting && "animate-spin")} />
                    {isFighting ? "ĐANG CHIẾN ĐẤU..." : "FIGHT! (Start Test)"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Input & Generator */}
                <Card className="bg-[#1e1e2e] border-white/5 shadow-xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-400" />
                            VĂN BẢN MẪU (TEST SAMPLE)
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (firstChapter?.content_original) {
                                    setTestSample(firstChapter.content_original.substring(0, 800) + "...");
                                    toast.success("Đã lấy nội dung gốc từ Chương 1!");
                                } else {
                                    setTestSample(SAMPLE_TEXT);
                                    toast.info("Không tìm thấy chương nào, dùng văn bản mẫu.");
                                }
                            }}
                            className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 h-7"
                        >
                            <RefreshCw className="w-3 h-3 mr-2" />
                            Lấy lại Text Gốc (Chương 1)
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={testSample}
                            onChange={(e) => setTestSample(e.target.value)}
                            className="bg-black/20 border-white/5 text-white/70 text-sm h-32 focus:border-purple-500/50 transition-all resize-none"
                            placeholder="Nhập đoạn văn bản muốn test dịch..."
                        />
                    </CardContent>
                </Card>

                <Card className="bg-[#1e1e2e] border-white/5 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            MỤC TIÊU CẦN ĐẠT
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-[11px] text-white/40 italic">
                            * Nhập từ khóa hoặc phong cách bạn muốn (VD: Kiếm hiệp, Hiện đại, Hài hước...) để AI tự tạo prompt.
                        </p>
                        <Textarea
                            value={promptGoals}
                            onChange={(e) => setPromptGoals(e.target.value)}
                            className="bg-black/20 border-white/5 text-white/90 text-sm h-20 focus:border-emerald-500/50 transition-all resize-none"
                            placeholder="Mô tả mục tiêu (VD: Văn phong kiếm hiệp cổ trang, dùng nhiều từ Hán Việt...)"
                        />
                        <div className="flex gap-3">
                            <Button
                                disabled={isGenerating}
                                onClick={handleExtractSpirit}
                                variant="outline"
                                className="flex-1 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30"
                            >
                                <Wand2 className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                                Trích Xuất DNA
                            </Button>
                            <Button
                                disabled={isGenerating}
                                onClick={handleGeneratePrompts}
                                className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                            >
                                <SparklesIcon className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                                Tạo Prompt
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
                    <div className="w-12 h-12 rounded-full bg-[#1e1e2e] border border-white/10 flex items-center justify-center shadow-2xl">
                        <Swords className="w-5 h-5 text-white/20" />
                    </div>
                </div>

                {/* Prompt A */}
                <Card className="bg-[#1e1e2e] border-orange-500/20 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50" />
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-orange-400 text-sm font-black flex items-center gap-2">
                            PROMPT A (Base)
                        </CardTitle>
                        {scoreA && <span className="text-2xl font-black text-orange-500/50 italic">{scoreA}</span>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={promptA}
                            onChange={(e) => setPromptA(e.target.value)}
                            className="bg-black/40 border-white/5 text-white/80 font-mono text-xs h-24"
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-white/30">Kết quả dịch A</span>
                            <Button variant="ghost" size="sm" onClick={() => openSaveDialog("Prompt A - " + new Date().toLocaleTimeString('vi-VN'), promptA)} className="h-6 text-[10px] hover:bg-orange-500/20 hover:text-orange-400">
                                <Save className="w-3 h-3 mr-1" /> Lưu Prompt A
                            </Button>
                        </div>
                        <div className="min-h-[200px] p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-white/90 text-sm italic leading-relaxed">
                            {resultA || (isFighting ? "Đang dịch..." : "Chưa có dữ liệu.")}
                        </div>
                    </CardContent>
                </Card>

                {/* Prompt B */}
                <Card className="bg-[#1e1e2e] border-emerald-500/20 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/50" />
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-emerald-400 text-sm font-black flex items-center gap-2">
                            PROMPT B (Variant)
                        </CardTitle>
                        {scoreB && <span className="text-2xl font-black text-emerald-500/50 italic">{scoreB}</span>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={promptB}
                            onChange={(e) => setPromptB(e.target.value)}
                            className="bg-black/40 border-white/5 text-white/80 font-mono text-xs h-24"
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-white/30">Kết quả dịch B</span>
                            <Button variant="ghost" size="sm" onClick={() => openSaveDialog("Prompt B - " + new Date().toLocaleTimeString('vi-VN'), promptB)} className="h-6 text-[10px] hover:bg-emerald-500/20 hover:text-emerald-400">
                                <Save className="w-3 h-3 mr-1" /> Lưu Prompt B
                            </Button>
                        </div>
                        <div className="min-h-[200px] p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-white/90 text-sm italic leading-relaxed">
                            {resultB || (isFighting ? "Đang dịch..." : "Chưa có dữ liệu.")}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {winner && (
                <div className="animate-in zoom-in-95 duration-500">
                    <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 bg-yellow-500 text-black font-black text-[10px] rounded-b-xl shadow-lg">
                            WINNER
                        </div>
                        <CardContent className="pt-8 pb-6 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center shrink-0 shadow-inner">
                                <Trophy className="w-8 h-8 text-yellow-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">{winner}</h3>
                                <p className="text-white/50 text-sm">{reason}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-[#1e1e2e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Lưu Prompt vào Thư viện</DialogTitle>
                        <DialogDescription className="text-white/40">
                            Đặt tên gợi nhớ cho prompt này để dễ dàng tìm kiếm sau này.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-white/70">
                                Tên
                            </Label>
                            <Input
                                id="name"
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                className="col-span-3 bg-black/20 border-white/10 text-white focus:border-purple-500/50"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsSaveDialogOpen(false)} className="text-white/50 hover:text-white">Hủy</Button>
                        <Button type="submit" onClick={confirmSavePrompt} className="bg-emerald-600 hover:bg-emerald-700 text-white">Lưu Ngay</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

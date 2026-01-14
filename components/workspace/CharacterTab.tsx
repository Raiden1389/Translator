"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DictionaryEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash2, User, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
    { value: "main", label: "Nhân Vật Chính", color: "bg-amber-600" },
    { value: "support", label: "Nhân Vật Phụ", color: "bg-blue-600" },
    { value: "villain", label: "Phản Diện", color: "bg-red-600" },
    { value: "mob", label: "Quần Chúng", color: "bg-slate-600" },
];

const GENDERS = [
    { value: "male", label: "Nam", icon: "♂" },
    { value: "female", label: "Nữ", icon: "♀" },
    { value: "unknown", label: "Chưa rõ", icon: "?" },
];

export function CharacterTab({ workspaceId }: { workspaceId: string }) {
    const dictionary = useLiveQuery(() =>
        db.dictionary.where("type").equals("name").toArray()
    ) || [];

    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [isAdding, setIsAdding] = useState(false);

    // New Character State
    const [newChar, setNewChar] = useState<Partial<DictionaryEntry>>({
        original: "",
        translated: "",
        gender: "male",
        role: "support", // Default to support as main is rare
        description: ""
    });

    const filteredChars = dictionary
        .filter(d => filterRole === "all" || d.role === filterRole)
        .filter(d =>
            d.original.toLowerCase().includes(search.toLowerCase()) ||
            d.translated.toLowerCase().includes(search.toLowerCase())
        );

    const handleAdd = async () => {
        if (!newChar.original || !newChar.translated) return;
        try {
            await db.dictionary.add({
                original: newChar.original,
                translated: newChar.translated,
                type: 'name',
                gender: newChar.gender as any,
                role: newChar.role as any,
                description: newChar.description,
                createdAt: new Date()
            });
            setIsAdding(false);
            setNewChar({ original: "", translated: "", gender: "male", role: "support", description: "" });
        } catch (e) {
            console.error(e);
            alert("Lỗi khi thêm nhân vật");
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Chắc chắn xóa nhân vật này?")) {
            await db.dictionary.delete(id);
        }
    };

    const handleUpdate = async (id: number, updates: Partial<DictionaryEntry>) => {
        await db.dictionary.update(id, updates);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-[#2b2b40] border-white/10 text-white"
                            placeholder="Tìm kiếm nhân vật..."
                        />
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-[150px] bg-[#2b2b40] border-white/10 text-white">
                            <SelectValue placeholder="Tất cả vai trò" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                            <SelectItem value="all">Tất cả vai trò</SelectItem>
                            {ROLES.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    className="bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white"
                    onClick={() => setIsAdding(!isAdding)}
                >
                    <Plus className="mr-2 h-4 w-4" /> Thêm Nhân Vật
                </Button>
            </div>

            {/* Quick Add Form */}
            {isAdding && (
                <div className="bg-[#2d1b4e] p-4 rounded-lg border border-[#6c5ce7]/30 shadow-lg grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-2 space-y-1">
                        <label className="text-xs text-white/50">Tên Gốc</label>
                        <Input
                            value={newChar.original}
                            onChange={e => setNewChar({ ...newChar, original: e.target.value })}
                            className="bg-[#1a0b2e] border-white/10"
                            autoFocus
                        />
                    </div>
                    <div className="col-span-12 md:col-span-3 space-y-1">
                        <label className="text-xs text-white/50">Tên Dịch</label>
                        <Input
                            value={newChar.translated}
                            onChange={e => setNewChar({ ...newChar, translated: e.target.value })}
                            className="bg-[#1a0b2e] border-white/10 font-bold text-emerald-400"
                        />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                        <label className="text-xs text-white/50">Giới tính</label>
                        <Select
                            value={newChar.gender}
                            onValueChange={v => setNewChar({ ...newChar, gender: v as any })}
                        >
                            <SelectTrigger className="bg-[#1a0b2e] border-white/10"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                        <label className="text-xs text-white/50">Vai trò</label>
                        <Select
                            value={newChar.role}
                            onValueChange={v => setNewChar({ ...newChar, role: v as any })}
                        >
                            <SelectTrigger className="bg-[#1a0b2e] border-white/10"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-12 md:col-span-3 flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs text-white/50">Mô tả (VD: Tự xưng ta...)</label>
                            <Input
                                value={newChar.description}
                                onChange={e => setNewChar({ ...newChar, description: e.target.value })}
                                className="bg-[#1a0b2e] border-white/10 text-xs"
                            />
                        </div>
                        <Button className="bg-[#6c5ce7] mb-[2px]" size="icon" onClick={handleAdd}><Save className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border border-white/10 bg-[#1e1e2e] overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-[#2b2b40]/50 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-2">Tên Gốc</div>
                    <div className="col-span-3">Tên Dịch</div>
                    <div className="col-span-2">Giới Tính</div>
                    <div className="col-span-2">Vai Trò</div>
                    <div className="col-span-2 text-right">Mô Tả / Action</div>
                </div>

                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {filteredChars.length === 0 ? (
                        <div className="p-8 text-center text-white/20 italic">
                            Chưa có nhân vật nào.
                        </div>
                    ) : (
                        filteredChars.map((char, index) => {
                            const roleInfo = ROLES.find(r => r.value === char.role) || ROLES[3];
                            const genderInfo = GENDERS.find(g => g.value === char.gender) || GENDERS[2];

                            return (
                                <div key={char.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                                    <div className="col-span-1 text-center text-white/30 text-xs font-mono">{filteredChars.length - index}</div>
                                    <div className="col-span-2 text-white/90 font-serif select-all">{char.original}</div>
                                    <div className="col-span-3 text-emerald-400 font-bold select-all">{char.translated}</div>
                                    <div className="col-span-2">
                                        <Select
                                            value={char.gender || 'unknown'}
                                            onValueChange={v => handleUpdate(char.id!, { gender: v as any })}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-[100px] border-white/5 bg-white/5 text-white/70">
                                                <span>{genderInfo.icon} {genderInfo.label}</span>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                                {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2">
                                        <Select
                                            value={char.role || 'mob'}
                                            onValueChange={v => handleUpdate(char.id!, { role: v as any })}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-[130px] border-white/5 bg-white/5 text-white/70">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${roleInfo.color}`} />
                                                    <span>{roleInfo.label}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end gap-2">
                                        <Input
                                            className="h-7 text-xs bg-transparent border-transparent hover:border-white/10 focus:border-white/30 text-right text-white/50 focus:text-white"
                                            placeholder="Mô tả..."
                                            value={char.description || ""}
                                            onChange={e => handleUpdate(char.id!, { description: e.target.value })}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDelete(char.id!)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

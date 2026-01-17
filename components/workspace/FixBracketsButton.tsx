"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { fixAllBrackets } from "@/lib/fix-brackets";

export function FixBracketsButton({ workspaceId }: { workspaceId: string }) {
    const [isFixing, setIsFixing] = useState(false);

    const handleFix = async () => {
        if (!confirm("Sửa lỗi ngoặc cho TẤT CẢ chương đã dịch? (Không thể hoàn tác)")) {
            return;
        }

        setIsFixing(true);
        try {
            const result = await fixAllBrackets(workspaceId);
            toast.success(`Đã sửa ${result.fixed}/${result.total} chương!`);
        } catch (error: any) {
            toast.error("Lỗi: " + error.message);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <Button
            onClick={handleFix}
            disabled={isFixing}
            variant="outline"
            size="sm"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        >
            <Wand2 className="mr-2 h-4 w-4" />
            {isFixing ? "Đang sửa..." : "Sửa lỗi ngoặc (Tất cả)"}
        </Button>
    );
}

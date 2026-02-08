import React from "react";
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
import { Button } from "@/components/ui/button";

interface SavePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveName: string;
  onSaveNameChange: (value: string) => void;
  onConfirm: () => void;
}

export function SavePromptDialog({
  open,
  onOpenChange,
  saveName,
  onSaveNameChange,
  onConfirm
}: SavePromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-popover border-border text-popover-foreground">
        <DialogHeader>
          <DialogTitle>Lưu Prompt vào Thư viện</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Đặt tên gợi nhớ cho prompt này để dễ dàng tìm kiếm sau này.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-muted-foreground">
              Tên
            </Label>
            <Input
              id="name"
              value={saveName}
              onChange={(e) => onSaveNameChange(e.target.value)}
              className="col-span-3 bg-background border-border text-foreground focus:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={onConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Lưu Ngay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

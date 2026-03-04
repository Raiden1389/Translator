import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Zap, ChevronRight, ChevronDown, Save } from "lucide-react";
import type { TranslationConfig } from "./hooks/useTranslateConfig";

// =============================================================================
// SHARED PROPS
// =============================================================================

interface ConfigSectionProps {
  config: TranslationConfig;
  onUpdate: (field: keyof TranslationConfig, value: TranslationConfig[keyof TranslationConfig]) => void;
  onUpdateMultiple: (updates: Partial<TranslationConfig>) => void;
}

// =============================================================================
// CONCURRENCY
// =============================================================================

export function ConcurrencySection({ config, onUpdate }: ConfigSectionProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          Tốc độ (Luồng song song)
        </Label>
        <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{config.maxConcurrency}x</span>
      </div>
      <Slider
        value={[config.maxConcurrency]}
        min={1}
        max={20}
        step={1}
        onValueChange={(val: number[]) => onUpdate("maxConcurrency", val[0])}
        className="py-1"
      />
      <p className="text-xs text-muted-foreground/70 italic font-medium">Chỉnh quá cao có thể bị AI từ chối do quá tải (Rate Limit).</p>
    </div>
  );
}

// =============================================================================
// TEMPERATURE
// =============================================================================

export function TemperatureSection({ config, onUpdate }: ConfigSectionProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold flex items-center gap-2">
          🎨 Creativity (Temperature)
        </Label>
        <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{config.temperature.toFixed(1)}</span>
      </div>
      <Slider
        value={[config.temperature]}
        min={0}
        max={1}
        step={0.1}
        onValueChange={(val: number[]) => onUpdate("temperature", val[0])}
        className="py-1"
      />
      <p className="text-xs text-muted-foreground/70 italic font-medium">
        <span className="font-bold">0.0-0.2:</span> Nhất quán, ít sáng tạo.
        <span className="font-bold ml-2">0.3-0.5:</span> Cân bằng.
        <span className="font-bold ml-2">0.6-1.0:</span> Sáng tạo, đa dạng.
      </p>
    </div>
  );
}

// =============================================================================
// THINKING
// =============================================================================

export function ThinkingSection({ config, onUpdate, model }: ConfigSectionProps & { model: string }) {
  if (model.includes('gemini-3')) {
    return (
      <div className="space-y-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
        <div className="space-y-1">
          <Label className="text-sm font-bold flex items-center gap-2">
            🧠 Thinking Level <span className="text-xs font-normal text-primary">(Gemini 3.0)</span>
          </Label>
          <p className="text-xs text-muted-foreground/70 font-medium">
            Control AI reasoning depth - Higher = Smarter but slower & more expensive
          </p>
        </div>
        <select
          value={config.thinkingLevel}
          onChange={(e) => onUpdate("thinkingLevel", e.target.value as TranslationConfig["thinkingLevel"])}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="minimal">⚡ Minimal - Fastest, Cheapest (~$0.0035/chapter)</option>
          <option value="low">🔹 Low - Simple tasks (~$0.0040/chapter)</option>
          <option value="medium">⭐ Medium (Recommended) - Balanced (~$0.0050/chapter)</option>
          <option value="high">🔥 High - Complex reasoning (~$0.0070/chapter)</option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-xl border border-accent/20">
      <div className="space-y-0.5">
        <Label className="text-sm font-bold flex items-center gap-2">
          🧠 Thinking Mode <span className="text-xs font-normal text-accent">(Gemini 2.5)</span>
        </Label>
        <p className="text-xs text-muted-foreground/70 font-medium">
          Deep reasoning mode - <span className="font-bold text-accent">costs 5.8x more</span> ($3.50 vs $0.60 per 1M tokens)
        </p>
      </div>
      <Switch
        checked={config.enableThinking || false}
        onCheckedChange={(val: boolean) => onUpdate("enableThinking", val)}
      />
    </div>
  );
}

// =============================================================================
// PROMPT
// =============================================================================

interface PromptSectionProps extends ConfigSectionProps {
  expanded: boolean;
  onToggleExpand: () => void;
  savedPrompts: { id?: number; title: string; content: string }[];
  dropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSavePrompt: () => void;
}

export function PromptSection({
  config, onUpdate,
  expanded, onToggleExpand,
  savedPrompts, dropdownOpen, onToggleDropdown, onSavePrompt
}: PromptSectionProps) {
  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <Label className="text-sm font-bold cursor-pointer">Prompt Tùy Chỉnh</Label>
        <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="outline" size="sm" className="h-8 text-xs bg-background border-border w-[220px] justify-between font-medium" onClick={onToggleDropdown}>
                  <span className="truncate pr-2">
                    {config.customPrompt ? "Đang dùng prompt tùy chỉnh" : "Chọn mẫu prompt..."}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
                {dropdownOpen && (
                  <div className="absolute top-9 right-0 w-full z-10 bg-card border border-border rounded-lg shadow-xl py-1 max-h-[220px] overflow-y-auto">
                    {savedPrompts.map(p => (
                      <button key={p.id} className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted font-medium truncate" onClick={() => {
                        onUpdate("customPrompt", p.content);
                        onToggleDropdown();
                      }}>
                        {p.title}
                      </button>
                    ))}
                    {savedPrompts.length === 0 && <div className="px-4 py-3 text-[10px] text-muted-foreground text-center font-medium">Chưa có mẫu nào được lưu</div>}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" title="Lưu mẫu" onClick={onSavePrompt}><Save className="h-4 w-4" /></Button>
            </div>
          </div>
          <Textarea
            className="bg-muted/10 border-border text-foreground text-sm min-h-[140px] focus:ring-1 focus:ring-primary leading-relaxed"
            placeholder="Mô tả phong cách dịch, các ngôi xưng hô, văn phong kiếm hiệp/tiên hiệp..."
            value={config.customPrompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate("customPrompt", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CHUNKING
// =============================================================================

export function ChunkingSection({ config, onUpdate }: ConfigSectionProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold">Parallel Chunking (Nhanh hơn ~40%)</Label>
          <p className="text-xs text-muted-foreground/70 font-medium">Chia chapter thành chunks nhỏ và dịch song song</p>
        </div>
        <Switch
          checked={config.enableChunking}
          onCheckedChange={(val: boolean) => onUpdate("enableChunking", val)}
        />
      </div>

      {config.enableChunking && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Số chunks song song</Label>
            <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{config.maxConcurrentChunks || 3}</span>
          </div>
          <Slider
            value={[config.maxConcurrentChunks || 3]}
            min={2}
            max={10}
            step={1}
            onValueChange={(val: number[]) => onUpdate("maxConcurrentChunks", val[0])}
            className="py-1"
          />
          <p className="text-xs text-muted-foreground/70 italic font-medium">Tier 1 API: Khuyến nghị 3-5 chunks. Quá cao có thể bị rate limit.</p>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Kích thước Chunk (ký tự)</Label>
              <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-md">{config.chunkSize || 800}</span>
            </div>
            <Slider
              value={[config.chunkSize || 800]}
              min={500}
              max={4000}
              step={100}
              onValueChange={(val: number[]) => onUpdate("chunkSize", val[0])}
              className="py-1"
            />
            <p className="text-xs text-muted-foreground/70 italic font-medium">Lag mạng: Hãy dùng chunk to (2000+). Mạng nhanh: Dùng chunk nhỏ (800-1200).</p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BATCH
// =============================================================================

export function BatchSection({ config, onUpdateMultiple, selectedCount }: ConfigSectionProps & { selectedCount: number }) {
  return (
    <div className="space-y-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold flex items-center gap-2">
            ⚡ Batch Translation (Dịch Gộp)
          </Label>
          <p className="text-xs text-muted-foreground/70 font-medium">Gộp nhiều chapters vào 1 lần dịch - Tiết kiệm 66% chi phí & nhanh hơn 53%</p>
        </div>
        <Switch
          checked={config.enableBatch}
          onCheckedChange={(val: boolean) => {
            if (val) {
              onUpdateMultiple({ enableBatch: true, enableChunking: true, chunkSize: 2500, maxConcurrentChunks: 5 });
            } else {
              onUpdateMultiple({ enableBatch: false, chunkSize: 800 });
            }
          }}
        />
      </div>

      {config.enableBatch && (
        <div className="space-y-3 pt-2 border-t border-primary/20">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Số chương gộp</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={2}
                max={5}
                value={config.batchSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = Math.max(2, Math.min(5, Number(e.target.value)));
                  onUpdateMultiple({ batchSize: val });
                }}
                className="w-24 text-center font-bold"
              />
              <span className="text-xs text-muted-foreground">chapters/batch (2-5)</span>
            </div>
            <p className="text-xs text-muted-foreground/70 italic">Recommended: 3 chapters (empirical sweet spot)</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Giới hạn ký tự/batch</Label>
            <Input
              type="number"
              min={10000}
              max={100000}
              step={5000}
              value={config.maxCharsPerBatch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateMultiple({ maxCharsPerBatch: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground/70 italic">Recommended: 25,000 chars (quality sweet spot)</p>
          </div>

          <div className="p-3 bg-secondary/30 rounded-lg border border-primary/20 space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wide">Tiết kiệm dự kiến ({selectedCount} chapters)</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-mono font-bold text-primary">
                  ${(selectedCount * 0.0075).toFixed(2)} → ${(Math.ceil(selectedCount / config.batchSize) * 0.0025).toFixed(2)} (-66%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-mono font-bold text-primary">
                  {Math.ceil(selectedCount * 10 / 60)}min → {Math.ceil(Math.ceil(selectedCount / config.batchSize) * 14 / 60)}min (-53%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API calls:</span>
                <span className="font-mono font-bold text-primary">
                  {selectedCount * 5} → {Math.ceil(selectedCount / config.batchSize) * 5} (-66%)
                </span>
              </div>
            </div>
          </div>

          {config.maxCharsPerBatch > 50000 && (
            <div className="p-2 bg-amber-500/20 rounded border border-amber-500/40 text-xs text-amber-600 font-medium">
              ⚠️ Batch quá lớn (&gt;50K chars) có thể giảm chất lượng dịch
            </div>
          )}
        </div>
      )}
    </div>
  );
}

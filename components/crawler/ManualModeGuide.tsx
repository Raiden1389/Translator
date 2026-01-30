import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Copy, CheckCircle2 } from 'lucide-react';

interface ManualModeGuideProps {
    url: string;
    onParse: (html: string, forceAI?: boolean) => void;
}

export function ManualModeGuide({ url, onParse }: ManualModeGuideProps) {
    const [html, setHtml] = React.useState('');
    const [step, setStep] = React.useState(1);

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setHtml(text);
            setStep(3);
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };


    return (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        📖 Hướng dẫn lấy dữ liệu thủ công
                    </h3>

                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                        <div className={`flex items-start gap-2 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                            </div>
                            <div>
                                <p className="font-medium">Mở trang web trong browser</p>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                >
                                    {url}
                                </a>
                            </div>
                        </div>

                        <div className={`flex items-start gap-2 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                            </div>
                            <div className="space-y-2">
                                <p className="font-medium">Copy toàn bộ HTML của trang</p>
                                <div className="bg-white dark:bg-gray-800 p-3 rounded border space-y-1 text-xs font-mono">
                                    <p>• Nhấn <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">F12</kbd> để mở DevTools</p>
                                    <p>• Chuyển sang tab <strong>Elements</strong></p>
                                    <p>• Click chuột phải vào <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;html&gt;</code> (dòng đầu tiên)</p>
                                    <p>• Chọn <strong>Copy → Copy outerHTML</strong></p>
                                </div>
                                <Button
                                    onClick={() => setStep(2)}
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                >
                                    Đã copy xong
                                </Button>
                            </div>
                        </div>

                        <div className={`flex items-start gap-2 ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                3
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="font-medium">Paste HTML vào đây</p>
                                <Textarea
                                    value={html}
                                    onChange={(e) => setHtml(e.target.value)}
                                    placeholder="Paste HTML ở đây... (Ctrl+V)"
                                    className="min-h-[100px] font-mono text-xs"
                                    disabled={step < 2}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handlePaste}
                                        variant="outline"
                                        size="sm"
                                        disabled={step < 2}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Paste từ Clipboard
                                    </Button>
                                    <Button
                                        onClick={() => html.trim() && onParse(html, true)}
                                        disabled={!html.trim()}
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-6"
                                    >
                                        ✨ Dùng AI Phân Tích
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

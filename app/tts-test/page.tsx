"use client";

import React from "react";
import { TTSPlayer } from "@/components/reader/TTSPlayer";

export default function TTSTestPage() {
    const sampleText = `
Chương 1: Cảm ơn bạn đọc đã theo dõi truyện dịch của tôi.

Đêm nay, trăng sáng như ban ngày. Gió thổi nhẹ nhàng qua khe cửa sổ, mang theo hương thơm của hoa sen. 
Trong căn phòng tĩnh lặng, chỉ còn tiếng thở đều đặn của người đang ngủ say.

Đột nhiên, một tiếng động vang lên từ ngoài sân. Bóng người nhanh như chớp lướt qua, để lại dấu vết mờ nhạt trên mặt đất.
Đó là ai? Tại sao lại xuất hiện vào lúc này?

Câu chuyện bắt đầu từ đây...
    `.trim();

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white">TTS Player Test</h1>
                    <p className="text-white/50">Music Player Style với Cover Art</p>
                </div>

                {/* TTS Player */}
                <TTSPlayer
                    text={sampleText}
                    chapterTitle="Chương 1: Khởi đầu hành trình"
                    workspaceTitle="Huyền Huyễn Cao Cấp"
                    hasNext={true}
                    hasPrevious={false}
                    onNext={() => alert("Chuyển sang chương 2")}
                />

                {/* Sample Text Display */}
                <div className="bg-[#1e1e2e] border border-white/10 rounded-xl p-6">
                    <h2 className="text-white font-semibold mb-4">Nội dung mẫu:</h2>
                    <div className="text-white/80 leading-relaxed whitespace-pre-wrap font-serif text-sm">
                        {sampleText}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">Tính năng:</h3>
                    <ul className="text-blue-300/80 text-sm space-y-1 list-disc list-inside">
                        <li>✅ Cover art với animation khi đang phát</li>
                        <li>✅ Hiển thị tên chương và tên truyện</li>
                        <li>✅ Nút Previous/Next (auto-next khi hết chương)</li>
                        <li>✅ Play/Pause/Stop controls</li>
                        <li>✅ Chọn giọng đọc và tốc độ</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

---
description: 🚀 Automate Commit, Build, Version Bump & Push
---

# /release - Production Release Workflow

Quy trình này đảm bảo việc đẩy code lên production một cách an toàn và có kiểm soát.

## Phase 1: Prepare & Commit
1. Kiểm tra `git status`. Đảm bảo không có các file rác (build artifacts, logs, temp files) bị lọt vào staging area.
// turbo
2. Chỉ thực hiện `git add .` sau khi đã xác minh tính sạch sẽ của workspace.
3. Tự động tạo **Conventional Commit message** mô tả tập trung vào các thay đổi mà người dùng có thể nhận thấy được.
// turbo
4. Thực hiện commit: `git commit -m "[message]"`.

## Phase 2: Check & Build
// turbo
1. Chạy lệnh `npm run build`.
   - ⚠️ Nếu build thất bại, **DỪNG LẠI NGAY LẬP TỨC** và báo cáo lỗi cho người dùng.

## Phase 3: Versioning
1. Sử dụng `npm version patch` **CHỈ DÀNH CHO** các bugfix có tương thích ngược.
   - ⚠️ Nếu có tính năng mới hoặc thay đổi lớn, hỏi ý kiến người dùng để bump minor/major.
// turbo
2. Đồng bộ version sang Tauri: 
   Cập nhật field `"version"` trong `src-tauri/tauri.conf.json` để khớp với `package.json`.
// turbo
3. Đẩy code và tags lên server bằng lệnh:
   `git push origin --tags` 

## Phase 4: Desktop Packaging (Portable)
1. Sau khi đẩy thành công, hỏi người dùng:
   "Bạn có muốn build bản Desktop (.exe portable) không?"
2. Nếu có, chạy lệnh: **`npm run f9`** (Lệnh này sử dụng script siêu nhanh).
3. Lưu ý: File portable sẽ nằm tại `src-tauri/target/release/raiden-ai-translator.exe`.
   (Đã cấu hình `targets: []` trong `tauri.conf.json` để bỏ qua bộ cài MSI/NSIS cồng kềnh).

## Next Steps
- /test
- /deploy
- /recap

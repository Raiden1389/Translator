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
1. Sử dụng `npm version patch` **CHỈ DÀNH CHO** các bugfix có tính tương thích ngược.
   - ⚠️ Nếu thay đổi có ảnh hưởng đến hành vi (behavior) hoặc trải nghiệm người dùng (UX), **DỪNG LẠI** và hỏi ý kiến người dùng trước khi quyết định bump version (patch/minor/major).
// turbo
2. Đẩy code và tags lên server bằng lệnh:
   `git push origin --tags` 
   *(Tự động phát hiện current branch)*

## Phase 4: Desktop Packaging (Tauri)
1. Sau khi đẩy thành công, hãy hỏi người dùng:
   "Code đã được đẩy lên an toàn. Bạn có muốn chạy **`npm run tauri build`** ngay bây giờ không?"

## Next Steps
- /test
- /deploy
- /recap

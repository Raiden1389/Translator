# Hướng dẫn Khôi phục (Fallback)

Nếu mày làm hỏng code và muốn quay về bản ổn định, hãy làm theo các bước sau:

## 1. Xem danh sách các bản lưu (Tags)
Gõ lệnh này vào terminal:
```powershell
git tag
```
Nó sẽ hiện ra danh sách các tag, ví dụ: `v1.0-gdrive-stable`.

## 2. Quay về bản ổn định
Gõ lệnh này (thay `[tên-tag]` bằng tên mày vừa thấy):
```powershell
git checkout [tên-tag]
```
Ví dụ: `git checkout v1.0-gdrive-stable`

## 3. Xem lịch sử các lần lưu
Nếu muốn xem chi tiết từng lần lưu (commit):
```powershell
git log --oneline
```

---
*Lưu ý: Khi quay về tag, mày sẽ ở chế độ "detached HEAD". Nếu muốn sửa tiếp từ đó, hãy tạo branch mới: `git checkout -b feature-moi`*

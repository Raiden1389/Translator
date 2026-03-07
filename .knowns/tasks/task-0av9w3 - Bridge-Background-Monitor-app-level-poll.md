---
id: 0av9w3
title: 'Bridge: Background Monitor (app-level poll)'
status: todo
priority: high
labels:
  - bridge
  - infrastructure
  - sprint-3
createdAt: '2026-03-07T15:33:06.214Z'
updatedAt: '2026-03-07T15:33:06.214Z'
timeSpent: 0
---
# Bridge: Background Monitor (app-level poll)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor poll effect ra khỏi Dialog dependency. Khi app mở, luôn có monitor nhẹ detect outbox mới hoặc done file → UI update ngay mà không cần giữ Dialog mở. Bước nền tảng cho always-on Bridge.
<!-- SECTION:DESCRIPTION:END -->


---
name: awf-session-restore
description: >-
  Auto-restore context on session start. Keywords: context, memory, session,
  restore, recap, remember, resume, continue, comeback, return.
  Activates as pre-hook for ALL AWF workflows to show brief session summary.
version: 1.0.0
---

# AWF Session Restore

Auto-restore context khi user quay lại sau thời gian vắng mặt.

## Trigger Conditions

**Pre-hook for ALL workflows** - Activates before any AWF command:
- `/plan`, `/code`, `/brainstorm`, `/debug`, `/test`, etc.

**Keywords in user message:**
- "quay lại", "tiếp tục", "đang làm gì", "làm dở"
- "comeback", "continue", "resume", "what was I doing"

## Execution Logic

### Step 1: Check Session File

```
if exists(".brain/session.json"):
    → Parse JSON
    → Continue to Step 2
else:
    → Show: "Chưa có session. Bắt đầu mới nhé!"
    → Skip to workflow execution
```

### Step 2: Generate Brief Summary

Extract from session.json và show indicator:

```
🔄 Restoring session...

📍 **Đang làm:** {working_on.feature}
   └─ Task: {working_on.task}
   └─ Status: {working_on.status}

⏭️ **Pending:** {pending_tasks.length} tasks
   └─ Tiếp theo: {pending_tasks[0].task}

🕐 **Last saved:** {updated_at}
```

### Step 3: Continue to Workflow

After summary display (< 3 seconds):
- Pass context to main workflow
- Workflow executes with restored context

## Performance Requirements

- Load time: < 500ms
- Summary display: < 3 seconds total
- File read: Single JSON parse

## Error Handling

```
If session.json corrupted:
→ "Session file bị lỗi. Bắt đầu fresh nhé!"
→ Skip session restore, continue workflow

If session.json empty:
→ "Chưa có gì trong session. Bắt đầu mới!"
→ Skip session restore, continue workflow
```

## Example Output

```
🔄 Restoring session...

📍 **Đang làm:** User Authentication
   └─ Task: Implement login endpoint
   └─ Status: in_progress

⏭️ **Pending:** 3 tasks
   └─ Tiếp theo: Add password validation

🕐 **Last saved:** 2 hours ago

─────────────────────────────
✅ Context restored. Tiếp tục workflow...
```

## Integration

Skill này được gọi tự động bởi tất cả AWF workflows.
User KHÔNG cần gọi trực tiếp.

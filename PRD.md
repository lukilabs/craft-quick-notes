# Craft Quick Notes - PRD

## Overview
A Raycast extension for quickly adding notes and tasks to Craft daily notes without context-switching.

## Problem
Adding quick notes or tasks to Craft requires opening the app, navigating to the right day, and typing. This friction slows down quick capture of thoughts, tasks, and reminders.

## Solution
Three Raycast commands that interact with Craft's Daily Notes API for fast capture and task visibility.

---

## Commands

### 1. Quick Add Note
**Command name:** `add-note`  
**Mode:** Form view (UI)

**Functionality:**
- Text input field for the note content
- Dropdown to select destination: Today / Tomorrow / Inbox
- Submits via `POST /blocks` endpoint
- Shows success toast with confirmation

**API Integration:**
```
POST /blocks
Content-Type: application/json

{
  "blocks": [{ "type": "text", "markdown": "<user input>" }],
  "position": { "position": "end", "date": "today|tomorrow" }
}
```
For inbox: Use `POST /tasks` with `location: { type: "inbox" }`

---

### 2. Quick Add Task
**Command name:** `add-task`  
**Mode:** Form view (UI)

**Functionality:**
- Text input field for task description
- Dropdown to select destination: Today / Tomorrow / Inbox
- Submits via `POST /tasks` endpoint
- Shows success toast with confirmation

**API Integration:**
```
POST /tasks
Content-Type: application/json

{
  "tasks": [{
    "markdown": "<user input>",
    "taskInfo": { "scheduleDate": "today|tomorrow" },
    "location": { "type": "dailyNote|inbox" }
  }]
}
```

---

### 3. List Active Tasks
**Command name:** `list-tasks`  
**Mode:** List view (UI)

**Functionality:**
- Fetches active tasks via `GET /tasks?scope=active`
- Displays as Raycast list with task text and schedule date
- Action: Mark as done (via `PUT /tasks`)
- Action: Open in Craft (if possible via deep link)

**API Integration:**
```
GET /tasks?scope=active

PUT /tasks (to mark complete)
{
  "tasksToUpdate": [{ "id": "<taskId>", "taskInfo": { "state": "done" } }]
}
```

---

## Configuration

### Preferences (stored securely via Raycast API)

| Preference | Type | Required | Description |
|------------|------|----------|-------------|
| `apiUrl` | string | Yes | Craft Daily Notes API base URL (e.g., `https://connect.craft.do/links/xxx/api/v1`) |
| `apiKey` | password | No | API key for authenticated endpoints (sent as `Authorization: Bearer <key>`) |

**Storage:** Use Raycast's `LocalStorage` or preferences API with password type for secure storage.

### Connection Validation

When user saves configuration, perform validation:

1. **URL Validation**
   - Must be a valid URL format
   - Must start with `https://`
   - Should match pattern `https://connect.craft.do/links/*/api/v1` (warn if not, but allow)

2. **Connection Check**
   - Call `GET /blocks?date=today` to test connectivity
   - **Success (200):** Show "Connected successfully" toast
   - **401 Unauthorized:** Prompt user that API key is required
   - **403 Forbidden:** API key invalid or expired
   - **404 / Network error:** Invalid URL or server unreachable

3. **UI Feedback**
   - Show connection status indicator in preferences
   - Clear error messages explaining what's wrong and how to fix

---

## Technical Notes

- **No-auth mode:** Works with shareable API URLs (for testing)
- **Auth mode:** Sends `Authorization: Bearer <apiKey>` header when configured
- **Error handling:** Toast notifications for API errors
- **Relative dates:** Use `today`, `tomorrow` strings directly (API supports them)

---

## Out of Scope (v1)
- Viewing/editing existing notes
- Task scheduling beyond today/tomorrow
- Collections support
- Search functionality
- Block formatting (headings, bullets) - just plain text

---

## Success Criteria
- Can add a note to today's daily note in < 3 seconds
- Can add a task to inbox in < 3 seconds  
- Can view and complete active tasks without opening Craft

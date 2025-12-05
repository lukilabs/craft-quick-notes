import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  apiUrl: string;
  apiKey?: string;
}

interface TaskInfo {
  state: "todo" | "done" | "canceled";
  scheduleDate?: string;
  deadlineDate?: string;
  completedAt?: string;
  canceledAt?: string;
}

interface TaskLocation {
  type: "inbox" | "dailyNote" | "document";
  date?: string;
  title?: string;
}

export interface Task {
  id: string;
  markdown: string;
  taskInfo: TaskInfo;
  location: TaskLocation;
}

interface TasksResponse {
  items: Task[];
}

interface ConnectionCheckResult {
  success: boolean;
  requiresAuth: boolean;
  error?: string;
}

function getHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function validateApiUrl(url: string): { valid: boolean; warning?: string; error?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTPS" };
    }
    if (!url.match(/^https:\/\/connect\.craft\.do\/links\/[^/]+\/api\/v1\/?$/)) {
      return { valid: true, warning: "URL doesn't match expected Craft API pattern" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

export async function checkConnection(): Promise<ConnectionCheckResult> {
  const { apiUrl, apiKey } = getPrefs();

  const validation = validateApiUrl(apiUrl);
  if (!validation.valid) {
    return { success: false, requiresAuth: false, error: validation.error };
  }

  try {
    // Try without auth first if no key provided
    const response = await fetch(`${apiUrl}/blocks?date=today`, {
      headers: getHeaders(apiKey),
    });

    if (response.ok) {
      return { success: true, requiresAuth: false };
    }

    if (response.status === 401) {
      return { success: false, requiresAuth: true, error: "API key required" };
    }

    if (response.status === 403) {
      return { success: false, requiresAuth: true, error: "Invalid or expired API key" };
    }

    return { success: false, requiresAuth: false, error: `API error: ${response.status}` };
  } catch (error) {
    return {
      success: false,
      requiresAuth: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function addNote(text: string, destination: "today" | "tomorrow"): Promise<void> {
  const { apiUrl, apiKey } = getPrefs();

  const response = await fetch(`${apiUrl}/blocks`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      blocks: [{ type: "text", markdown: text }],
      position: { position: "end", date: destination },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add note: ${response.status} ${errorText}`);
  }
}

export async function addNoteToInbox(text: string): Promise<void> {
  // For inbox, we create a task without task checkbox styling
  const { apiUrl, apiKey } = getPrefs();

  const response = await fetch(`${apiUrl}/blocks`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      blocks: [{ type: "text", markdown: text }],
      position: { position: "end", date: "today" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add note: ${response.status} ${errorText}`);
  }
}

export async function addTask(text: string, destination: "today" | "tomorrow" | "inbox"): Promise<void> {
  const { apiUrl, apiKey } = getPrefs();

  const taskData: {
    markdown: string;
    taskInfo?: { scheduleDate: string };
    location: { type: string; date?: string };
  } = {
    markdown: text,
    location: destination === "inbox" ? { type: "inbox" } : { type: "dailyNote", date: destination },
  };

  if (destination !== "inbox") {
    taskData.taskInfo = { scheduleDate: destination };
  }

  const response = await fetch(`${apiUrl}/tasks`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({ tasks: [taskData] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add task: ${response.status} ${errorText}`);
  }
}

export async function getActiveTasks(): Promise<Task[]> {
  const { apiUrl, apiKey } = getPrefs();

  const response = await fetch(`${apiUrl}/tasks?scope=active`, {
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch tasks: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as TasksResponse;
  return data.items;
}

export async function completeTask(taskId: string): Promise<void> {
  const { apiUrl, apiKey } = getPrefs();

  const response = await fetch(`${apiUrl}/tasks`, {
    method: "PUT",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      tasksToUpdate: [{ id: taskId, taskInfo: { state: "done" } }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to complete task: ${response.status} ${errorText}`);
  }
}

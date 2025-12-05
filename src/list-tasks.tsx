import {
  Action,
  ActionPanel,
  List,
  Detail,
  showToast,
  Toast,
  Icon,
  Color,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getActiveTasks, completeTask, checkConnection, Task } from "./api";

function cleanTaskMarkdown(markdown: string): string {
  // Remove checkbox syntax and clean up the text
  return markdown
    .replace(/^-?\s*\[[ x]\]\s*/i, "")
    .replace(/<[^>]+>/g, "") // Remove HTML tags like <callout>
    .replace(/\*\*/g, "") // Remove bold markers
    .trim();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === tomorrow.toISOString().split("T")[0]) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLocationLabel(task: Task): string {
  if (task.location.type === "inbox") {
    return "Inbox";
  }
  if (task.location.type === "dailyNote" && task.location.date) {
    return formatDate(task.location.date);
  }
  if (task.location.type === "document" && task.location.title) {
    return task.location.title;
  }
  return "Unknown";
}

export default function ListTasksCommand() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeTasks = await getActiveTasks();
      setTasks(activeTasks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const result = await checkConnection();
      if (!result.success) {
        setConnectionError(result.error || "Connection failed");
        setNeedsApiKey(result.requiresAuth);
        setIsLoading(false);
        return;
      }
      fetchTasks();
    }
    init();
  }, [fetchTasks]);

  async function handleComplete(task: Task) {
    try {
      await completeTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
        message: cleanTaskMarkdown(task.markdown),
      });
      // Remove from list
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (connectionError) {
    const message = needsApiKey
      ? `## Connection Failed\n\n${connectionError}\n\nThis API link requires an API key. Please add it in the extension settings.`
      : `## Connection Failed\n\n${connectionError}\n\nPlease check your Daily Notes API URL in the extension settings.`;

    return (
      <Detail
        markdown={message}
        actions={
          <ActionPanel>
            <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView title="No active tasks" description="All caught up!" icon={Icon.CheckCircle} />
      ) : (
        tasks.map((task) => (
          <List.Item
            key={task.id}
            title={cleanTaskMarkdown(task.markdown)}
            subtitle={getLocationLabel(task)}
            accessories={[
              task.taskInfo.scheduleDate
                ? { tag: { value: formatDate(task.taskInfo.scheduleDate), color: Color.Blue } }
                : {},
              task.taskInfo.deadlineDate
                ? { tag: { value: `Due: ${formatDate(task.taskInfo.deadlineDate)}`, color: Color.Red } }
                : {},
            ].filter((a) => Object.keys(a).length > 0)}
            actions={
              <ActionPanel>
                <Action title="Mark as Done" icon={Icon.CheckCircle} onAction={() => handleComplete(task)} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchTasks} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

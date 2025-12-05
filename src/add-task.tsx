import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addTask } from "./api";

type Destination = "today" | "tomorrow" | "inbox";

export default function AddTaskCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [destination, setDestination] = useState<Destination>("today");

  async function handleSubmit() {
    if (!taskText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Task cannot be empty" });
      return;
    }

    setIsLoading(true);
    try {
      await addTask(taskText.trim(), destination);
      const locationLabel = destination === "inbox" ? "inbox" : `${destination}'s daily note`;
      await showToast({
        style: Toast.Style.Success,
        title: "Task added",
        message: `Added to ${locationLabel}`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="task"
        title="Task"
        placeholder="Enter your task..."
        value={taskText}
        onChange={setTaskText}
        autoFocus
      />
      <Form.Dropdown
        id="destination"
        title="Add to"
        value={destination}
        onChange={(value) => setDestination(value as Destination)}
      >
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="tomorrow" title="Tomorrow" />
        <Form.Dropdown.Item value="inbox" title="Inbox" />
      </Form.Dropdown>
    </Form>
  );
}

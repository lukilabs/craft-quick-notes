import { Action, ActionPanel, Detail, Form, showToast, Toast, popToRoot, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { addNote, checkConnection } from "./api";

type Destination = "today" | "tomorrow";

export default function AddNoteCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [destination, setDestination] = useState<Destination>("today");

  useEffect(() => {
    async function verifyConnection() {
      const result = await checkConnection();
      if (!result.success) {
        setConnectionError(result.error || "Connection failed");
        setNeedsApiKey(result.requiresAuth);
      }
      setIsLoading(false);
    }
    verifyConnection();
  }, []);

  async function handleSubmit() {
    if (!noteText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Note cannot be empty" });
      return;
    }

    setIsLoading(true);
    try {
      await addNote(noteText.trim(), destination);
      await showToast({
        style: Toast.Style.Success,
        title: "Note added",
        message: `Added to ${destination}'s daily note`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
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
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Enter your note..."
        value={noteText}
        onChange={setNoteText}
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
      </Form.Dropdown>
    </Form>
  );
}

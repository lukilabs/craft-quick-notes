import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addNote } from "./api";

type Destination = "today" | "tomorrow";

export default function AddNoteCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [destination, setDestination] = useState<Destination>("today");

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

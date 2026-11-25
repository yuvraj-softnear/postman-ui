import { FormEvent, useState } from "react";
import type { Collection } from "../types";
import { Modal } from "./AuthScreen";

type Props = {
  collection: Collection;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onShare: (email: string, role: "EDITOR" | "VIEWER") => Promise<void>;
  onUnshare: (userId: number) => Promise<void>;
};

export function CollectionModal({ collection, onClose, onSave, onDelete, onShare, onUnshare }: Props) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [error, setError] = useState("");
  const canOwn = collection.role === "OWNER";
  const canEdit = collection.role !== "VIEWER";

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await onSave(name.trim(), description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <Modal title="Collection" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label>
          Name
          <input value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={description} disabled={!canEdit} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {canEdit && <button className="primary" type="submit">Save collection</button>}
      </form>
      <h3>People</h3>
      <ul className="member-list">
        {collection.members.map((member) => (
          <li key={member.userId}>
            <span>{member.name} · {member.email}</span>
            <span className="role-pill">{member.role}</span>
            {canOwn && member.role !== "OWNER" && (
              <button type="button" onClick={() => void onUnshare(member.userId).catch((err: Error) => setError(err.message))}>Remove</button>
            )}
          </li>
        ))}
      </ul>
      {canOwn && (
        <form
          className="share-row"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            void onShare(email.trim(), role)
              .then(() => setEmail(""))
              .catch((err: Error) => setError(err.message));
          }}
        >
          <input type="email" placeholder="teammate@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <select value={role} onChange={(event) => setRole(event.target.value as "EDITOR" | "VIEWER")}>
            <option value="EDITOR">Can edit</option>
            <option value="VIEWER">Can view</option>
          </select>
          <button type="submit">Share</button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
      {canOwn && (
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm(`Delete “${collection.name}” and everything inside it?`)) {
              void onDelete().catch((err: Error) => setError(err.message));
            }
          }}
        >
          Delete collection
        </button>
      )}
    </Modal>
  );
}

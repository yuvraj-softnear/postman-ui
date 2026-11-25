import { useRef, useState } from "react";
import type { Collection } from "../types";

type Props = {
  collections: Collection[];
  activeCollectionId: number | null;
  selectedRequestId: number | null;
  onSelectCollection: (id: number) => void;
  onSelectRequest: (id: number) => void;
  onCreateCollection: (name: string) => void;
  onCreateFolder: (collectionId: number, parentId: number | null) => void;
  onCreateRequest: (collectionId: number, folderId: number | null) => void;
  onDeleteFolder: (folderId: number) => void;
  onRenameFolder: (folderId: number, name: string) => void;
  onOpenSettings: (collectionId: number) => void;
  onImport: (file: File) => void;
  onExport: (collectionId: number) => void;
};

export function Sidebar(props: Props) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOpen = (id: number) => open[id] !== false;

  const renderLevel = (collection: Collection, parentId: number | null, depth: number) => {
    const folders = collection.folders.filter((folder) => folder.parentId === parentId);
    const requests = collection.requests.filter((request) => (request.folderId ?? null) === parentId);
    const canEdit = collection.role !== "VIEWER";

    return (
      <div className="tree-level" style={{ paddingLeft: depth ? 14 : 0 }}>
        {folders.map((folder) => (
          <div key={folder.id}>
            <div className="tree-row">
              <button type="button" className="tree-toggle" onClick={() => setOpen((prev) => ({ ...prev, [folder.id]: !isOpen(folder.id) }))}>
                {isOpen(folder.id) ? "▾" : "▸"}
              </button>
              {editing?.id === folder.id ? (
                <input
                  className="inline-input"
                  value={editing.name}
                  autoFocus
                  onChange={(event) => setEditing({ id: folder.id, name: event.target.value })}
                  onBlur={() => {
                    if (editing.name.trim()) props.onRenameFolder(folder.id, editing.name.trim());
                    setEditing(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                    if (event.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <button type="button" className="tree-label" onDoubleClick={() => canEdit && setEditing({ id: folder.id, name: folder.name })}>
                  {folder.name}
                </button>
              )}
              {canEdit && (
                <span className="row-actions">
                  <button type="button" title="New request" onClick={() => props.onCreateRequest(collection.id, folder.id)}>+</button>
                  <button type="button" title="New folder" onClick={() => props.onCreateFolder(collection.id, folder.id)}>▢</button>
                  <button type="button" title="Delete folder" onClick={() => props.onDeleteFolder(folder.id)}>×</button>
                </span>
              )}
            </div>
            {isOpen(folder.id) && renderLevel(collection, folder.id, depth + 1)}
          </div>
        ))}
        {requests.map((request) => (
          <button
            key={request.id}
            type="button"
            className={request.id === props.selectedRequestId ? "request-row active" : "request-row"}
            onClick={() => props.onSelectRequest(request.id)}
          >
            <span className={`method m-${request.method}`}>{request.method}</span>
            <span className="request-name">{request.name}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <form
        className="new-collection"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          props.onCreateCollection(name.trim());
          setName("");
        }}
      >
        <input value={name} placeholder="New collection" onChange={(event) => setName(event.target.value)} />
        <button type="submit">Add</button>
      </form>
      <div className="sidebar-tools">
        <button type="button" onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) props.onImport(file);
          }}
        />
      </div>
      <div className="collection-list">
        {props.collections.length === 0 && <p className="muted pad">No collections yet.</p>}
        {props.collections.map((collection) => (
          <section key={collection.id} className={collection.id === props.activeCollectionId ? "collection active" : "collection"}>
            <div className="tree-row collection-row">
              <button type="button" className="tree-toggle" onClick={() => setOpen((prev) => ({ ...prev, [collection.id]: !isOpen(collection.id) }))}>
                {isOpen(collection.id) ? "▾" : "▸"}
              </button>
              <button type="button" className="tree-label" onClick={() => props.onSelectCollection(collection.id)}>
                {collection.name}
              </button>
              <span className="row-actions">
                {collection.role !== "VIEWER" && (
                  <>
                    <button type="button" title="New request" onClick={() => props.onCreateRequest(collection.id, null)}>+</button>
                    <button type="button" title="New folder" onClick={() => props.onCreateFolder(collection.id, null)}>▢</button>
                  </>
                )}
                <button type="button" title="Export" onClick={() => props.onExport(collection.id)}>↓</button>
                <button type="button" title="Settings" onClick={() => props.onOpenSettings(collection.id)}>⚙</button>
              </span>
            </div>
            {isOpen(collection.id) && renderLevel(collection, null, 0)}
          </section>
        ))}
      </div>
    </aside>
  );
}

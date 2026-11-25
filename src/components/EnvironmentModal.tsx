import { useEffect, useState } from "react";
import type { Environment } from "../types";
import { Modal } from "./AuthScreen";

type VariableRow = {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  enabled: boolean;
  secretSet: boolean;
  clear: boolean;
};

type Props = {
  environments: Environment[];
  activeId: number | null;
  onClose: () => void;
  onCreate: (name: string) => Promise<number>;
  onSave: (id: number, input: { name: string; isShared: boolean; variables: VariableRow[] }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export function EnvironmentModal({ environments, activeId, onClose, onCreate, onSave, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(activeId ?? environments[0]?.id ?? null);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [rows, setRows] = useState<VariableRow[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const selected = environments.find((environment) => environment.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setRows([]);
      return;
    }
    setName(selected.name);
    setShared(selected.isShared);
    setRows(selected.variables.map((variable) => ({
      id: String(variable.id),
      key: variable.key,
      value: variable.value,
      isSecret: variable.isSecret,
      enabled: variable.enabled,
      secretSet: variable.secretSet,
      clear: false,
    })));
  }, [selected]);

  const update = (id: string, patch: Partial<VariableRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <Modal title="Environments" onClose={onClose}>
      <div className="env-layout">
        <div className="env-list">
          {environments.map((environment) => (
            <button
              key={environment.id}
              type="button"
              className={environment.id === selectedId ? "env-item active" : "env-item"}
              onClick={() => setSelectedId(environment.id)}
            >
              {environment.name}
              {environment.isShared ? " · shared" : ""}
            </button>
          ))}
          <form
            className="share-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim()) return;
              setError("");
              void onCreate(newName.trim())
                .then((id) => {
                  setNewName("");
                  setSelectedId(id);
                })
                .catch((err: Error) => setError(err.message));
            }}
          >
            <input value={newName} placeholder="New environment" onChange={(event) => setNewName(event.target.value)} />
            <button type="submit">Add</button>
          </form>
        </div>
        {selected ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              void onSave(selected.id, { name: name.trim(), isShared: shared, variables: rows }).catch((err: Error) => setError(err.message));
            }}
          >
            <label>
              Name
              <input value={name} disabled={!selected.canEdit} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="check-line">
              <input type="checkbox" checked={shared} disabled={!selected.canEdit} onChange={(event) => setShared(event.target.checked)} />
              Shared with everyone who can sign in
            </label>
            <div className="kv">
              {rows.map((row) => (
                <div className="env-var" key={row.id}>
                  <input type="checkbox" checked={row.enabled} disabled={!selected.canEdit} onChange={(event) => update(row.id, { enabled: event.target.checked })} />
                  <input value={row.key} disabled={!selected.canEdit} placeholder="name" onChange={(event) => update(row.id, { key: event.target.value })} />
                  <input
                    type={row.isSecret ? "password" : "text"}
                    value={row.value}
                    disabled={!selected.canEdit}
                    placeholder={row.secretSet && !row.clear ? "Saved secret" : "value"}
                    onChange={(event) => update(row.id, { value: event.target.value, clear: false })}
                  />
                  <label className="check-line">
                    <input type="checkbox" checked={row.isSecret} disabled={!selected.canEdit} onChange={(event) => update(row.id, { isSecret: event.target.checked })} />
                    Secret
                  </label>
                  <button type="button" disabled={!selected.canEdit} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>×</button>
                </div>
              ))}
            </div>
            {selected.canEdit && (
              <button
                type="button"
                className="text-button"
                onClick={() => setRows((current) => [...current, { id: crypto.randomUUID(), key: "", value: "", isSecret: false, enabled: true, secretSet: false, clear: false }])}
              >
                Add variable
              </button>
            )}
            {selected.canEdit && <button className="primary" type="submit">Save environment</button>}
            {selected.canEdit && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (window.confirm(`Delete environment “${selected.name}”?`)) {
                    void onDelete(selected.id).catch((err: Error) => setError(err.message));
                  }
                }}
              >
                Delete environment
              </button>
            )}
          </form>
        ) : (
          <p className="muted">Create an environment for base URLs and tokens.</p>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

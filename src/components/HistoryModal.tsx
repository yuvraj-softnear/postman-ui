import { useEffect, useState } from "react";
import { api } from "../api";
import type { Draft, HistoryItem, HistorySummary, ProxyResult } from "../types";
import { formatBytes, formatWhen } from "../format";
import { rowsFrom } from "../draft";
import { Modal } from "./AuthScreen";

type Props = {
  onClose: () => void;
  onRestore: (draftPatch: Partial<Draft>, result: ProxyResult, sourceRequestId: number | null) => void;
};

export function HistoryModal({ onClose, onRestore }: Props) {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    api.history().then((data) => setItems(data.history)).catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  const open = (id: number) => {
    api.historyItem(id).then((data) => setSelected(data.item)).catch((err: Error) => setError(err.message));
  };

  return (
    <Modal title="History" onClose={onClose}>
      <div className="history-layout">
        <div className="history-list">
          {items.length === 0 && <p className="muted">No requests sent yet.</p>}
          {items.map((item) => (
            <button key={item.id} type="button" className={selected?.id === item.id ? "history-item active" : "history-item"} onClick={() => open(item.id)}>
              <span className={`method m-${item.method}`}>{item.method}</span>
              <span>
                <strong>{item.status ?? "—"}</strong> {item.url}
                <small>{formatWhen(item.createdAt)} · {item.timeMs ?? 0} ms · {formatBytes(item.size ?? 0)}</small>
              </span>
            </button>
          ))}
          {items.length > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                void api.clearHistory().then(() => {
                  setItems([]);
                  setSelected(null);
                });
              }}
            >
              Clear history
            </button>
          )}
        </div>
        <div>
          {!selected && <p className="muted">Select a call to inspect it.</p>}
          {selected && (
            <div className="stack">
              <p><strong>{selected.method}</strong> {selected.url}</p>
              <pre className="response-body small">{pretty(selected.response.body?.data || "")}</pre>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const request = selected.request;
                  onRestore(
                    {
                      method: request.method,
                      url: request.url,
                      queryParams: rowsFrom(request.queryParams ?? []),
                      headers: rowsFrom(request.headers ?? []),
                      bodyType: request.bodyType,
                      body: request.body ?? "",
                      formFields: rowsFrom(request.formFields ?? []),
                      authType: request.auth?.type ?? "NONE",
                      basicUsername: request.auth?.type === "BASIC" ? request.auth.username : "",
                      apiKeyName: request.auth?.type === "API_KEY" ? request.auth.key : "",
                      apiKeyIn: request.auth?.type === "API_KEY" ? request.auth.in : "HEADER",
                      bearerToken: "",
                      basicPassword: "",
                      apiKeyValue: "",
                    },
                    {
                      status: selected.response.status,
                      statusText: selected.response.statusText ?? "",
                      timeMs: selected.timeMs ?? 0,
                      size: selected.size ?? 0,
                      finalUrl: selected.url,
                      headers: selected.response.headers ?? [],
                      body: selected.response.body ?? { kind: "text", contentType: "", data: "" },
                      unresolved: [],
                      historyId: selected.id,
                    },
                    request.requestId ?? null
                  );
                  onClose();
                }}
              >
                Restore into open request
              </button>
            </div>
          )}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

function pretty(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value || "Empty response";
  }
}

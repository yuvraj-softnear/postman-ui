import { useState } from "react";
import type { Collection, Draft, Folder } from "../types";
import { KeyValueTable } from "./KeyValueTable";
import { toCurl } from "../curl";

type Props = {
  draft: Draft;
  collection: Collection | undefined;
  canEdit: boolean;
  sending: boolean;
  saving: boolean;
  dirty: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onSend: () => void;
  onDelete: () => void;
};

const METHODS: Draft["method"][] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

function folderOptions(folders: Folder[]) {
  const options: { id: number; label: string }[] = [];
  const walk = (parentId: number | null, prefix: string) => {
    for (const folder of folders.filter((item) => item.parentId === parentId)) {
      const label = `${prefix}${folder.name}`;
      options.push({ id: folder.id, label });
      walk(folder.id, `${label} / `);
    }
  };
  walk(null, "");
  return options;
}

export function RequestEditor(props: Props) {
  const { draft, onChange } = props;
  const [tab, setTab] = useState<"params" | "headers" | "body" | "auth">("params");
  const [copied, setCopied] = useState("");
  const patch = (partial: Partial<Draft>) => onChange({ ...draft, ...partial });
  const jsonInvalid = draft.bodyType === "JSON" && draft.body.trim() !== "" && !isJson(draft.body);

  const copyCurl = async () => {
    await navigator.clipboard.writeText(toCurl(draft));
    setCopied("cURL copied");
    window.setTimeout(() => setCopied(""), 1500);
  };

  return (
    <section
      className="editor"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          props.onSend();
        }
      }}
    >
      <div className="editor-title">
        <input
          className="name-input"
          value={draft.name}
          disabled={!props.canEdit}
          onChange={(event) => patch({ name: event.target.value })}
        />
        <select
          value={draft.folderId ?? ""}
          disabled={!props.canEdit}
          onChange={(event) => patch({ folderId: event.target.value ? Number(event.target.value) : null })}
        >
          <option value="">No folder</option>
          {folderOptions(props.collection?.folders ?? []).map((folder) => (
            <option key={folder.id} value={folder.id}>{folder.label}</option>
          ))}
        </select>
        {props.canEdit && (
          <button type="button" className="primary" disabled={props.saving || !draft.name.trim()} onClick={props.onSave}>
            {props.saving ? "Saving…" : props.dirty ? "Save" : "Saved"}
          </button>
        )}
        {props.canEdit && (
          <button type="button" className="danger-text" onClick={props.onDelete}>Delete</button>
        )}
      </div>
      {!props.canEdit && <p className="hint">You can send this request. Only editors can save changes.</p>}
      <div className="url-bar">
        <select className={`method-select m-${draft.method}`} value={draft.method} onChange={(event) => patch({ method: event.target.value as Draft["method"] })}>
          {METHODS.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
        <input
          className="url-input"
          placeholder="https://api.example.com/{{path}}"
          value={draft.url}
          onChange={(event) => patch({ url: event.target.value })}
        />
        <button type="button" className="primary send" disabled={props.sending || !draft.url.trim()} onClick={props.onSend}>
          {props.sending ? "Sending…" : "Send"}
        </button>
      </div>
      <div className="tabs">
        {(["params", "headers", "body", "auth"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? "tab active" : "tab"} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
        <button type="button" className="text-button curl" onClick={() => void copyCurl()}>Copy cURL</button>
        {copied && <span className="hint">{copied}</span>}
      </div>
      <div className="tab-panel">
        {tab === "params" && <KeyValueTable rows={draft.queryParams} onChange={(queryParams) => patch({ queryParams })} />}
        {tab === "headers" && <KeyValueTable rows={draft.headers} onChange={(headers) => patch({ headers })} />}
        {tab === "body" && (
          <div className="body-tab">
            <select value={draft.bodyType} onChange={(event) => patch({ bodyType: event.target.value as Draft["bodyType"] })}>
              <option value="NONE">No body</option>
              <option value="JSON">JSON</option>
              <option value="TEXT">Text</option>
              <option value="FORM">Form url-encoded</option>
            </select>
            {(draft.bodyType === "JSON" || draft.bodyType === "TEXT") && (
              <textarea
                className="body-input"
                value={draft.body}
                spellCheck={false}
                onChange={(event) => patch({ body: event.target.value })}
              />
            )}
            {draft.bodyType === "FORM" && <KeyValueTable rows={draft.formFields} onChange={(formFields) => patch({ formFields })} />}
            {jsonInvalid && <p className="form-error">Body is not valid JSON. Send will still forward it as written.</p>}
          </div>
        )}
        {tab === "auth" && (
          <div className="auth-tab">
            <label>
              Type
              <select value={draft.authType} onChange={(event) => patch({ authType: event.target.value as Draft["authType"] })}>
                <option value="NONE">No auth</option>
                <option value="BEARER">Bearer token</option>
                <option value="BASIC">Basic</option>
                <option value="API_KEY">API key</option>
              </select>
            </label>
            {draft.authType === "BEARER" && (
              <SecretField
                label="Token"
                value={draft.bearerToken}
                saved={draft.tokenSet && !draft.clearBearer}
                onChange={(bearerToken) => patch({ bearerToken, clearBearer: false })}
                onClear={() => patch({ bearerToken: "", clearBearer: true, tokenSet: false })}
              />
            )}
            {draft.authType === "BASIC" && (
              <>
                <label>
                  Username
                  <input value={draft.basicUsername} onChange={(event) => patch({ basicUsername: event.target.value })} />
                </label>
                <SecretField
                  label="Password"
                  value={draft.basicPassword}
                  saved={draft.passwordSet && !draft.clearBasic}
                  onChange={(basicPassword) => patch({ basicPassword, clearBasic: false })}
                  onClear={() => patch({ basicPassword: "", clearBasic: true, passwordSet: false })}
                />
              </>
            )}
            {draft.authType === "API_KEY" && (
              <>
                <label>
                  Key
                  <input value={draft.apiKeyName} onChange={(event) => patch({ apiKeyName: event.target.value })} />
                </label>
                <SecretField
                  label="Value"
                  value={draft.apiKeyValue}
                  saved={draft.apiKeySet && !draft.clearApiKey}
                  onChange={(apiKeyValue) => patch({ apiKeyValue, clearApiKey: false })}
                  onClear={() => patch({ apiKeyValue: "", clearApiKey: true, apiKeySet: false })}
                />
                <label>
                  Add to
                  <select value={draft.apiKeyIn} onChange={(event) => patch({ apiKeyIn: event.target.value as Draft["apiKeyIn"] })}>
                    <option value="HEADER">Header</option>
                    <option value="QUERY">Query param</option>
                  </select>
                </label>
              </>
            )}
            <p className="hint">Leave a saved secret blank to keep it. Variables like {"{{token}}"} are resolved on the server.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SecretField({
  label,
  value,
  saved,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  saved: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <label>
      {label}
      <span className="secret-line">
        <input
          type="password"
          value={value}
          placeholder={saved ? "Saved secret" : ""}
          onChange={(event) => onChange(event.target.value)}
        />
        {saved && <button type="button" onClick={onClear}>Clear</button>}
      </span>
    </label>
  );
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

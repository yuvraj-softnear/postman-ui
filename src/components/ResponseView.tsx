import { useState } from "react";
import type { ProxyResult } from "../types";
import { formatBytes } from "../format";

export type ResponsePane =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "result"; result: ProxyResult };

export function ResponseView({ pane }: { pane: ResponsePane }) {
  const [tab, setTab] = useState<"body" | "headers">("body");
  if (pane.kind === "empty") {
    return <section className="response empty-response">Send a request to see the response here. Ctrl+Enter sends.</section>;
  }
  if (pane.kind === "error") {
    return <section className="response"><p className="form-error">{pane.message}</p></section>;
  }

  const { result } = pane;
  const pretty = result.body.kind === "text" ? prettyBody(result.body.data) : result.body.data;
  const image = result.body.kind === "base64" && result.body.contentType.startsWith("image/") && result.body.data;

  return (
    <section className="response">
      <div className="response-meta">
        <span className={`status s-${statusClass(result.status)}`}>{result.status || "—"} {result.statusText}</span>
        <span>{result.timeMs} ms</span>
        <span>{formatBytes(result.size)}</span>
        <span className="final-url" title={result.finalUrl}>{result.finalUrl}</span>
        <button
          type="button"
          className="text-button"
          onClick={() => void navigator.clipboard.writeText(result.body.kind === "text" ? result.body.data : pretty)}
        >
          Copy body
        </button>
      </div>
      {result.unresolved.length > 0 && (
        <p className="hint">Unresolved variables: {result.unresolved.join(", ")}</p>
      )}
      <div className="tabs">
        <button type="button" className={tab === "body" ? "tab active" : "tab"} onClick={() => setTab("body")}>Body</button>
        <button type="button" className={tab === "headers" ? "tab active" : "tab"} onClick={() => setTab("headers")}>Headers</button>
      </div>
      {tab === "body" ? (
        image ? (
          <img className="preview-image" alt="Response" src={`data:${result.body.contentType};base64,${result.body.data}`} />
        ) : result.body.kind === "base64" && !result.body.data ? (
          <p className="muted">Binary response was not stored.</p>
        ) : (
          <pre className="response-body">{pretty || "Empty response"}</pre>
        )
      ) : (
        <div className="header-list">
          {result.headers.length === 0 && <p className="muted">No headers</p>}
          {result.headers.map((header) => (
            <div key={`${header.key}-${header.value}`} className="header-row">
              <strong>{header.key}</strong>
              <span>{header.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function statusClass(status: number): string {
  if (status >= 500) return "err";
  if (status >= 400) return "warn";
  if (status >= 300) return "info";
  if (status >= 200) return "ok";
  return "muted";
}

function prettyBody(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

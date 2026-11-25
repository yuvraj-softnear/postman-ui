import type { Draft } from "./types";
import { authInput } from "./draft";

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function toCurl(draft: Draft): string {
  let url = draft.url.trim() || "http://localhost";
  try {
    const parsed = new URL(url);
    for (const param of draft.queryParams) {
      if (!param.enabled || !param.key.trim()) continue;
      parsed.searchParams.append(param.key, param.value);
    }
    const auth = authInput(draft);
    if (auth.type === "API_KEY" && auth.in === "QUERY" && auth.key && auth.value) {
      parsed.searchParams.append(auth.key, auth.value);
    }
    url = parsed.toString();
  } catch {
    // Keep the raw template when the URL is still incomplete.
  }

  const lines = [`curl -X ${draft.method} ${quote(url)}`];
  for (const header of draft.headers) {
    if (!header.enabled || !header.key.trim()) continue;
    lines.push(`-H ${quote(`${header.key}: ${header.value}`)}`);
  }

  const auth = authInput(draft);
  if (auth.type === "BEARER" && auth.token) {
    lines.push(`-H ${quote(`Authorization: Bearer ${auth.token}`)}`);
  } else if (auth.type === "BASIC" && (auth.username || auth.password)) {
    lines.push(`-u ${quote(`${auth.username}:${auth.password ?? ""}`)}`);
  } else if (auth.type === "API_KEY" && auth.in === "HEADER" && auth.key && auth.value) {
    lines.push(`-H ${quote(`${auth.key}: ${auth.value}`)}`);
  }

  if (draft.method !== "GET" && draft.method !== "HEAD") {
    if (draft.bodyType === "JSON" || draft.bodyType === "TEXT") {
      if (draft.body) lines.push(`--data ${quote(draft.body)}`);
    } else if (draft.bodyType === "FORM") {
      for (const field of draft.formFields) {
        if (!field.enabled || !field.key.trim()) continue;
        lines.push(`--data-urlencode ${quote(`${field.key}=${field.value}`)}`);
      }
    }
  }

  return lines.join(" \\\n  ");
}

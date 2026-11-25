import type { AuthInput, Draft, KeyValue, Row, SavedRequest } from "./types";

export function newRow(partial?: Partial<Row>): Row {
  return {
    id: crypto.randomUUID(),
    key: "",
    value: "",
    enabled: true,
    ...partial,
  };
}

export function rowsFrom(values: KeyValue[]): Row[] {
  const rows = values.map((value) => newRow(value));
  return rows.length > 0 ? rows : [newRow()];
}

function cleanRows(rows: Row[]): KeyValue[] {
  return rows
    .filter((row) => row.key.trim() || row.value.trim())
    .map(({ key, value, enabled }) => ({ key, value, enabled }));
}

export function authInput(draft: Draft): AuthInput {
  if (draft.authType === "BEARER") {
    return { type: "BEARER", token: draft.clearBearer ? null : draft.bearerToken };
  }
  if (draft.authType === "BASIC") {
    return {
      type: "BASIC",
      username: draft.basicUsername,
      password: draft.clearBasic ? null : draft.basicPassword,
    };
  }
  if (draft.authType === "API_KEY") {
    return {
      type: "API_KEY",
      key: draft.apiKeyName,
      value: draft.clearApiKey ? null : draft.apiKeyValue,
      in: draft.apiKeyIn,
    };
  }
  return { type: "NONE" };
}

export function requestPayload(draft: Draft) {
  return {
    name: draft.name.trim(),
    folderId: draft.folderId,
    method: draft.method,
    url: draft.url,
    queryParams: cleanRows(draft.queryParams),
    headers: cleanRows(draft.headers),
    bodyType: draft.bodyType,
    body: draft.body,
    formFields: cleanRows(draft.formFields),
    auth: authInput(draft),
  };
}

export function draftFromRequest(request: SavedRequest): Draft {
  const auth = request.auth;
  return {
    id: request.id,
    collectionId: request.collectionId,
    folderId: request.folderId,
    name: request.name,
    method: request.method,
    url: request.url,
    queryParams: rowsFrom(request.queryParams),
    headers: rowsFrom(request.headers),
    bodyType: request.bodyType,
    body: request.body,
    formFields: rowsFrom(request.formFields),
    authType: auth.type,
    bearerToken: "",
    basicUsername: auth.type === "BASIC" ? auth.username : "",
    basicPassword: "",
    apiKeyName: auth.type === "API_KEY" ? auth.key : "",
    apiKeyValue: "",
    apiKeyIn: auth.type === "API_KEY" ? auth.in : "HEADER",
    clearBearer: false,
    clearBasic: false,
    clearApiKey: false,
    tokenSet: auth.type === "BEARER" ? auth.tokenSet : false,
    passwordSet: auth.type === "BASIC" ? auth.passwordSet : false,
    apiKeySet: auth.type === "API_KEY" ? auth.valueSet : false,
  };
}

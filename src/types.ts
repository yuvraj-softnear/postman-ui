export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type BodyType = "NONE" | "JSON" | "TEXT" | "FORM";
export type Role = "OWNER" | "EDITOR" | "VIEWER";

export type KeyValue = { key: string; value: string; enabled: boolean };

export type PublicAuth =
  | { type: "NONE" }
  | { type: "BEARER"; token: string; tokenSet: boolean }
  | { type: "BASIC"; username: string; password: string; passwordSet: boolean }
  | { type: "API_KEY"; key: string; value: string; valueSet: boolean; in: "HEADER" | "QUERY" };

export type AuthInput =
  | { type: "NONE" }
  | { type: "BEARER"; token: string | null }
  | { type: "BASIC"; username: string; password: string | null }
  | { type: "API_KEY"; key: string; value: string | null; in: "HEADER" | "QUERY" };

export type User = { id: number; name: string; email: string };

export type CollectionRequest = {
  id: number;
  folderId: number | null;
  name: string;
  method: Method;
  sortOrder: number;
};

export type Folder = {
  id: number;
  parentId: number | null;
  name: string;
  sortOrder: number;
};

export type Member = {
  userId: number;
  role: Role;
  name: string;
  email: string;
};

export type Collection = {
  id: number;
  name: string;
  description: string | null;
  role: Role;
  owner: User;
  members: Member[];
  folders: Folder[];
  requests: CollectionRequest[];
};

export type SavedRequest = {
  id: number;
  collectionId: number;
  folderId: number | null;
  name: string;
  method: Method;
  url: string;
  queryParams: KeyValue[];
  headers: KeyValue[];
  bodyType: BodyType;
  body: string;
  formFields: KeyValue[];
  auth: PublicAuth;
  sortOrder: number;
  updatedAt: string;
};

export type Variable = {
  id: number;
  key: string;
  value: string;
  isSecret: boolean;
  enabled: boolean;
  secretSet: boolean;
};

export type Environment = {
  id: number;
  name: string;
  isShared: boolean;
  canEdit: boolean;
  owner: User;
  variables: Variable[];
};

export type ProxyBody = { kind: "text" | "base64"; contentType: string; data: string };

export type ProxyResult = {
  status: number;
  statusText: string;
  timeMs: number;
  size: number;
  finalUrl: string;
  headers: { key: string; value: string }[];
  body: ProxyBody;
  unresolved: string[];
  historyId: number | null;
};

export type HistorySummary = {
  id: number;
  requestId: number | null;
  method: string;
  url: string;
  status: number | null;
  timeMs: number | null;
  size: number | null;
  createdAt: string;
};

export type HistoryItem = HistorySummary & {
  request: {
    requestId?: number | null;
    method: Method;
    url: string;
    queryParams: KeyValue[];
    headers: KeyValue[];
    bodyType: BodyType;
    body: string;
    formFields: KeyValue[];
    auth: AuthInput;
  };
  response: {
    status: number;
    statusText?: string;
    headers?: { key: string; value: string }[];
    body?: ProxyBody;
  };
};

export type Row = KeyValue & { id: string };

export type Draft = {
  id: number;
  collectionId: number;
  folderId: number | null;
  name: string;
  method: Method;
  url: string;
  queryParams: Row[];
  headers: Row[];
  bodyType: BodyType;
  body: string;
  formFields: Row[];
  authType: PublicAuth["type"];
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyIn: "HEADER" | "QUERY";
  clearBearer: boolean;
  clearBasic: boolean;
  clearApiKey: boolean;
  tokenSet: boolean;
  passwordSet: boolean;
  apiKeySet: boolean;
};

import { useCallback, useEffect, useState } from "react";
import { ApiError, api, getToken, setToken, setUnauthorizedHandler } from "./api";
import { draftFromRequest, requestPayload } from "./draft";
import type { Collection, Draft, Environment, User } from "./types";
import { AuthScreen } from "./components/AuthScreen";
import { Sidebar } from "./components/Sidebar";
import { RequestEditor } from "./components/RequestEditor";
import { ResponseView, type ResponsePane } from "./components/ResponseView";
import { CollectionModal } from "./components/CollectionModal";
import { EnvironmentModal } from "./components/EnvironmentModal";
import { HistoryModal } from "./components/HistoryModal";

const ENV_KEY = "api-client-environment";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pane, setPane] = useState<ResponsePane>({ kind: "empty" });
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [envOpen, setEnvOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [environmentId, setEnvironmentId] = useState<number | null>(() => {
    const stored = localStorage.getItem(ENV_KEY);
    return stored ? Number(stored) : null;
  });

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setDraft(null);
    setCollections([]);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const refreshCollections = useCallback(async () => {
    const data = await api.collections();
    setCollections(data.collections);
    return data.collections;
  }, []);

  const refreshEnvironments = useCallback(async () => {
    const data = await api.environments();
    setEnvironments(data.environments);
    return data.environments;
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return;
    }
    api.me()
      .then(async (data) => {
        setUser(data.user);
        await Promise.all([refreshCollections(), refreshEnvironments()]);
      })
      .catch(() => logout())
      .finally(() => setBooting(false));
  }, [logout, refreshCollections, refreshEnvironments]);

  useEffect(() => {
    if (!selectedRequestId) return;
    let cancelled = false;
    api.getRequest(selectedRequestId)
      .then((data) => {
        if (cancelled) return;
        setDraft(draftFromRequest(data.request));
        setDirty(false);
        setActiveCollectionId(data.request.collectionId);
      })
      .catch((error: Error) => setNotice(error.message));
    return () => {
      cancelled = true;
    };
  }, [selectedRequestId]);

  const changeDraft = (next: Draft) => {
    setDraft(next);
    setDirty(true);
  };

  const guard = async (action: () => Promise<void>) => {
    try {
      setNotice("");
      await action();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Something went wrong");
    }
  };

  const save = () => guard(async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      const data = await api.updateRequest(draft.id, requestPayload(draft));
      setDraft(draftFromRequest(data.request));
      setDirty(false);
      await refreshCollections();
    } finally {
      setSaving(false);
    }
  });

  const send = () => guard(async () => {
    if (!draft || !draft.url.trim()) return;
    setSending(true);
    try {
      const payload = requestPayload(draft);
      const data = await api.send({
        ...payload,
        requestId: draft.id,
        environmentId,
      });
      setPane({ kind: "result", result: data.result });
    } catch (error) {
      setPane({ kind: "error", message: error instanceof Error ? error.message : "Send failed" });
    } finally {
      setSending(false);
    }
  });

  if (booting) return <main className="boot">Loading…</main>;
  if (!user) {
    return (
      <AuthScreen
        onSubmit={async (body, mode) => {
          const session = mode === "login"
            ? await api.login({ email: body.email, password: body.password })
            : await api.register(body);
          setToken(session.token);
          setUser(session.user);
          await Promise.all([refreshCollections(), refreshEnvironments()]);
        }}
      />
    );
  }

  const collection = collections.find((item) => item.id === (draft?.collectionId ?? activeCollectionId));
  const settings = collections.find((item) => item.id === settingsId);
  const canEdit = collection ? collection.role !== "VIEWER" : false;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">API Client</div>
        <label className="env-select">
          Environment
          <select
            value={environmentId ?? ""}
            onChange={(event) => {
              const next = event.target.value ? Number(event.target.value) : null;
              setEnvironmentId(next);
              if (next) localStorage.setItem(ENV_KEY, String(next));
              else localStorage.removeItem(ENV_KEY);
            }}
          >
            <option value="">No environment</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}{environment.isShared ? " (shared)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setEnvOpen(true)}>Manage</button>
        <button type="button" onClick={() => setHistoryOpen(true)}>History</button>
        <span className="who">{user.name}</span>
        <button type="button" onClick={logout}>Log out</button>
      </header>
      {notice && <div className="notice">{notice}</div>}
      <div className="workspace">
        <Sidebar
          collections={collections}
          activeCollectionId={activeCollectionId}
          selectedRequestId={selectedRequestId}
          onSelectCollection={setActiveCollectionId}
          onSelectRequest={setSelectedRequestId}
          onCreateCollection={(name) => guard(async () => {
            const created = await api.createCollection({ name });
            await refreshCollections();
            setActiveCollectionId(created.collection.id);
          })}
          onCreateFolder={(collectionId, parentId) => guard(async () => {
            const folderName = window.prompt("Folder name", "New folder");
            if (!folderName?.trim()) return;
            await api.createFolder(collectionId, { name: folderName.trim(), parentId });
            await refreshCollections();
            setActiveCollectionId(collectionId);
          })}
          onCreateRequest={(collectionId, folderId) => guard(async () => {
            const created = await api.createRequest(collectionId, { folderId });
            await refreshCollections();
            setActiveCollectionId(collectionId);
            setSelectedRequestId(created.request.id);
          })}
          onDeleteFolder={(folderId) => guard(async () => {
            if (!window.confirm("Delete this folder and the requests inside it?")) return;
            await api.deleteFolder(folderId);
            if (draft?.folderId === folderId) {
              setDraft(null);
              setSelectedRequestId(null);
            }
            await refreshCollections();
          })}
          onRenameFolder={(folderId, name) => guard(async () => {
            await api.renameFolder(folderId, name);
            await refreshCollections();
          })}
          onOpenSettings={setSettingsId}
          onImport={(file) => guard(async () => {
            const parsed = JSON.parse(await file.text()) as unknown;
            const created = await api.importCollection(parsed);
            await refreshCollections();
            setActiveCollectionId(created.collection.id);
          })}
          onExport={(id) => guard(async () => {
            const collectionJson = await api.exportCollection(id);
            const blob = new Blob([JSON.stringify(collectionJson, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "collection.json";
            link.click();
            URL.revokeObjectURL(link.href);
          })}
        />
        <main className="main">
          {draft ? (
            <RequestEditor
              draft={draft}
              collection={collection}
              canEdit={canEdit}
              sending={sending}
              saving={saving}
              dirty={dirty}
              onChange={changeDraft}
              onSave={() => void save()}
              onSend={() => void send()}
              onDelete={() => guard(async () => {
                if (!window.confirm("Delete this request?")) return;
                await api.deleteRequest(draft.id);
                setDraft(null);
                setSelectedRequestId(null);
                await refreshCollections();
              })}
            />
          ) : (
            <section className="editor empty-editor">
              <h2>No request open</h2>
              <p>Add a collection, then create a request. Calls go out from the server, so browser CORS does not apply.</p>
            </section>
          )}
          <ResponseView pane={pane} />
        </main>
      </div>
      {settings && (
        <CollectionModal
          collection={settings}
          onClose={() => setSettingsId(null)}
          onSave={async (name, description) => {
            await api.updateCollection(settings.id, { name, description: description || null });
            await refreshCollections();
            setSettingsId(null);
          }}
          onDelete={async () => {
            await api.deleteCollection(settings.id);
            if (draft?.collectionId === settings.id) {
              setDraft(null);
              setSelectedRequestId(null);
            }
            setSettingsId(null);
            await refreshCollections();
          }}
          onShare={async (email, role) => {
            await api.shareCollection(settings.id, { email, role });
            await refreshCollections();
          }}
          onUnshare={async (userId) => {
            await api.unshareCollection(settings.id, userId);
            await refreshCollections();
          }}
        />
      )}
      {envOpen && (
        <EnvironmentModal
          environments={environments}
          activeId={environmentId}
          onClose={() => setEnvOpen(false)}
          onCreate={async (name) => {
            const created = await api.createEnvironment({ name });
            await refreshEnvironments();
            setEnvironmentId(created.environment.id);
            localStorage.setItem(ENV_KEY, String(created.environment.id));
            return created.environment.id;
          }}
          onSave={async (id, input) => {
            await api.updateEnvironment(id, { name: input.name, isShared: input.isShared });
            await api.saveVariables(id, input.variables.filter((row) => row.key.trim()).map((row) => ({
              key: row.key.trim(),
              value: row.clear ? null : row.value,
              isSecret: row.isSecret,
              enabled: row.enabled,
            })));
            await refreshEnvironments();
          }}
          onDelete={async (id) => {
            await api.deleteEnvironment(id);
            if (environmentId === id) {
              setEnvironmentId(null);
              localStorage.removeItem(ENV_KEY);
            }
            await refreshEnvironments();
          }}
        />
      )}
      {historyOpen && (
        <HistoryModal
          onClose={() => setHistoryOpen(false)}
          onRestore={(patch, result, sourceRequestId) => {
            if (!draft) {
              setNotice("Open a request, then restore history into it.");
              setPane({ kind: "result", result });
              return;
            }
            const same = sourceRequestId === draft.id;
            setDraft({
              ...draft,
              ...patch,
              clearBearer: same ? false : patch.authType === "BEARER",
              clearBasic: same ? false : patch.authType === "BASIC",
              clearApiKey: same ? false : patch.authType === "API_KEY",
              tokenSet: same ? draft.tokenSet : false,
              passwordSet: same ? draft.passwordSet : false,
              apiKeySet: same ? draft.apiKeySet : false,
            });
            setDirty(true);
            setPane({ kind: "result", result });
          }}
        />
      )}
    </div>
  );
}

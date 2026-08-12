"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  BookOpen,
  Check,
  CircleAlert,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  Grid2X2,
  History,
  Languages,
  Laptop,
  Mic2,
  Moon,
  PanelRight,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { ChangeEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";

type Locale = "en" | "id";
type Theme = "system" | "light" | "dark";
type SourceKind = "file" | "url";
type WorkspacePhase = "idle" | "discussion" | "source_review" | "processing" | "review_required" | "confirmed" | "failed";
type MessageRole = "user" | "assistant";

const API_BASE = process.env.NEXT_PUBLIC_BIZETO_API_URL || "http://localhost:2551";

type BackendDocument = {
  id: string;
  source_type: string;
  source_label: string;
  filename?: string | null;
  document_type: string;
  status: string;
};

type BackendResume = {
  document_id: string;
  status: string;
  document_type: string;
  summary: string;
  confidence: number;
  row_count: number;
  debit_total: number;
  credit_total: number;
  issues: Array<Record<string, unknown>>;
  journal_candidates: Array<Record<string, unknown>>;
  next_action: string;
};

type WorkspaceSource = {
  id: string;
  kind: SourceKind;
  label: string;
  detail: string;
  document?: BackendDocument;
  status: "attached" | "quick_checked" | "processing" | "review_required" | "confirmed" | "failed";
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  sourceId?: string;
  actions?: "confirm_process";
};

type ChatApiResponse = {
  response: string;
  provider: string;
  fallback: boolean;
};

const copy = {
  en: {
    workspace: "Workspace",
    entity: "No entity selected",
    period: "Open period",
    title: "What accounting evidence should we discuss?",
    subtitle: "Chat freely, attach a file, or paste a URL. Bizeto PSAK will not process attached data until you confirm.",
    placeholder: "Discuss, paste a URL, or add context for the attached evidence…",
    aiName: "Senior Accountant AI",
    empty: "Start with a question, a file, or a URL.",
    emptyHint: "Without evidence, this room behaves as a discussion space. With evidence, I will only inspect and propose a plan first.",
    sources: "Sources",
    noSources: "No sources yet",
    processLog: "Process log",
    noProcess: "No process started",
    inspector: "Inspector",
    selectedEvidence: "Selected evidence",
    noEvidence: "No evidence selected",
    quickCheck: "Quick check",
    plan: "Process plan",
    confirmProcess: "Confirm process",
    processing: "Processing…",
    preview: "Preview",
    confirmResult: "Confirm result",
    confirmed: "Confirmed",
    reset: "New session",
    explore: "Explore",
    process: "Process",
    manage: "Manage",
    playground: "Playground",
    history: "History",
    newWorkspace: "New workspace",
    myWorkspaces: "My workspaces",
    templates: "Templates",
    entities: "Entities",
    documentation: "Documentation",
    uploadFailed: "Upload failed. The file is kept only in this browser session.",
    discussionPrefix: "As a discussion, here is my take:",
    inputModes: {
      upload: "Upload file",
      url: "Paste URL",
    },
  },
  id: {
    workspace: "Workspace",
    entity: "Belum pilih entitas",
    period: "Periode terbuka",
    title: "Bukti akuntansi apa yang mau kita bahas?",
    subtitle: "Silakan diskusi bebas, attach file, atau tempel URL. Bizeto PSAK tidak akan memproses data attached sebelum Anda konfirmasi.",
    placeholder: "Diskusi, tempel URL, atau beri konteks untuk bukti yang dilampirkan…",
    aiName: "Senior Akuntan AI",
    empty: "Mulai dengan pertanyaan, file, atau URL.",
    emptyHint: "Tanpa bukti, ruang ini menjadi ruang diskusi. Dengan bukti, saya hanya inspeksi cepat dan mengusulkan rencana dulu.",
    sources: "Sumber",
    noSources: "Belum ada sumber",
    processLog: "Log proses",
    noProcess: "Belum ada proses",
    inspector: "Inspector",
    selectedEvidence: "Bukti terpilih",
    noEvidence: "Belum ada bukti terpilih",
    quickCheck: "Cek cepat",
    plan: "Rencana proses",
    confirmProcess: "Konfirmasi proses",
    processing: "Memproses…",
    preview: "Preview",
    confirmResult: "Konfirmasi hasil",
    confirmed: "Terkonfirmasi",
    reset: "Sesi baru",
    explore: "Explore",
    process: "Process",
    manage: "Manage",
    playground: "Playground",
    history: "History",
    newWorkspace: "Sesi baru",
    myWorkspaces: "Workspace saya",
    templates: "Template",
    entities: "Entitas",
    documentation: "Dokumentasi",
    uploadFailed: "Upload gagal. File hanya tersimpan di sesi browser ini.",
    discussionPrefix: "Sebagai diskusi, pandangan saya:",
    inputModes: {
      upload: "Upload file",
      url: "Tempel URL",
    },
  },
} as const;

type WorkspaceCopy = (typeof copy)[keyof typeof copy];

export default function WorkspacePage() {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [theme, setThemeState] = useState<Theme>("system");
  const [inspector, setInspector] = useState(true);
  const [phase, setPhase] = useState<WorkspacePhase>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<WorkspaceSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [resume, setResume] = useState<BackendResume | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const chatRef = useRef<HTMLTextAreaElement | null>(null);
  const t = copy[locale];

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? sources[0] ?? null,
    [selectedSourceId, sources],
  );
  const hasSource = sources.length > 0;
  const showInspector = hasSource && inspector;
  const startMode = messages.length === 0 && !hasSource;

  useEffect(() => {
    const savedLocale = localStorage.getItem("bizeto-locale") as Locale | null;
    const browserLocale = navigator.language.toLowerCase().startsWith("id") ? "id" : "en";
    setLocaleState(savedLocale || browserLocale);
    const savedTheme = localStorage.getItem("bizeto-theme") as Theme | null;
    if (savedTheme) setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
    localStorage.setItem("bizeto-theme", theme);
  }, [theme]);

  function setLocale(value: Locale) {
    setLocaleState(value);
    localStorage.setItem("bizeto-locale", value);
  }

  function updateChatDraft(value: string) {
    setChatDraft(value);
    const input = chatRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
    input.style.overflowY = input.scrollHeight > 180 ? "auto" : "hidden";
  }

  async function sendMessage() {
    const text = chatDraft.trim();
    if (!text) return;

    updateChatDraft("");
    pushMessage("user", text);

    const url = extractUrl(text);
    const explicitProcess = isExplicitProcess(text);

    if (url) {
      const source = await createUrlSource(url);
      addSource(source);
      respondWithSourcePlan(source, text);
      if (explicitProcess) await processSource(source);
      return;
    }

    if (hasSource && explicitProcess && selectedSource) {
      pushMessage("assistant", locale === "id" ? "Baik, instruksi prosesnya eksplisit. Saya mulai proses sumber terpilih." : "Understood. The processing instruction is explicit, so I will process the selected source.");
      await processSource(selectedSource);
      return;
    }

    setPhase(hasSource ? "source_review" : "discussion");
    const aiReply = await askAiChat(text);
    pushMessage("assistant", aiReply);
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setApiError("");
    const localSource: WorkspaceSource = {
      id: crypto.randomUUID(),
      kind: "file",
      label: file.name,
      detail: `${file.type || "unknown"} · ${formatBytes(file.size)}`,
      status: "attached",
    };

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      localSource.document = await response.json();
      localSource.detail = `${localSource.document?.document_type || "unknown"} · ${formatBytes(file.size)}`;
      localSource.status = "quick_checked";
    } catch (error) {
      setApiError(error instanceof Error ? error.message : t.uploadFailed);
      localSource.status = "failed";
    }

    addSource(localSource);
    respondWithSourcePlan(localSource);
  }

  async function processSource(source: WorkspaceSource) {
    if (!source.document) {
      pushMessage("assistant", locale === "id" ? "Sumber ini belum punya dokumen backend, jadi belum bisa diproses. Untuk URL, endpoint fetch konten masih perlu ditambahkan." : "This source does not have a backend document yet, so it cannot be processed. URL content fetching still needs an endpoint.");
      return;
    }

    setPhase("processing");
    setSources((items) => items.map((item) => item.id === source.id ? { ...item, status: "processing" } : item));

    try {
      const result = await postJson<{ document: BackendDocument; resume: BackendResume }>(`/api/documents/${source.document.id}/process`, {});
      setResume(result.resume);
      setPhase("review_required");
      setSources((items) => items.map((item) => item.id === source.id ? { ...item, document: result.document, status: "review_required" } : item));
      pushMessage("assistant", result.resume.summary);
    } catch (error) {
      setPhase("failed");
      setApiError(error instanceof Error ? error.message : "Process failed");
      setSources((items) => items.map((item) => item.id === source.id ? { ...item, status: "failed" } : item));
    }
  }

  async function confirmResult() {
    if (!selectedSource?.document) return;
    try {
      const confirmedDocument = await postJson<BackendDocument>(`/api/documents/${selectedSource.document.id}/confirm`, {
        actor: "workspace_user",
      });
      setPhase("confirmed");
      setSources((items) => items.map((item) => item.id === selectedSource.id ? { ...item, document: confirmedDocument, status: "confirmed" } : item));
      pushMessage("assistant", locale === "id" ? "Draf terkonfirmasi. Data siap naik ke tahap berikutnya, tetapi belum difinalisasi permanen." : "Draft confirmed. The data is ready for the next stage, but it is not permanently finalized yet.");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Confirm failed");
    }
  }

  function reset() {
    setPhase("idle");
    setMessages([]);
    setSources([]);
    setSelectedSourceId(null);
    setResume(null);
    setApiError("");
    updateChatDraft("");
  }

  function addSource(source: WorkspaceSource) {
    setSources((items) => [source, ...items]);
    setSelectedSourceId(source.id);
    setPhase("source_review");
  }

  function pushMessage(role: MessageRole, content: string, sourceId?: string, actions?: "confirm_process") {
    setMessages((items) => [...items, { id: crypto.randomUUID(), role, content, sourceId, actions }]);
  }

  function respondWithSourcePlan(source: WorkspaceSource, context?: string) {
    const message = buildSourcePlan(source, locale, context);
    pushMessage("assistant", message, source.id, "confirm_process");
  }

  async function askAiChat(text: string) {
    try {
      const response = await postJson<ChatApiResponse>("/api/chat", {
        message: text,
        locale,
        has_source: hasSource,
        source_summary: selectedSource ? `${selectedSource.label} · ${selectedSource.detail}` : null,
        phase,
        history: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
      });
      return response.response;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "AI chat failed");
      return buildDiscussionReply(text, locale, hasSource);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-canvas text-ink">
      <header className="flex h-[70px] items-center justify-between border-b border-line bg-canvas/95 px-5 backdrop-blur md:px-7">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="text-muted-foreground hover:text-ink" aria-label="Back">
            <ArrowLeft size={18} />
          </Link>
          <img src="/brand/navbrand.svg" alt="Bizeto PSAK" width="205" height="36" className="block dark:hidden" />
          <img src="/brand/navbrand-dark.svg" alt="Bizeto PSAK" width="205" height="36" className="hidden dark:block" />
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="hidden truncate text-sm font-semibold sm:inline">{t.workspace}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground/80 md:inline">{t.entity} · {t.period}</span>
          <button onClick={() => setLocale(locale === "id" ? "en" : "id")} className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-bold">
            <Languages size={14} /> {locale === "id" ? "EN" : "ID"}
          </button>
          {hasSource && (
            <button onClick={() => setInspector(!inspector)} className={`rounded-lg border border-line bg-panel p-2 ${inspector ? "text-gold" : "text-muted-foreground"}`} aria-label="Toggle inspector">
              <PanelRight size={16} />
            </button>
          )}
        </div>
      </header>

      <div className={`grid h-[calc(100vh-70px)] min-h-0 ${showInspector ? "lg:grid-cols-[236px_minmax(520px,1fr)_328px]" : "lg:grid-cols-[236px_minmax(520px,1fr)]"}`}>
        <aside className="hidden h-full min-h-0 border-r border-line bg-panel/45 p-4 lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {startMode ? (
              <StartSidebar t={t} />
            ) : (
              <WorkspaceSidebar
                locale={locale}
                t={t}
                phase={phase}
                sources={sources}
                selectedSourceId={selectedSource?.id ?? null}
                setSelectedSourceId={setSelectedSourceId}
              />
            )}
          </div>
          <SidebarFooter locale={locale} theme={theme} setTheme={setThemeState} />
        </aside>

        <section className="flex h-full min-w-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 md:px-8 lg:px-10">
            <div className="mx-auto flex min-h-full max-w-4xl flex-col">
              {startMode ? (
                <StartRoom
                  t={t}
                  locale={locale}
                  attachOpen={attachOpen}
                  setAttachOpen={setAttachOpen}
                  chatDraft={chatDraft}
                  updateChatDraft={updateChatDraft}
                  chatRef={chatRef}
                  onFile={onFile}
                  onSend={sendMessage}
                />
              ) : (
                <div className="space-y-4 pb-6">
                  {messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      t={t}
                      source={message.sourceId ? sources.find((item) => item.id === message.sourceId) : undefined}
                      onConfirm={() => {
                        const source = sources.find((item) => item.id === message.sourceId);
                        if (source) void processSource(source);
                      }}
                    />
                  ))}
                  {phase === "processing" && <div className="rounded-xl border border-line bg-panel p-4 text-sm text-muted-foreground">{t.processing}</div>}
                  {apiError && <div className="rounded-xl border border-[#5B482E] bg-[#2C2418] p-4 text-xs text-[#EDCE91]">{apiError}</div>}
                  {resume && (
                    <ResumeCard
                      locale={locale}
                      t={t}
                      resume={resume}
                      confirmed={phase === "confirmed"}
                      onConfirm={confirmResult}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {!startMode && (
            <Composer
              t={t}
              locale={locale}
              attachOpen={attachOpen}
              setAttachOpen={setAttachOpen}
              chatDraft={chatDraft}
              updateChatDraft={updateChatDraft}
              chatRef={chatRef}
              onFile={onFile}
              onSend={sendMessage}
              onReset={reset}
            />
          )}
        </section>

        {showInspector && (
          <Inspector
            locale={locale}
            t={t}
            source={selectedSource}
            phase={phase}
            resume={resume}
            onClose={() => setInspector(false)}
          />
        )}
      </div>
    </main>
  );
}

function StartRoom(props: {
  t: WorkspaceCopy;
  locale: Locale;
  attachOpen: boolean;
  setAttachOpen: (open: boolean) => void;
  chatDraft: string;
  updateChatDraft: (value: string) => void;
  chatRef: RefObject<HTMLTextAreaElement | null>;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onSend: () => void | Promise<void>;
}) {
  const { t, locale, attachOpen, setAttachOpen, chatDraft, updateChatDraft, chatRef, onSend } = props;
  return (
    <div className="flex min-h-[calc(100vh-170px)] flex-col items-center justify-center text-center">
      <div className="mb-7">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground/85">{t.aiName}</p>
        <h1 className="text-3xl font-medium tracking-[-.035em] md:text-[44px] md:leading-tight">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
      </div>
      <div className="relative w-full max-w-4xl rounded-[18px] border border-line bg-panel p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,.24)] ring-1 ring-gold/15 before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-[18px] before:bg-[linear-gradient(90deg,rgba(12,143,124,.32),rgba(184,138,61,.28),rgba(80,112,255,.18))] before:opacity-40 before:blur-xl before:content-['']">
        <div className="relative">
          {attachOpen && (
            <AttachMenu t={t} onFile={props.onFile} className="absolute bottom-16 left-4 z-10" />
          )}
          <textarea
            ref={chatRef}
            value={chatDraft}
            onChange={(event) => updateChatDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            placeholder={t.placeholder}
            rows={3}
            className="max-h-[220px] min-h-28 w-full resize-none border-0 bg-transparent px-1 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setAttachOpen(!attachOpen)} className={`grid size-9 place-items-center rounded-full border border-line ${attachOpen ? "bg-gold text-white" : "bg-muted text-muted-foreground hover:text-ink"}`} aria-label="Add source">
                <Plus size={17} />
              </button>
              <button className="grid size-9 place-items-center rounded-full border border-line bg-muted text-muted-foreground hover:text-ink" aria-label="Voice input">
                <Mic2 size={16} />
              </button>
              <label className="grid size-9 cursor-pointer place-items-center rounded-full border border-line bg-muted text-muted-foreground hover:text-ink" aria-label="Upload file">
                <Upload size={16} />
                <input type="file" className="sr-only" accept=".xlsx,.csv,.pdf,.jpg,.jpeg,.png,.txt,.md,audio/*" onChange={props.onFile} />
              </label>
            </div>
            <button onClick={() => void onSend()} className="grid size-10 place-items-center rounded-lg bg-gold text-white" aria-label="Send">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
        {[
          locale === "id" ? "Diskusi akuntansi" : "Accounting discussion",
          locale === "id" ? "Upload bukti" : "Attach evidence",
          "URL",
          "PSAK",
          locale === "id" ? "Review sebelum proses" : "Review before process",
        ].map((chip) => (
          <span key={chip} className="rounded-full bg-panel px-4 py-2 text-xs font-semibold text-muted-foreground">{chip}</span>
        ))}
      </div>
      <p className="mt-8 rounded-full border border-line bg-panel px-4 py-2 text-xs font-semibold text-muted-foreground">{t.emptyHint}</p>
    </div>
  );
}

function StartSidebar({ t }: { t: WorkspaceCopy }) {
  return (
    <div className="space-y-7">
      <SidebarGroup title={t.explore} items={[
        { icon: Sparkles, label: t.playground },
        { icon: History, label: t.history },
      ]} />
      <SidebarGroup title={t.process} items={[
        { icon: Plus, label: t.newWorkspace, active: true },
        { icon: ClipboardList, label: t.myWorkspaces },
        { icon: Grid2X2, label: t.templates },
      ]} />
      <SidebarGroup title={t.manage} items={[
        { icon: Gauge, label: t.entities },
        { icon: Settings, label: "COA" },
        { icon: BookOpen, label: t.documentation },
      ]} />
    </div>
  );
}

function SidebarGroup({ title, items }: { title: string; items: Array<{ icon: LucideIcon; label: string; active?: boolean }> }) {
  return (
    <div>
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground/75">{title}</p>
      <div className="space-y-1">
        {items.map(({ icon: Icon, label, active }) => (
          <button key={label} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${active ? "bg-muted text-ink" : "text-muted-foreground/80 hover:bg-muted hover:text-ink"}`}>
            <Icon size={15} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachMenu({ t, onFile, className = "" }: { t: WorkspaceCopy; onFile: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>; className?: string }) {
  return (
    <div className={`${className} w-56 rounded-xl border border-line bg-panel p-2 shadow-panel`}>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-ink">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Upload size={15} /></span>
        <span>{t.inputModes.upload}</span>
        <input type="file" className="sr-only" accept=".xlsx,.csv,.pdf,.jpg,.jpeg,.png,.txt,.md,audio/*" onChange={onFile} />
      </label>
      <div className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Sparkles size={15} /></span>
        <span>{t.inputModes.url}</span>
      </div>
    </div>
  );
}

function WorkspaceSidebar(props: {
  locale: Locale;
  t: WorkspaceCopy;
  phase: WorkspacePhase;
  sources: WorkspaceSource[];
  selectedSourceId: string | null;
  setSelectedSourceId: (id: string) => void;
}) {
  const { locale, t, phase, sources, selectedSourceId, setSelectedSourceId } = props;
  return (
    <div className="space-y-5 pb-2">
      <div className="rounded-xl border border-line bg-canvas/45 p-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-gold/15 text-gold">
            <Sparkles size={14} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{t.aiName}</p>
            <p className="text-[10px] font-semibold capitalize text-muted-foreground">{phase.replace("_", " ")}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground/75">{t.sources}</p>
        {sources.length === 0 ? (
          <p className="rounded-lg border border-line bg-canvas/35 p-3 text-xs text-muted-foreground">{t.noSources}</p>
        ) : (
          <div className="space-y-1">
            {sources.map((source) => (
              <button
                key={source.id}
                onClick={() => setSelectedSourceId(source.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                  selectedSourceId === source.id ? "bg-gold/10 text-ink ring-1 ring-gold/25" : "text-muted-foreground hover:bg-muted hover:text-ink"
                }`}
              >
                <FileSpreadsheet size={14} className={selectedSourceId === source.id ? "mt-0.5 shrink-0 text-gold" : "mt-0.5 shrink-0"} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{source.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{source.detail}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground/75">{t.processLog}</p>
        {sources.length === 0 ? (
          <p className="rounded-lg border border-line bg-canvas/35 p-3 text-xs text-muted-foreground">{t.noProcess}</p>
        ) : (
          <div className="space-y-1.5">
            {sources.slice(0, 4).map((source) => (
              <div key={source.id} className="rounded-lg border border-line bg-canvas/35 p-2.5">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${source.status === "confirmed" ? "bg-teal/15 text-teal" : source.status === "failed" ? "bg-red-500/10 text-red-500" : "bg-gold/15 text-gold"}`}>
                    {source.status === "confirmed" ? <Check size={12} /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{source.status.replace("_", " ")}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{locale === "id" ? "Menunggu instruksi eksplisit atau konfirmasi" : "Waiting for explicit instruction or confirmation"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble(props: {
  message: ChatMessage;
  t: WorkspaceCopy;
  source?: WorkspaceSource;
  onConfirm: () => void;
}) {
  const { message, t, source, onConfirm } = props;
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? "bg-gold text-white" : "border border-line bg-panel"}`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {source && (
          <div className="mt-3 rounded-xl border border-line bg-canvas/45 p-3 text-xs">
            <p className="font-bold">{source.label}</p>
            <p className="mt-1 text-muted-foreground">{source.detail}</p>
          </div>
        )}
        {message.actions === "confirm_process" && source?.document && (
          <button onClick={onConfirm} className="mt-3 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white">
            {t.confirmProcess}
          </button>
        )}
      </div>
    </div>
  );
}

function ResumeCard(props: {
  locale: Locale;
  t: WorkspaceCopy;
  resume: BackendResume;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  const { locale, t, resume, confirmed, onConfirm } = props;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-teal/15 text-teal"><Check size={15} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{locale === "id" ? "Resume proses" : "Processing resume"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{resume.summary}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Metric label={locale === "id" ? "Baris dibaca" : "Rows read"} value={String(resume.row_count)} />
        <Metric label={locale === "id" ? "Debit kandidat" : "Debit draft"} value={formatRupiah(resume.debit_total)} />
        <Metric label={locale === "id" ? "Kredit kandidat" : "Credit draft"} value={formatRupiah(resume.credit_total)} />
        <Metric label={locale === "id" ? "Issue" : "Issues"} value={String(resume.issues.length)} warning={resume.issues.length > 0} />
      </div>
      <div className="px-4 pb-4">
        <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>{locale === "id" ? "Confidence" : "Confidence"}</span>
          <span className="text-teal">{Math.round(resume.confidence * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-teal" style={{ width: `${Math.round(resume.confidence * 100)}%` }} /></div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{resume.next_action}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-muted/30 p-3">
        <button className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold">{t.preview}</button>
        <button onClick={onConfirm} disabled={confirmed} className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white disabled:cursor-default disabled:bg-teal">
          {confirmed ? `✓ ${t.confirmed}` : t.confirmResult}
        </button>
      </div>
    </div>
  );
}

function Composer(props: {
  t: WorkspaceCopy;
  locale: Locale;
  attachOpen: boolean;
  setAttachOpen: (open: boolean) => void;
  chatDraft: string;
  updateChatDraft: (value: string) => void;
  chatRef: RefObject<HTMLTextAreaElement | null>;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onSend: () => void | Promise<void>;
  onReset: () => void;
}) {
  const { t, locale, attachOpen, setAttachOpen, chatDraft, updateChatDraft, chatRef, onSend, onReset } = props;
  return (
    <div className="border-t border-line bg-canvas/95 px-5 py-4 backdrop-blur md:px-8 lg:px-10">
      <div className="relative mx-auto max-w-4xl rounded-xl border border-line bg-panel px-3 py-3 shadow-panel">
        {attachOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 z-10 w-56 rounded-xl border border-line bg-panel p-2 shadow-panel">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-ink">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Upload size={15} /></span>
              <span>{t.inputModes.upload}</span>
              <input type="file" className="sr-only" accept=".xlsx,.csv,.pdf,.jpg,.jpeg,.png,.txt,.md,audio/*" onChange={props.onFile} />
            </label>
            <div className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><Sparkles size={15} /></span>
              <span>{t.inputModes.url}</span>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => setAttachOpen(!attachOpen)} className={`mb-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-line ${attachOpen ? "bg-gold text-white" : "bg-muted text-muted-foreground hover:text-ink"}`} aria-label="Attach input source">
            <Plus size={17} />
          </button>
          <button className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-muted text-muted-foreground hover:text-ink" aria-label="Voice input">
            <Mic2 size={16} />
          </button>
          <textarea
            ref={chatRef}
            value={chatDraft}
            onChange={(event) => updateChatDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            placeholder={t.placeholder}
            rows={1}
            className="max-h-[180px] min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => void onSend()} className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-gold text-white" aria-label="Send"><ArrowUp size={15} /></button>
          <button onClick={onReset} className="mb-0.5 hidden rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-ink sm:block">{t.reset}</button>
        </div>
      </div>
    </div>
  );
}

function Inspector(props: {
  locale: Locale;
  t: WorkspaceCopy;
  source: WorkspaceSource | null;
  phase: WorkspacePhase;
  resume: BackendResume | null;
  onClose: () => void;
}) {
  const { locale, t, source, phase, resume, onClose } = props;
  return (
    <aside className="hidden h-full overflow-y-auto border-l border-line bg-panel/45 p-5 lg:block">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{t.inspector}</p>
          <h2 className="mt-2 text-base font-bold">{t.selectedEvidence}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-ink" aria-label="Close inspector"><X size={17} /></button>
      </div>
      {!source ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.noEvidence}</p>
      ) : (
        <>
          <div className="mt-5 rounded-lg border border-line bg-canvas/45 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{source.kind}</p>
            <p className="mt-2 break-words text-sm font-bold">{source.label}</p>
            <p className="mt-2 text-xs text-muted-foreground">{source.detail}</p>
          </div>
          <div className="my-5 border-t border-line" />
          <Info label="Status" value={source.status} teal />
          <Info label="Phase" value={phase.replace("_", " ")} />
          <Info label="Document type" value={source.document?.document_type || (locale === "id" ? "Belum tersedia" : "Not available")} />
          {resume && (
            <div className="mt-5 rounded-lg border border-line bg-canvas/45 p-3 text-xs leading-5 text-muted-foreground">
              <p className="font-bold text-ink">{locale === "id" ? "Resume terakhir" : "Latest resume"}</p>
              <p className="mt-2">{resume.summary}</p>
            </div>
          )}
          {source.status === "confirmed" && (
            <div className="mt-5 flex gap-2 rounded-lg border border-teal/30 bg-teal/10 p-3 text-xs text-teal">
              <BadgeCheck size={16} className="shrink-0" />
              <span>{locale === "id" ? "Draf terkonfirmasi dan siap naik ke tahap berikutnya." : "Draft confirmed and ready for the next stage."}</span>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function SidebarFooter({ locale, theme, setTheme }: { locale: Locale; theme: Theme; setTheme: (theme: Theme) => void }) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex gap-2">
        <button className="grid size-10 place-items-center rounded-lg border border-line bg-canvas/35 text-muted-foreground hover:bg-muted hover:text-ink" aria-label="Settings">
          <Settings size={15} />
        </button>
        <ThemeControl theme={theme} setTheme={setTheme} />
      </div>
      <div className="mt-2 rounded-lg border border-line bg-canvas/45 p-2">
        <div className="flex items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#D9A85B] text-[11px] font-bold text-[#101820]">AR</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">iputera21@gmail.com</p>
            <p className="text-[10px] text-muted-foreground">{locale === "id" ? "Akun aktif" : "Active account"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeControl({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  const nextTheme: Record<Theme, Theme> = {
    system: "light",
    light: "dark",
    dark: "system",
  };
  const Icon = theme === "system" ? Laptop : theme === "light" ? Sun : Moon;
  return (
    <button onClick={() => setTheme(nextTheme[theme])} className="grid size-10 place-items-center rounded-lg border border-line bg-canvas/35 text-muted-foreground hover:bg-muted hover:text-ink" aria-label={`Theme: ${theme}`}>
      <Icon size={14} />
    </button>
  );
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json();
}

async function createUrlSource(url: string): Promise<WorkspaceSource> {
  const source: WorkspaceSource = {
    id: crypto.randomUUID(),
    kind: "url",
    label: url,
    detail: "URL · waiting for content fetch adapter",
    status: "quick_checked",
  };
  try {
    source.document = await postJson<BackendDocument>("/api/inputs/url", {
      url,
      source_label: url,
      metadata: { ingestion: "workspace_chat_url" },
    });
    source.detail = `${source.document.document_type} · content fetch pending`;
  } catch {
    source.status = "failed";
    source.detail = "URL · backend registration failed";
  }
  return source;
}

function buildSourcePlan(source: WorkspaceSource, locale: Locale, context?: string) {
  if (locale === "id") {
    return [
      `Saya sudah menerima sumber: ${source.label}.`,
      "",
      "Cek cepat:",
      `- Jenis sumber: ${source.kind === "file" ? "file attached" : "URL"}`,
      `- Detail: ${source.detail}`,
      context ? `- Konteks chat: ${context}` : null,
      "",
      "Rencana proses yang saya sarankan:",
      "1. Identifikasi tipe dokumen dan struktur data.",
      "2. Ekstrak konten mentah tanpa posting jurnal.",
      "3. Normalisasi ke schema akuntansi Bizeto PSAK.",
      "4. Validasi angka, sumber bukti, dan potensi issue.",
      "5. Buat resume dan preview untuk Anda review.",
      "",
      "Saya belum memproses data ini. Klik Konfirmasi proses, atau tulis instruksi eksplisit seperti “proses file ini”.",
    ].filter(Boolean).join("\n");
  }
  return [
    `I received this source: ${source.label}.`,
    "",
    "Quick check:",
    `- Source kind: ${source.kind === "file" ? "attached file" : "URL"}`,
    `- Detail: ${source.detail}`,
    context ? `- Chat context: ${context}` : null,
    "",
    "Recommended process plan:",
    "1. Identify document type and data structure.",
    "2. Extract raw content without posting journals.",
    "3. Normalize into the Bizeto PSAK accounting schema.",
    "4. Validate numbers, evidence locator, and possible issues.",
    "5. Generate a resume and preview for your review.",
    "",
    "I have not processed this data yet. Click Confirm process, or write an explicit instruction like “process this file”.",
  ].filter(Boolean).join("\n");
}

function buildDiscussionReply(text: string, locale: Locale, hasSource: boolean) {
  if (locale === "id") {
    return `${copy.id.discussionPrefix} ${hasSource ? "karena belum ada instruksi eksplisit untuk memproses bukti, saya akan tetap di mode diskusi. " : ""}Saya menangkap topiknya: “${text}”. Kita bisa bahas konteks akuntansinya dulu, menentukan data apa yang dibutuhkan, atau menyiapkan kriteria validasi sebelum ada proses data.`;
  }
  return `${copy.en.discussionPrefix} ${hasSource ? "because there is no explicit instruction to process the evidence, I will stay in discussion mode. " : ""}I understand the topic as: “${text}”. We can discuss the accounting context, decide which data is required, or define validation criteria before processing any data.`;
}

function isExplicitProcess(text: string) {
  return /\b(proses|process|olah|jalankan|mulai proses|process this|process file)\b/i.test(text);
}

function extractUrl(text: string) {
  return text.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-2 text-base font-bold ${warning ? "text-[#A9782F]" : "text-ink"}`}>{value}</p></div>;
}

function Info({ label, value, teal = false }: { label: string; value: string; teal?: boolean }) {
  return <div className="flex justify-between gap-3 py-2 text-xs"><span className="text-muted-foreground">{label}</span><span className={teal ? "font-semibold text-teal" : "text-right font-medium"}>{value}</span></div>;
}

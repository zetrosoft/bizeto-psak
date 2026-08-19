"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Paperclip,
  Mic,
  Send,
  Building2,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Sun,
  Moon,
  Bot,
  ShieldCheck,
  Info,
  Printer,
  Menu,
  X,
  Plus,
  Search,
  FileSpreadsheet,
  PieChart,
  Scale,
  History,
  Download,
  FileText,
  RotateCcw,
  Check,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

type LayoutState = "new_chat" | "chat_active" | "worksheet_canvas";
type ReportType = "none" | "pnl" | "balance_sheet" | "trial_balance";

interface TransactionRow {
  id: string;
  date: string;
  refNo: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  status: "DRAFT" | "POSTED";
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Array<{
    id: string;
    sender: "user" | "ai";
    text: string;
    hasCanvas?: boolean;
    canvasData?: TransactionRow[];
  }>;
}

export default function GeminiCanvasWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layoutState, setLayoutState] = useState<LayoutState>("new_chat");
  const [activeReport, setActiveReport] = useState<ReportType>("none");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeEntity, setActiveEntity] = useState("PT Sumber Makmur");
  const [activePeriod, setActivePeriod] = useState("Juli 2026");

  // Recents List - hanya bertambah saat chat baru direspons pertama kali
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([
    {
      id: "session-1",
      title: "Ekstraksi PDF General Ledger Toko Sembako",
      timestamp: "Hari ini, 16:33",
      messages: [
        {
          id: "m1",
          sender: "user",
          text: "extract pdf dan tampilkan dalam tabel excel yang editable tiap cell nya",
        },
        {
          id: "m2",
          sender: "ai",
          text: "Saya telah mengekstrak seluruh data dari PDF laporan General Ledger Toko Sembako Kusuma dan menyajikannya dalam aplikasi spreadsheet/Excel interaktif.",
          hasCanvas: true,
        },
      ],
    },
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Data Worksheet Canvas (Editable jika DRAFT, Read-only jika POSTED)
  const [worksheetData, setWorksheetData] = useState<TransactionRow[]>([
    {
      id: "1",
      date: "31/07/2026",
      refNo: "PUR-2026-0131",
      description: "Pembelian di Supplier Sembako",
      accountCode: "1-1101",
      accountName: "Cash in Hand",
      debit: 0,
      credit: 5500000,
      status: "DRAFT",
    },
    {
      id: "2",
      date: "31/07/2026",
      refNo: "PUR-2026-0132",
      description: "Pembelian di TOKO BUDI BAWANG SARLE",
      accountCode: "5-1001",
      accountName: "Beban Operasional Toko",
      debit: 2600000,
      credit: 0,
      status: "DRAFT",
    },
    {
      id: "3",
      date: "31/07/2026",
      refNo: "PUR-2026-0133",
      description: "Pembelian di TOKO BERAS DARMA SARL",
      accountCode: "5-1002",
      accountName: "Beban Pokok Penjualan",
      debit: 3500000,
      credit: 0,
      status: "DRAFT",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔹 Efek Otomatis: Di Layout 3 (Worksheet Canvas), Sidebar Kiri Otomatis Collapse!
  useEffect(() => {
    if (layoutState === "worksheet_canvas") {
      setSidebarOpen(false);
    }
  }, [layoutState]);

  const activeSession = recentSessions.find((s) => s.id === activeSessionId);

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setLayoutState("new_chat");
    setActiveReport("none");
    setSidebarOpen(true);
  };

  const handleSelectRecent = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setActiveReport("none");

    const hasCanvas = session.messages.some((m) => m.hasCanvas);
    if (hasCanvas) {
      setLayoutState("worksheet_canvas");
    } else {
      setLayoutState("chat_active");
      setSidebarOpen(true);
    }
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    const userText = inputPrompt;
    setInputPrompt("");

    const lower = userText.toLowerCase();

    // Cek jika menanyakan laporan
    if (lower.includes("laba rugi") || lower.includes("pnl")) {
      setActiveReport("pnl");
      return;
    }
    if (lower.includes("neraca") || lower.includes("balance")) {
      setActiveReport("balance_sheet");
      return;
    }

    // Jika ini adalah pesan pertama dari New Chat -> Buat Sesi Baru di Recent
    if (layoutState === "new_chat" || !activeSessionId) {
      const newId = `session-${Date.now()}`;
      const isWorksheetRequest = lower.includes("excel") || lower.includes("tabel") || lower.includes("pdf") || lower.includes("extract");

      const newSession: ChatSession = {
        id: newId,
        title: userText.length > 30 ? userText.substring(0, 30) + "..." : userText,
        timestamp: "Baru saja",
        messages: [
          { id: `m-${Date.now()}-1`, sender: "user", text: userText },
          {
            id: `m-${Date.now()}-2`,
            sender: "ai",
            text: isWorksheetRequest
              ? "Saya telah mengekstrak seluruh data transaksi dan menyajikannya dalam aplikasi spreadsheet/Excel interaktif."
              : `Terima kasih. Berdasarkan catatan entitas ${activeEntity}, berikut adalah analisis akuntansi PSAK untuk transaksi Anda.`,
            hasCanvas: isWorksheetRequest,
          },
        ],
      };

      // Tambahkan ke recent
      setRecentSessions([newSession, ...recentSessions]);
      setActiveSessionId(newId);

      if (isWorksheetRequest) {
        setLayoutState("worksheet_canvas");
      } else {
        setLayoutState("chat_active");
      }
    } else {
      // Menambahkan pesan ke sesi aktif yang ada
      setRecentSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            const isWorksheetRequest = lower.includes("excel") || lower.includes("tabel") || lower.includes("pdf");
            return {
              ...s,
              messages: [
                ...s.messages,
                { id: `m-${Date.now()}-1`, sender: "user", text: userText },
                {
                  id: `m-${Date.now()}-2`,
                  sender: "ai",
                  text: "Respon AI diperbarui sesuai konteks historis yang telah disetujui sebelumnya.",
                  hasCanvas: isWorksheetRequest,
                },
              ],
            };
          }
          return s;
        })
      );

      if (lower.includes("excel") || lower.includes("tabel")) {
        setLayoutState("worksheet_canvas");
      }
    }
  };

  const handleCellEdit = (id: string, field: keyof TransactionRow, value: string | number) => {
    setWorksheetData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handlePostAllWorksheet = () => {
    setWorksheetData((prev) => prev.map((row) => ({ ...row, status: "POSTED" })));
  };

  return (
    <div
      className={`h-screen w-screen flex overflow-hidden font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-[#0E141D] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* 🔹 SIDEBAR KIRI (GEMINI STYLE - AUTO COLLAPSE ON CANVAS) */}
      <aside
        className={`flex-shrink-0 border-r border-slate-800/80 bg-[#090D12] flex flex-col justify-between transition-all duration-300 z-30 ${
          sidebarOpen ? "w-64" : "w-0 md:w-16"
        } overflow-hidden`}
      >
        <div className="p-3 space-y-4">
          {/* Header Brand */}
          <div className="flex items-center justify-between px-2 py-1">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-teal-400 p-[1.5px]">
                  <div className="w-full h-full bg-[#0E141D] rounded-[6px] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                </div>
                <span className="font-extrabold text-sm tracking-tight text-slate-100">
                  Bizeto PSAK
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
              title="Toggle Sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleStartNewChat}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl border border-slate-800 bg-[#131B26] text-slate-200 hover:bg-slate-800 transition-all font-medium text-xs shadow-sm ${
              !sidebarOpen && "justify-center px-0"
            }`}
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            {sidebarOpen && <span>Chat baru</span>}
          </button>

          {/* Search Chats (jika sidebar terbuka) */}
          {sidebarOpen && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                className="w-full bg-[#131B26] border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-amber-500/50"
              />
            </div>
          )}

          {/* MENU PINTASAN REPORT (DI ATAS RECENTS) */}
          <div className="pt-2 space-y-1">
            {sidebarOpen && (
              <span className="px-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Pintasan Laporan
              </span>
            )}
            <button
              onClick={() => setActiveReport("pnl")}
              className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                activeReport === "pnl"
                  ? "bg-amber-500/10 text-amber-400 font-bold"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              } ${!sidebarOpen && "justify-center px-0"}`}
              title="Laba Rugi (P&L)"
            >
              <PieChart className="w-4 h-4 text-amber-400" />
              {sidebarOpen && <span>Laba Rugi (P&L)</span>}
            </button>
            <button
              onClick={() => setActiveReport("balance_sheet")}
              className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                activeReport === "balance_sheet"
                  ? "bg-teal-500/10 text-teal-400 font-bold"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              } ${!sidebarOpen && "justify-center px-0"}`}
              title="Balance Sheet"
            >
              <Scale className="w-4 h-4 text-teal-400" />
              {sidebarOpen && <span>Balance Sheet</span>}
            </button>
          </div>

          {/* RECENT CHATS LIST (OTOMATIS TAMPIL SAAT ADA RESPONSE PERTAMA) */}
          <div className="pt-3 border-t border-slate-800/60 space-y-1">
            {sidebarOpen && (
              <span className="px-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Recents
              </span>
            )}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-none">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectRecent(session)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-all ${
                    activeSessionId === session.id
                      ? "bg-slate-800 text-slate-100 font-semibold"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  } ${!sidebarOpen && "justify-center px-0 text-center"}`}
                  title={session.title}
                >
                  {sidebarOpen ? session.title : "💬"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer User Profile */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2 truncate">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-teal-500 flex items-center justify-center font-bold text-[10px] text-slate-950">
                PT
              </div>
              <span className="font-medium text-slate-300 truncate">{activeEntity}</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-amber-500 mx-auto" />
          )}
        </div>
      </aside>

      {/* 🔹 AREA UTAMA (KANVAS DINAMIS 3 LAYOUT) */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0E141D]">
        
        {/* TOP BAR / NAVIGATION HEADER */}
        <header className="h-12 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between bg-[#090D12]/60">
          <div className="flex items-center space-x-3 text-xs">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded bg-slate-800 text-slate-300"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center space-x-2 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-semibold text-slate-200">{activeEntity}</span>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>{activePeriod}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg border border-slate-800 bg-[#131B26] text-amber-400 hover:bg-slate-800"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* 🔹 KONDISI REPORT MODE (PINTASAN LAPORAN) */}
        {activeReport !== "none" ? (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-slate-100">
                {activeReport === "pnl" ? "Laporan Laba Rugi (P&L)" : "Laporan Balance Sheet"}
              </h2>
              <button
                onClick={() => setActiveReport("none")}
                className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Tutup Laporan
              </button>
            </div>
            <div className="p-6 rounded-2xl bg-[#090D12] border border-slate-800 font-mono text-xs space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>TOTAL PENDAPATAN OPERASIONAL</span>
                <span className="font-bold text-teal-400">Rp 150.000.000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-400">
                <span>HARGA POKOK PENJUALAN (HPP 88%)</span>
                <span>(Rp 132.000.000)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700 font-bold text-amber-400 text-sm">
                <span>LABA KOTOR (GROSS PROFIT)</span>
                <span>Rp 18.000.000</span>
              </div>
            </div>
          </div>
        ) : (
          /* 🔹 3 LAYOUT KONDISIONAL */
          <div className="flex-1 flex overflow-hidden">

            {/* 📍 LAYOUT 1: NEW CHAT SCREEN (SETIAP MULAI CHAT BARU) */}
            {layoutState === "new_chat" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#D4AF37] via-amber-200 to-teal-400 bg-clip-text text-transparent">
                    Ada yang bisa dibantu untuk akuntansi hari ini?
                  </h1>
                  <p className="text-xs text-slate-400">
                    Tanyakan regulasi PSAK, unggah nota belanja, atau minta ekstraksi laporan keuangan secara otomatis.
                  </p>
                </div>
              </div>
            )}

            {/* 📍 LAYOUT 2: STANDARD CHAT ACTIVE STREAM */}
            {layoutState === "chat_active" && activeSession && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
                {activeSession.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    } space-y-1`}
                  >
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed max-w-xl ${
                        m.sender === "user"
                          ? "bg-[#131B26] border border-slate-800 text-slate-200"
                          : "bg-transparent text-slate-100"
                      }`}
                    >
                      {m.sender === "ai" && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                          <span className="font-bold text-slate-300">Senior Accountant AI</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* 📍 LAYOUT 3: DYNAMIC SPLIT CANVAS (SIDEBAR AUTO-COLLAPSED) */}
            {layoutState === "worksheet_canvas" && (
              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden w-full">
                {/* Panel Kiri: Chat Context Stream */}
                <div className="w-full md:w-5/12 border-r border-slate-800 flex flex-col justify-between p-4 bg-[#090D12]/40">
                  <div className="overflow-y-auto space-y-4 pr-2">
                    {activeSession?.messages.map((m) => (
                      <div key={m.id} className="text-xs space-y-1">
                        <span className="font-bold text-slate-400">
                          {m.sender === "user" ? "Anda:" : "AI Assistant:"}
                        </span>
                        <p className="text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          {m.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel Kanan: Worksheet Canvas (Spreadsheet Interaktif Editable/Readonly) */}
                <div className="w-full md:w-7/12 flex flex-col h-full bg-[#090D12] border-l border-slate-800">
                  {/* Worksheet Header Bar */}
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#131B26]">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold text-slate-200">
                        General Ledger Toko Sembako Kusuma (Worksheet)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePostAllWorksheet}
                        className="px-3 py-1 rounded bg-gradient-to-r from-[#D4AF37] to-amber-600 text-slate-950 font-bold text-[11px] hover:opacity-90 transition-opacity"
                      >
                        Setujui & Post (Lock Readonly)
                      </button>
                      <button
                        onClick={() => setLayoutState("chat_active")}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Spreadsheet Grid (Editable Tiap Cell jika DRAFT, Readonly jika POSTED) */}
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full border-collapse text-xs text-left">
                      <thead>
                        <tr className="bg-[#131B26] text-slate-400 font-semibold border-b border-slate-800">
                          <th className="p-2 border border-slate-800">No</th>
                          <th className="p-2 border border-slate-800">Tanggal</th>
                          <th className="p-2 border border-slate-800">No Ref</th>
                          <th className="p-2 border border-slate-800">Deskripsi Transaksi</th>
                          <th className="p-2 border border-slate-800 text-right">Debit (IDR)</th>
                          <th className="p-2 border border-slate-800 text-right">Kredit (IDR)</th>
                          <th className="p-2 border border-slate-800 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {worksheetData.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/30">
                            <td className="p-2 border border-slate-800 text-slate-400 font-mono">
                              {row.id}
                            </td>
                            <td className="p-2 border border-slate-800">
                              {row.status === "DRAFT" ? (
                                <input
                                  type="text"
                                  value={row.date}
                                  onChange={(e) => handleCellEdit(row.id, "date", e.target.value)}
                                  className="w-full bg-transparent outline-none font-mono text-amber-300"
                                />
                              ) : (
                                <span className="font-mono text-slate-300">{row.date}</span>
                              )}
                            </td>
                            <td className="p-2 border border-slate-800 font-mono text-slate-400">
                              {row.refNo}
                            </td>
                            <td className="p-2 border border-slate-800">
                              {row.status === "DRAFT" ? (
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) => handleCellEdit(row.id, "description", e.target.value)}
                                  className="w-full bg-transparent outline-none text-slate-100"
                                />
                              ) : (
                                <span className="text-slate-300">{row.description}</span>
                              )}
                            </td>
                            <td className="p-2 border border-slate-800 text-right font-mono">
                              {row.status === "DRAFT" ? (
                                <input
                                  type="number"
                                  value={row.debit}
                                  onChange={(e) => handleCellEdit(row.id, "debit", Number(e.target.value))}
                                  className="w-full bg-transparent text-right outline-none text-teal-400"
                                />
                              ) : (
                                <span className="text-teal-400">{row.debit.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-2 border border-slate-800 text-right font-mono">
                              {row.status === "DRAFT" ? (
                                <input
                                  type="number"
                                  value={row.credit}
                                  onChange={(e) => handleCellEdit(row.id, "credit", Number(e.target.value))}
                                  className="w-full bg-transparent text-right outline-none text-teal-400"
                                />
                              ) : (
                                <span className="text-teal-400">{row.credit.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-2 border border-slate-800 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.status === "DRAFT"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔹 OMNIBAR INPUT TERPUSAT (ATAS BASE FOOTER) */}
        {activeReport === "none" && (
          <div className="p-4 border-t border-slate-800/80 bg-[#090D12]/90">
            <form onSubmit={handleSendPrompt} className="max-w-3xl mx-auto relative flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3.5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Unggah Berkas Nota / PDF / Excel"
              >
                <Plus className="w-5 h-5 text-[#D4AF37]" />
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask Bizeto AI atau unggah berkas..."
                className="w-full py-3.5 pl-12 pr-24 rounded-2xl text-xs md:text-sm bg-[#131B26] border border-slate-800 text-slate-100 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />

              <div className="absolute right-2 flex items-center space-x-1">
                <button
                  type="button"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-600 text-slate-950 hover:opacity-90 font-bold transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

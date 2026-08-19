"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Paperclip,
  Mic,
  Send,
  Building2,
  Calendar,
  ChevronDown,
  Sun,
  Moon,
  Printer,
  X,
  Plus,
  Search,
  FileSpreadsheet,
  PieChart,
  Scale,
  PanelLeftClose,
  PanelLeft,
  Download,
  FileText,
  RotateCcw,
  CheckCircle2,
  Table,
  Filter,
  Maximize2,
  GripVertical,
  Cloud,
  Undo2,
  Redo2,
  Code2,
  Eye,
  Copy,
  Check,
  Search as SearchIcon,
} from "lucide-react";

type LayoutState = "new_chat" | "chat_active" | "worksheet_canvas";
type ReportType = "none" | "pnl" | "balance_sheet";

interface TransactionRow {
  id: string;
  no: number;
  date: string;
  refNo: string;
  description: string;
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
    canvasTitle?: string;
  }>;
}

export default function GeminiCanvasWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layoutState, setLayoutState] = useState<LayoutState>("new_chat");
  const [activeReport, setActiveReport] = useState<ReportType>("none");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputPrompt, setInputPrompt] = useState("");
  const [activeEntity, setActiveEntity] = useState("PT Sumber Makmur");
  const [activePeriod, setActivePeriod] = useState("Juli 2026");

  // State untuk Formula Bar & Active Cell
  const [selectedCell, setSelectedCell] = useState<{ id: string; col: string }>({ id: "2", col: "description" });
  const [formulaValue, setFormulaValue] = useState<string>("Pembelian di Supplier");
  const [autoCalc, setAutoCalc] = useState<boolean>(true);

  // Manual Resizable Split Screen Width (Kolom Kiri Chat %)
  const [leftPanelWidthPercent, setLeftPanelWidthPercent] = useState<number>(38);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Recents List
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
          text: "Saya telah mengekstrak seluruh data dari PDF laporan General Ledger Toko Sembako Kusuma dan menyajikannya dalam aplikasi spreadsheet/Excel interaktif.\n\nDalam aplikasi ini, setiap cell dapat diedit secara langsung, dilengkapi dengan fitur perhitungan saldo otomatis, formula bar, pengurutan/pencarian data, serta opsi ekspor ke file Excel (.xlsx), CSV, atau Print PDF.\n\nBerikut adalah aplikasi spreadsheet interaktif untuk data laporan keuangan tersebut:",
          hasCanvas: true,
          canvasTitle: "General Ledger Toko Sembako Kusuma",
        },
      ],
    },
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 🔹 Data Worksheet Canvas PERSIS SAMA DENGAN SCREENSHOT 3
  const [worksheetData, setWorksheetData] = useState<TransactionRow[]>([
    {
      id: "1",
      no: 1,
      date: "31/07/2026",
      refNo: "—",
      description: "Opening Balance",
      debit: 0,
      credit: 0,
      status: "DRAFT",
    },
    {
      id: "2",
      no: 2,
      date: "31/07/2026",
      refNo: "PUR–2026–0131",
      description: "Pembelian di Supplier",
      debit: 0,
      credit: 5500000,
      status: "DRAFT",
    },
    {
      id: "3",
      no: 3,
      date: "31/07/2026",
      refNo: "PUR–2026–0132",
      description: "Pembelian di TOKO BUDI BAWANG SARLE",
      debit: 0,
      credit: 2600000,
      status: "DRAFT",
    },
    {
      id: "4",
      no: 4,
      date: "31/07/2026",
      refNo: "PUR–2026–0133",
      description: "Pembelian di TOKO BERAS DARMA SARL",
      debit: 0,
      credit: 3500000,
      status: "DRAFT",
    },
    {
      id: "5",
      no: 5,
      date: "31/07/2026",
      refNo: "PUR–2026–0134",
      description: "Pembelian di TOKO BERAS OBOR SARLE",
      debit: 0,
      credit: 1200000,
      status: "DRAFT",
    },
    {
      id: "6",
      no: 6,
      date: "31/07/2026",
      refNo: "PUR–2026–0135",
      description: "Pembelian di TOKO SEMBAKO SARLEG",
      debit: 0,
      credit: 4800000,
      status: "DRAFT",
    },
    {
      id: "7",
      no: 7,
      date: "31/07/2026",
      refNo: "PUR–2026–0136",
      description: "Pembelian di TOKO PLASTIK SJP SARLE",
      debit: 0,
      credit: 950000,
      status: "DRAFT",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto Collapse Sidebar Kiri di Layout 3
  useEffect(() => {
    if (layoutState === "worksheet_canvas") {
      setSidebarOpen(false);
    }
  }, [layoutState]);

  // Handler Resizing Manual
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidthPercent =
          ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidthPercent >= 20 && newWidthPercent <= 65) {
          setLeftPanelWidthPercent(newWidthPercent);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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

    if (lower.includes("laba rugi") || lower.includes("pnl")) {
      setActiveReport("pnl");
      return;
    }
    if (lower.includes("neraca") || lower.includes("balance")) {
      setActiveReport("balance_sheet");
      return;
    }

    if (layoutState === "new_chat" || !activeSessionId) {
      const newId = `session-${Date.now()}`;
      const isWorksheetRequest =
        lower.includes("excel") || lower.includes("tabel") || lower.includes("pdf") || lower.includes("extract");

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
              ? "Saya telah mengekstrak seluruh data dari PDF laporan General Ledger Toko Sembako Kusuma dan menyajikannya dalam aplikasi spreadsheet/Excel interaktif.\n\nDalam aplikasi ini, setiap cell dapat diedit secara langsung, dilengkapi dengan fitur perhitungan saldo otomatis, formula bar, pengurutan/pencarian data, serta opsi ekspor ke file Excel (.xlsx), CSV, atau Print PDF."
              : `Terima kasih. Berdasarkan registri entitas ${activeEntity}, berikut adalah analisis akuntansi PSAK untuk transaksi Anda.`,
            hasCanvas: isWorksheetRequest,
            canvasTitle: isWorksheetRequest ? "General Ledger Toko Sembako Kusuma" : undefined,
          },
        ],
      };

      setRecentSessions([newSession, ...recentSessions]);
      setActiveSessionId(newId);

      if (isWorksheetRequest) {
        setLayoutState("worksheet_canvas");
      } else {
        setLayoutState("chat_active");
      }
    } else {
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
                  canvasTitle: isWorksheetRequest ? "General Ledger Toko Sembako Kusuma" : undefined,
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

  const handleCellClick = (id: string, col: string, val: string) => {
    setSelectedCell({ id, col });
    setFormulaValue(val);
  };

  const handleCellEdit = (id: string, field: keyof TransactionRow, value: string | number) => {
    setWorksheetData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setFormulaValue(String(value));
  };

  const handleAddNewRow = () => {
    const newRow: TransactionRow = {
      id: String(worksheetData.length + 1),
      no: worksheetData.length + 1,
      date: "31/07/2026",
      refNo: `PUR–2026–013${worksheetData.length + 1}`,
      description: "Transaksi Baru",
      debit: 0,
      credit: 1000000,
      status: "DRAFT",
    };
    setWorksheetData([...worksheetData, newRow]);
  };

  const handlePostAllWorksheet = () => {
    setWorksheetData((prev) => prev.map((row) => ({ ...row, status: "POSTED" })));
  };

  return (
    <div
      className={`h-screen w-screen flex overflow-hidden font-sans transition-colors duration-200 select-none ${
        isDarkMode ? "bg-[#0E141D] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* 🔹 SIDEBAR KIRI (GEMINI SIDEBAR) */}
      <aside
        className={`flex-shrink-0 border-r border-slate-800/80 bg-[#090D12] flex flex-col justify-between transition-all duration-300 z-30 ${
          sidebarOpen ? "w-64" : "w-0 md:w-16"
        } overflow-hidden`}
      >
        <div className="p-3 space-y-4">
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

          <button
            onClick={handleStartNewChat}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl border border-slate-800 bg-[#131B26] text-slate-200 hover:bg-slate-800 transition-all font-medium text-xs shadow-sm ${
              !sidebarOpen && "justify-center px-0"
            }`}
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            {sidebarOpen && <span>Chat baru</span>}
          </button>

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

          {/* MENU PINTASAN REPORT */}
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

          {/* RECENT CHATS LIST */}
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

      {/* 🔹 MAIN CONTAINER */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0E141D]">
        
        {/* TOP BAR / NAVIGATION HEADER */}
        <header className="h-12 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between bg-[#090D12]/60 flex-shrink-0">
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

        {/* 🔹 REPORT VIEW */}
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
          /* 🔹 3 LAYOUT UTAMA */
          <div className="flex-1 flex overflow-hidden">

            {/* 📍 LAYOUT 1: NEW CHAT SCREEN */}
            {layoutState === "new_chat" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-2xl mx-auto pb-24">
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
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full pb-28">
                {activeSession.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    } space-y-2`}
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

                      {m.hasCanvas && (
                        <div
                          onClick={() => setLayoutState("worksheet_canvas")}
                          className="mt-4 p-4 rounded-2xl border border-slate-800 bg-[#131B26] hover:bg-slate-800/80 cursor-pointer transition-all flex items-center space-x-3 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                            <Table className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 text-xs">
                              {m.canvasTitle || "General Ledger Report"}
                            </div>
                            <div className="text-[10px] text-teal-400">
                              Klik untuk membuka Aplikasi Spreadsheet Interaktif (Canvas)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* 📍 LAYOUT 3: DYNAMIC RESIZABLE SPLIT CANVAS PERSIS SAMA DENGAN SCREENSHOT 3 */}
            {layoutState === "worksheet_canvas" && (
              <div
                ref={containerRef}
                className="flex-1 flex flex-col md:flex-row h-full overflow-hidden w-full relative"
              >
                {/* 🔹 KOLOM KIRI: CHAT STREAM + INPUT CHAT */}
                <div
                  style={{ width: `${leftPanelWidthPercent}%` }}
                  className="hidden md:flex flex-col h-full border-r border-slate-800 bg-[#090D12]/60 overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeSession?.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${
                          m.sender === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-full ${
                            m.sender === "user"
                              ? "bg-[#131B26] border border-slate-800 text-slate-200"
                              : "bg-transparent text-slate-200"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>

                          {m.hasCanvas && (
                            <div className="mt-3 p-3 rounded-xl border border-slate-800 bg-[#131B26] flex items-center space-x-2 text-xs">
                              <Table className="w-4 h-4 text-teal-400" />
                              <span className="font-semibold text-slate-200 text-[11px]">
                                {m.canvasTitle || "General Ledger Toko Sembako Kusuma"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Chat Di Kolom Ke-2 (Screenshot 3 Alignment) */}
                  <div className="p-3 border-t border-slate-800/80 bg-[#0E141D]">
                    <form onSubmit={handleSendPrompt} className="relative flex items-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute left-3 text-slate-400 hover:text-slate-200"
                      >
                        <Plus className="w-4 h-4 text-[#D4AF37]" />
                      </button>
                      <input
                        type="text"
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        placeholder="Let's write or build together..."
                        className="w-full py-2.5 pl-10 pr-10 rounded-xl text-xs bg-[#131B26] border border-slate-800 text-slate-100 outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        type="submit"
                        className="absolute right-3 text-slate-400 hover:text-amber-400"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* 🔹 MANUAL RESIZE SPLITTER / DRAG HANDLE BAR */}
                <div
                  onMouseDown={startResizing}
                  className="hidden md:flex w-1.5 hover:w-2 bg-slate-800/60 hover:bg-[#D4AF37] cursor-col-resize items-center justify-center transition-all z-20"
                  title="Geser manual untuk mengubah lebar kolom"
                >
                  <GripVertical className="w-3 h-3 text-slate-500 opacity-50 hover:opacity-100" />
                </div>

                {/* 🔹 KOLOM KANAN: PREVIEW POP-OUT WORKSHEET CANVAS (PERSIS SAMA SCREENSHOT 3) */}
                <div
                  style={{ width: `${100 - leftPanelWidthPercent}%` }}
                  className="w-full flex flex-col h-full bg-[#0E141D] p-3 md:p-5 overflow-hidden"
                >
                  {/* Container Card Modal Visual Gemini (Screenshot 3 Match) */}
                  <div className="w-full h-full rounded-2xl border border-slate-800 bg-[#090D12] shadow-2xl flex flex-col overflow-hidden">
                    
                    {/* Header Bar Canvas Modul */}
                    <div className="px-4 py-3 border-b border-slate-800 bg-[#131B26] flex items-center justify-between flex-shrink-0 text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-slate-200">
                          General Ledger Toko Sembako Kusuma
                        </span>
                        <div className="flex items-center space-x-1.5 text-slate-400">
                          <Cloud className="w-3.5 h-3.5 text-slate-400" />
                          <Undo2 className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200 cursor-pointer" />
                          <Redo2 className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200 cursor-pointer" />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                          <button className="px-2.5 py-0.5 rounded text-slate-400 hover:text-slate-200">Code</button>
                          <button className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-100 font-medium">Preview</button>
                        </div>
                        <button
                          onClick={handlePostAllWorksheet}
                          className="p-1 rounded text-slate-400 hover:text-slate-200"
                          title="Post & Lock"
                        >
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        </button>
                        <button
                          onClick={() => setLayoutState("chat_active")}
                          className="p-1 rounded text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Toolbar Opsi Ekspor PERSIS SAMA SCREENSHOT 3 */}
                    <div className="p-3 border-b border-slate-800/80 bg-[#0E141D] flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5">
                          <Download className="w-3.5 h-3.5" />
                          <span>Ekspor Excel (.xlsx)</span>
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-[#131B26] border border-slate-700 text-slate-200 text-xs hover:bg-slate-800 flex items-center space-x-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Unduh CSV</span>
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1">
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Teks Excel</span>
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-[#131B26] border border-slate-700 text-slate-200 text-xs hover:bg-slate-800 flex items-center space-x-1">
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak / PDF</span>
                        </button>
                        <button
                          onClick={handleAddNewRow}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/30 flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Baris</span>
                        </button>
                      </div>

                      <button className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/20 flex items-center space-x-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset PDF Asli</span>
                      </button>
                    </div>

                    {/* Toggle Auto-Hitung Saldo Akhir */}
                    <div className="px-4 py-2 bg-[#090D12] border-b border-slate-800/60 flex items-center space-x-3 text-xs flex-shrink-0">
                      <button
                        onClick={() => setAutoCalc(!autoCalc)}
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                          autoCalc ? "bg-teal-500" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                            autoCalc ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-slate-300 font-medium">Auto-Hitung Saldo Akhir</span>
                    </div>

                    {/* FORMULA BAR PERSIS SCREENSHOT 3 (C2 | fx | Formula Text | Search Input) */}
                    <div className="px-3 py-2 border-b border-slate-800 bg-[#131B26] flex items-center space-x-2 text-xs flex-shrink-0">
                      <div className="px-2.5 py-1 rounded bg-[#090D12] border border-slate-800 font-mono text-slate-300 font-semibold text-center min-w-12">
                        {selectedCell.col === "description" ? "C2" : "B2"}
                      </div>
                      <span className="font-mono text-slate-500 font-bold italic">fx</span>
                      <input
                        type="text"
                        value={formulaValue}
                        onChange={(e) => setFormulaValue(e.target.value)}
                        className="flex-1 bg-[#090D12] border border-slate-800 rounded px-3 py-1 text-slate-200 font-mono outline-none focus:border-teal-500 text-xs"
                      />
                      <div className="relative w-64 hidden sm:block">
                        <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Cari transaksi / no ref..."
                          className="w-full bg-[#090D12] border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-300 outline-none"
                        />
                      </div>
                    </div>

                    {/* BANNER LEDGER REPORT INFO (PERSIS SAMA SCREENSHOT 3) */}
                    <div className="p-4 bg-slate-900/40 border-b border-slate-800 text-xs flex flex-wrap justify-between items-start gap-4 flex-shrink-0">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                            PDF Extraction Result
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            • Account Code: 1-1101
                          </span>
                        </div>
                        <h2 className="text-base font-extrabold text-slate-100 tracking-tight">
                          GENERAL LEDGER REPORT
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          📍 Jl. Sandang Lawe 22, Sidomulyo, Karanggeneng, Boyolali | WA: 085600239869
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-slate-800 bg-[#131B26] text-right text-xs font-mono space-y-0.5">
                        <div className="text-slate-400">
                          Periode: <strong className="text-slate-200">31/07/2026 – 14/08/2026</strong>
                        </div>
                        <div className="text-slate-400">
                          Nama Akun: <strong className="text-teal-400">1-1101 - Cash</strong>
                        </div>
                        <div className="text-slate-400">
                          Mata Uang: <strong className="text-amber-400">IDR (Rupiah)</strong>
                        </div>
                      </div>
                    </div>

                    {/* SPREADSHEET TABLE GRID (HERO INTERACTIVE AREA PERSIS SCREENSHOT 3) */}
                    <div className="flex-1 overflow-auto p-3 bg-[#090D12]">
                      <table className="w-full border-collapse text-xs text-left">
                        <thead>
                          <tr className="bg-[#131B26] text-slate-400 font-semibold border-b border-slate-800">
                            <th className="p-2 border border-slate-800 text-center w-10">#</th>
                            <th className="p-2 border border-slate-800 text-center w-12">A</th>
                            <th className="p-2 border border-slate-800 text-center w-36">B</th>
                            <th className="p-2 border border-slate-800 text-center">C</th>
                            <th className="p-2 border border-slate-800 text-center w-32">D</th>
                            <th className="p-2 border border-slate-800 text-center w-32">E</th>
                          </tr>
                          <tr className="bg-[#0E141D] text-slate-300 font-bold border-b border-slate-800">
                            <th className="p-2.5 border border-slate-800 text-center">No</th>
                            <th className="p-2.5 border border-slate-800">Tanggal</th>
                            <th className="p-2.5 border border-slate-800">No. Ref</th>
                            <th className="p-2.5 border border-slate-800">Deskripsi Transaksi</th>
                            <th className="p-2.5 border border-slate-800 text-right">Debit (IDR)</th>
                            <th className="p-2.5 border border-slate-800 text-right">Kredit (IDR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {worksheetData.map((row) => {
                            const isSelected = selectedCell.id === row.id;
                            return (
                              <tr key={row.id} className="hover:bg-slate-800/30">
                                <td className="p-2.5 border border-slate-800 text-center text-slate-500 font-mono">
                                  {row.no}
                                </td>
                                <td
                                  onClick={() => handleCellClick(row.id, "date", row.date)}
                                  className={`p-2.5 border border-slate-800 font-mono text-slate-300 cursor-pointer ${
                                    isSelected && selectedCell.col === "date"
                                      ? "ring-2 ring-blue-500 bg-blue-500/10"
                                      : ""
                                  }`}
                                >
                                  {row.status === "DRAFT" ? (
                                    <input
                                      type="text"
                                      value={row.date}
                                      onChange={(e) => handleCellEdit(row.id, "date", e.target.value)}
                                      className="w-full bg-transparent outline-none font-bold text-slate-200"
                                    />
                                  ) : (
                                    row.date
                                  )}
                                </td>
                                <td
                                  onClick={() => handleCellClick(row.id, "refNo", row.refNo)}
                                  className={`p-2.5 border border-slate-800 font-mono text-slate-400 cursor-pointer ${
                                    isSelected && selectedCell.col === "refNo"
                                      ? "ring-2 ring-blue-500 bg-blue-500/10"
                                      : ""
                                  }`}
                                >
                                  {row.refNo}
                                </td>
                                <td
                                  onClick={() => handleCellClick(row.id, "description", row.description)}
                                  className={`p-2.5 border border-slate-800 cursor-pointer ${
                                    isSelected && selectedCell.col === "description"
                                      ? "ring-2 ring-blue-500 bg-blue-500/10"
                                      : ""
                                  }`}
                                >
                                  {row.status === "DRAFT" ? (
                                    <input
                                      type="text"
                                      value={row.description}
                                      onChange={(e) =>
                                        handleCellEdit(row.id, "description", e.target.value)
                                      }
                                      className="w-full bg-transparent outline-none font-semibold text-slate-100"
                                    />
                                  ) : (
                                    <span className="font-semibold text-slate-200">
                                      {row.description}
                                    </span>
                                  )}
                                </td>
                                <td
                                  onClick={() =>
                                    handleCellClick(row.id, "debit", String(row.debit))
                                  }
                                  className={`p-2.5 border border-slate-800 text-right font-mono font-semibold text-slate-300 cursor-pointer ${
                                    isSelected && selectedCell.col === "debit"
                                      ? "ring-2 ring-blue-500 bg-blue-500/10"
                                      : ""
                                  }`}
                                >
                                  {row.debit === 0 ? "0,00" : row.debit.toLocaleString("id-ID")}
                                </td>
                                <td
                                  onClick={() =>
                                    handleCellClick(row.id, "credit", String(row.credit))
                                  }
                                  className={`p-2.5 border border-slate-800 text-right font-mono font-semibold text-rose-400 cursor-pointer ${
                                    isSelected && selectedCell.col === "credit"
                                      ? "ring-2 ring-blue-500 bg-blue-500/10"
                                      : ""
                                  }`}
                                >
                                  {row.credit === 0 ? "0,00" : row.credit.toLocaleString("id-ID")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* 🔹 OMNIBAR FOOTER (HANYA LAYOUT 1 & 2) */}
        {activeReport === "none" && layoutState !== "worksheet_canvas" && (
          <div className="p-4 border-t border-slate-800/80 bg-[#090D12]/90 flex-shrink-0">
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

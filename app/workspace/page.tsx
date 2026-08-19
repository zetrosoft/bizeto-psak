"use client";

import React, { useState, useRef } from "react";
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
  Globe,
} from "lucide-react";

type ViewMode = "chat" | "report_pnl" | "report_balance" | "report_trial";
type StatusType = "DRAFT" | "POSTED" | "CONFIRMED";

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  status: StatusType;
}

export default function OmniAgentWorkspace() {
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeEntity, setActiveEntity] = useState("PT Sumber Makmur");
  const [activePeriod, setActivePeriod] = useState("Juli 2026");

  // Sample data untuk simulasi laporan & transaksi konsisten (PostgreSQL Source)
  const [transactions, setTransactions] = useState<TransactionRow[]>([
    {
      id: "TRX-001",
      date: "19/08/2026",
      description: "Pembelian Pertamax Operasional Kantor",
      accountCode: "5-102",
      accountName: "Beban Transportasi & Bbm",
      debit: 250000,
      credit: 0,
      status: "DRAFT",
    },
    {
      id: "TRX-002",
      date: "18/08/2026",
      description: "Pembayaran Tagihan Listrik PLN Juli",
      accountCode: "5-105",
      accountName: "Beban Listrik & Air",
      debit: 1450000,
      credit: 0,
      status: "POSTED",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        setViewMode("chat");
        const newTrx: TransactionRow = {
          id: `TRX-00${transactions.length + 1}`,
          date: "19/08/2026",
          description: `Ekstraksi: ${e.target.files?.[0].name}`,
          accountCode: "5-201",
          accountName: "Beban Operasional Lain-lain",
          debit: 500000,
          credit: 0,
          status: "DRAFT",
        };
        setTransactions([newTrx, ...transactions]);
      }, 1200);
    }
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    const lower = inputPrompt.toLowerCase();
    if (lower.includes("laba rugi") || lower.includes("pnl") || lower.includes("untung")) {
      setViewMode("report_pnl");
    } else if (lower.includes("neraca") || lower.includes("balance")) {
      setViewMode("report_balance");
    } else if (lower.includes("saldo") || lower.includes("trial")) {
      setViewMode("report_trial");
    } else {
      setViewMode("chat");
    }
    setInputPrompt("");
  };

  const confirmAllDrafts = () => {
    setTransactions((prev) =>
      prev.map((t) => (t.status === "DRAFT" ? { ...t, status: "POSTED" } : t))
    );
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-[#090D12] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* 🔹 HEADER UTAMA RESPONSIVE */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between transition-colors ${
          isDarkMode ? "bg-[#0E141D]/90 border-slate-800" : "bg-white/90 border-slate-200"
        }`}
      >
        {/* Brand Logo & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 text-slate-400"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#00A896] p-[2px] flex items-center justify-center shadow-lg shadow-[#00A896]/10">
              <div className="w-full h-full bg-[#0E141D] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#D4AF37] via-amber-200 to-teal-400 bg-clip-text text-transparent">
                Bizeto PSAK
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Omni AI Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Center Controls (Entity & Period Picker - Desktop) */}
        <div className="hidden md:flex items-center space-x-3 text-xs font-medium">
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
              isDarkMode
                ? "bg-[#131B26] border-slate-800 text-slate-300"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{activeEntity}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
              isDarkMode
                ? "bg-[#131B26] border-slate-800 text-slate-300"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <span>{activePeriod}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg border transition-all ${
              isDarkMode
                ? "bg-[#131B26] border-slate-800 text-amber-400 hover:bg-slate-800"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
            }`}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDarkMode
                ? "bg-[#131B26] border-slate-800 text-slate-300 hover:bg-slate-800"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>ID</span>
          </button>
        </div>
      </header>

      {/* 🔹 MOBILE NAVIGATION MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0E141D] px-4 py-3 space-y-2 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Entitas Aktif:</span>
            <span className="font-semibold text-[#D4AF37]">{activeEntity}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400">Periode Pembukuan:</span>
            <span className="font-semibold text-teal-400">{activePeriod}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setViewMode("chat");
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded bg-slate-800 text-slate-200 font-medium text-left"
            >
              💬 Workspace Chat
            </button>
            <button
              onClick={() => {
                setViewMode("report_pnl");
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded bg-slate-800 text-slate-200 font-medium text-left"
            >
              📊 Laporan Laba Rugi
            </button>
          </div>
        </div>
      )}

      {/* 🔹 BODY UTAMA: GENERATIVE ARTIFACT CANVAS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col justify-between space-y-6 pb-28">
        
        {/* VIEW 1: CHAT & DRAFT INGESTION FEED */}
        {viewMode === "chat" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Greeting Banner */}
            <div className="text-center py-6 space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-teal-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>PSAK Financial Engine & 0% Hallucination Native Parser</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Halo, Ada Yang Bisa Diumpan Ke AI Akuntansi Hari Ini?
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
                Unggah nota belanja, buku besar Excel, atau cukup tanyakan laporan keuangan. Data Anda diproses 100% presisi dan tersimpan di PostgreSQL Server.
              </p>
            </div>

            {/* Chat Audit Stream (Cards & Clean HTML Table) */}
            <div className="space-y-4 max-w-4xl mx-auto">
              
              {/* Bot Response Card */}
              <div
                className={`p-4 md:p-6 rounded-2xl border transition-all ${
                  isDarkMode
                    ? "bg-[#0E141D] border-slate-800/80 shadow-xl"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Senior Accountant AI Engine
                    </h3>
                    <span className="text-[10px] text-slate-500">Status: Native Parser Ready • PostgreSQL Staging</span>
                  </div>
                </div>

                {/* Processing Result Table (SOP Mutlak HTML Table) */}
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090D12]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#131B26] text-slate-300 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">ID & Tanggal</th>
                        <th className="p-3">Keterangan Transaksi</th>
                        <th className="p-3">Klasifikasi COA (PSAK)</th>
                        <th className="p-3 text-right">Nominal (IDR)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {transactions.map((trx) => (
                        <tr key={trx.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono text-amber-400 font-medium">{trx.id}</span>
                            <div className="text-[10px] text-slate-500">{trx.date}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-200">{trx.description}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                              {trx.accountCode}
                            </span>
                            <span className="ml-2 text-slate-400">{trx.accountName}</span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-teal-300 whitespace-nowrap">
                            Rp {trx.debit.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                trx.status === "DRAFT"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                              }`}
                            >
                              {trx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Transaksional tersimpan aman di server-side PostgreSQL.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={confirmAllDrafts}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-amber-600 text-slate-950 hover:opacity-90 shadow-md shadow-amber-500/10 transition-all flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Setujui & Post Semua Draf</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FINANCIAL REPORT CANVAS (PROFIT & LOSS) */}
        {viewMode === "report_pnl" && (
          <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
            {/* Header Report Card */}
            <div className="p-6 rounded-2xl border bg-[#0E141D] border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-teal-400 uppercase">
                    PSAK Standard Report
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-slate-100">
                    Laporan Laba Rugi (Profit & Loss Statement)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Entitas: <strong className="text-amber-400">{activeEntity}</strong> • Periode: {activePeriod}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold hover:bg-slate-700 flex items-center space-x-1.5 text-slate-300"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                  <button
                    onClick={() => setViewMode("chat")}
                    className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold hover:bg-teal-500/20"
                  >
                    Kembali ke Chat
                  </button>
                </div>
              </div>

              {/* Financial Data Breakdown */}
              <div className="space-y-3 text-xs md:text-sm font-mono">
                <div className="flex justify-between py-2 border-b border-slate-800/80 text-slate-300">
                  <span>PENDAPATAN OPERASIONAL USAHA</span>
                  <span className="font-bold text-teal-300">Rp 150.000.000</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80 text-slate-400">
                  <span className="pl-4">Harga Pokok Penjualan (HPP Standard 88%)</span>
                  <span>(Rp 132.000.000)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700 font-bold text-amber-400 text-sm bg-amber-500/5 px-2 rounded">
                  <span>LABA KOTOR (GROSS PROFIT)</span>
                  <span>Rp 18.000.000</span>
                </div>

                <div className="pt-4 text-slate-300">
                  <span className="font-sans font-bold text-slate-400 text-[11px] uppercase tracking-wider">
                    BEBAN OPERASIONAL
                  </span>
                  <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-400 pl-4">
                    <span>Beban Listrik, Air & Telepon</span>
                    <span>(Rp 1.450.000)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-400 pl-4">
                    <span>Beban Transportasi & BBM Operasional</span>
                    <span>(Rp 250.000)</span>
                  </div>
                </div>

                <div className="flex justify-between py-3 border-t-2 border-teal-500 text-slate-100 font-bold text-base bg-teal-500/10 px-3 rounded-xl mt-4">
                  <span className="font-sans">LABA BERSIH SEBELUM PAJAK (PPN 11%)</span>
                  <span className="text-teal-300">Rp 16.300.000</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 🔹 OMNI-AGENT COMMAND BAR (FIXED BOTTOM INPUT ULTIMATE) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 border-t backdrop-blur-xl transition-colors ${
          isDarkMode ? "bg-[#0E141D]/95 border-slate-800/80" : "bg-white/95 border-slate-200"
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-2">
          
          {/* Quick Action Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-[11px] font-medium scrollbar-none">
            <span className="text-slate-500 whitespace-nowrap">Pintasan AI:</span>
            <button
              onClick={() => setViewMode("report_pnl")}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 hover:border-amber-400/50 text-slate-300 whitespace-nowrap transition-colors"
            >
              📊 Lihat Laba Rugi
            </button>
            <button
              onClick={() => setViewMode("report_pnl")}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 hover:border-teal-400/50 text-slate-300 whitespace-nowrap transition-colors"
            >
              ⚖️ Neraca Saldo
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 whitespace-nowrap transition-colors"
            >
              🧾 Upload Struk / Invoice
            </button>
          </div>

          {/* Form Input Main Omnibar */}
          <form onSubmit={handleSendPrompt} className="relative flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            />
            
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute left-3 p-2 rounded-xl transition-colors ${
                isUploading
                  ? "animate-pulse text-amber-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
              title="Unggah Berkas Nota / PDF / Excel"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Tanyakan laporan keuangan, upload nota belanja, atau ketik 'Laba Rugi'..."
              className={`w-full py-3.5 pl-12 pr-24 rounded-2xl text-xs md:text-sm border outline-none transition-all ${
                isDarkMode
                  ? "bg-[#090D12] border-slate-700/80 text-slate-100 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  : "bg-slate-100 border-slate-300 text-slate-900 focus:border-teal-500"
              }`}
            />

            {/* Right Buttons Inside Omnibar */}
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
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-600 text-slate-950 hover:opacity-90 transition-opacity font-bold shadow-md shadow-amber-500/10"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

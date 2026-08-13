from __future__ import annotations

import json
import urllib.error
import urllib.request

from app.core.config import MCP_BASE_URL, MCP_CHAT_TIMEOUT_SECONDS


def call_mcp_chat(prompt: str, system_prompt: str, agent_role: str = "accounting_bot") -> dict[str, str | bool]:
    payload = json.dumps({
        "prompt": prompt,
        "systemPrompt": system_prompt,
        "agent_role": agent_role,
    }).encode("utf-8")
    request = urllib.request.Request(
        f"{MCP_BASE_URL.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=MCP_CHAT_TIMEOUT_SECONDS) as response:
            body = json.loads(response.read().decode("utf-8"))
            return {
                "response": body.get("response", ""),
                "provider": "mcp.samkarsa.com/api/chat",
                "fallback": False,
            }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {
            "response": f"MCP chat belum tersedia: {exc}",
            "provider": "local_fallback",
            "fallback": True,
        }


def build_bizeto_chat_system_prompt(locale: str, entity_name: str | None = None, has_source: bool = False, phase: str = "discussion", source_summary: str | None = None) -> str:
    language = "Bahasa Indonesia" if locale == "id" else "English"
    entity_ctx = f"Entitas/Klien aktif saat ini: {entity_name}." if entity_name else "Belum ada entitas/klien aktif terpilih."
    source_rule = (
        "Jika ada attachment/URL, jangan memproses data kecuali user eksplisit meminta proses atau klik konfirmasi. "
        "Untuk attachment/URL, bantu jelaskan quick check, risiko, dan rencana proses."
        if has_source
        else "Jika tidak ada attachment/URL, jawab sebagai diskusi akuntansi biasa. Jangan mengaku memproses data."
    )
    return "\n".join([
        "Anda adalah Senior Akuntan AI di aplikasi Bizeto PSAK yang terhubung langsung dengan MCP Server backend.",
        f"Selalu jawab menggunakan {language} (atau sesuaikan persis dengan bahasa yang digunakan pengguna saat bertanya).",
        f"Konteks Entitas: {entity_ctx}",
        "DILARANG Memberikan template statis/kaku bot. Jawablah secara organis, alami, dan responsif langsung sesuai dengan maksud/intent asli pengguna.",
        "DILARANG menutup diskusi. Selalu hubungkan jawaban dengan konteks akuntansi PSAK dan buka diskusi lanjutan yang alami.",
        "Ikuti PSAK sebagai guardrail konseptual, tetapi jangan memberikan final posting jurnal tanpa review manusia.",
        source_rule,
        f"Phase workspace saat ini: {phase}.",
        f"Ringkasan source terpilih: {source_summary or 'Tidak ada source terpilih.'}",
    ])

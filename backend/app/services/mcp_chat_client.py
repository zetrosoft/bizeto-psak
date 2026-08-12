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


def build_bizeto_chat_system_prompt(locale: str, has_source: bool, phase: str, source_summary: str | None = None) -> str:
    language = "Bahasa Indonesia" if locale == "id" else "English"
    source_rule = (
        "Jika ada attachment/URL, jangan memproses data kecuali user eksplisit meminta proses atau klik konfirmasi. "
        "Untuk attachment/URL, bantu jelaskan quick check, risiko, dan rencana proses."
        if has_source
        else "Jika tidak ada attachment/URL, jawab sebagai diskusi akuntansi biasa. Jangan mengaku memproses data."
    )
    return "\n".join([
        "Anda adalah Senior Akuntan AI di aplikasi Bizeto PSAK.",
        f"Gunakan {language}.",
        "Gaya jawaban modern, jelas, profesional, ringkas, dan mudah dipahami.",
        "Ikuti PSAK sebagai guardrail konseptual, tetapi jangan memberikan final posting jurnal tanpa review manusia.",
        source_rule,
        f"Phase workspace saat ini: {phase}.",
        f"Ringkasan source terpilih: {source_summary or 'Tidak ada source terpilih.'}",
    ])

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request

from app.core.config import MCP_BASE_URL, MCP_CHAT_TIMEOUT_SECONDS


def call_mcp_ocr_receipt(file_bytes: bytes, mime_type: str) -> dict:
    payload = json.dumps({
        "file_b64": base64.b64encode(file_bytes).decode("utf-8"),
        "mime_type": mime_type,
        "context": {
            "app_context": "bizeto_psak",
            "tenant_id": "bizeto_psak_local",
        },
    }).encode("utf-8")
    request = urllib.request.Request(
        f"{MCP_BASE_URL.rstrip('/')}/tools/ocr_receipt",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=max(MCP_CHAT_TIMEOUT_SECONDS, 90)) as response:
            content_type = response.headers.get("content-type", "")
            raw_body = response.read().decode("utf-8")
            if "application/json" not in content_type.lower():
                return {
                    "text": (
                        "OCR Vision MCP belum tersedia untuk production route. "
                        f"Endpoint {MCP_BASE_URL.rstrip('/')}/tools/ocr_receipt mengembalikan "
                        f"content-type `{content_type}` sehingga kemungkinan masih diarahkan ke UI/admin panel, bukan REST tools API."
                    ),
                    "provider": "mcp_tools_route_unavailable",
                    "fallback": True,
                }
            body = json.loads(raw_body)
            content = body.get("content") or []
            text = content[0].get("text", "") if content else ""
            return {
                "text": text,
                "provider": "mcp.samkarsa.com/tools/ocr_receipt",
                "fallback": False,
            }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {
            "text": f"OCR Vision MCP belum tersedia: {exc}",
            "provider": "local_fallback",
            "fallback": True,
        }

import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DATA_DIR = BACKEND_ROOT / ".data"
UPLOAD_DIR = DATA_DIR / "uploads"
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://jkk_user:jkk_super_secret_password@jkk-db:5432/bizeto_psak_db"
)
DB_PATH = DATA_DIR / "bizeto_psak_drafts.sqlite3"

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MCP_BASE_URL = os.environ.get("MCP_SERVER_URL", "https://mcp.samkarsa.com")
MCP_CHAT_TIMEOUT_SECONDS = 45

SUPPORTED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".txt",
    ".md",
    ".m4a",
    ".mp3",
    ".wav",
}

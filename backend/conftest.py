# Root-level conftest.py — runs before any test module is collected.
# Sets DATABASE_URL to SQLite so psycopg2 is never imported.
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

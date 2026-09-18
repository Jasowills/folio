import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface SessionRow {
  id: string;
  title: string;
  provider_id: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  session_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  created_at: string;
}

/**
 * Local SQLite store (better-sqlite3, sync). Per-user machine only —
 * sessions, tracker, contacts, verification cache, application log.
 * Secrets (API keys, OAuth tokens) NEVER go here — OS keychain only.
 */
export class SessionStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolved =
      dbPath ??
      join(homedir(), '.folio-v2', 'folio.db');
    mkdirSync(dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled session',
        provider_id TEXT NOT NULL DEFAULT 'ollama',
        model TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tool_calls TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
      CREATE TABLE IF NOT EXISTS tracker (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'researching',
        contact TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        company TEXT,
        role TEXT,
        confidence TEXT NOT NULL DEFAULT 'general',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS verification_cache (
        company TEXT PRIMARY KEY,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        summary TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  createSession(input: { title?: string; providerId?: string; model?: string }): SessionRow {
    const id = crypto.randomUUID();
    this.db
      .prepare(
        `INSERT INTO sessions (id, title, provider_id, model) VALUES (?, ?, ?, ?)`,
      )
      .run(id, input.title ?? 'Untitled session', input.providerId ?? 'ollama', input.model ?? '');
    return this.getSession(id)!;
  }

  getSession(id: string): SessionRow | undefined {
    return this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as
      | SessionRow
      | undefined;
  }

  listSessions(limit = 50): SessionRow[] {
    return this.db
      .prepare(`SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?`)
      .all(limit) as SessionRow[];
  }

  addMessage(sessionId: string, role: string, content: string, toolCalls?: string): void {
    this.db
      .prepare(
        `INSERT INTO messages (session_id, role, content, tool_calls) VALUES (?, ?, ?, ?)`,
      )
      .run(sessionId, role, content, toolCalls ?? null);
    this.db
      .prepare(`UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`)
      .run(sessionId);
  }

  getMessages(sessionId: string): MessageRow[] {
    return this.db
      .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC`)
      .all(sessionId) as MessageRow[];
  }

  logActivity(sessionId: string | null, summary: string, detail?: string): void {
    this.db
      .prepare(`INSERT INTO activity_log (session_id, summary, detail) VALUES (?, ?, ?)`)
      .run(sessionId, summary, detail ?? null);
  }

  getActivity(sessionId: string, limit = 100) {
    return this.db
      .prepare(`SELECT * FROM activity_log WHERE session_id = ? ORDER BY id DESC LIMIT ?`)
      .all(sessionId, limit);
  }

  close(): void {
    this.db.close();
  }
}

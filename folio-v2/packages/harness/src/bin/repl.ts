#!/usr/bin/env node
/**
 * Headless harness REPL — `pnpm harness:dev`.
 * Drives the agent loop from a terminal with zero Electron dependency,
 * so tool behavior can be validated during development (spec §2).
 *
 * Commands:
 *   /providers            list adapters + capability badges
 *   /use <id>             switch preferred provider
 *   /new [title]          start a new persisted session
 *   /sessions             list recent sessions
 *   /resume <id>          resume a session
 *   /tools                list registered tool definitions
 *   /log                  show activity log for current session
 *   /quit                 exit
 * Anything else is sent as a user message.
 */
import { createInterface } from 'node:readline';
import { z } from 'zod';
import { config } from '../config.js';
import { chatStructured, chatText, describeCapabilities } from '../loop.js';
import { SessionStore } from '../memory/store.js';
import { ModelRouter } from '../models/router.js';
import { buildAdapters } from '../models/providers.js';
import { ToolRegistry } from '../tools/registry.js';
import type { ProviderId } from '@folio/shared-types';
import type { ChatMessage } from '@folio/shared-types';

const DemoSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
});

async function main(): Promise<void> {
  const adapters = buildAdapters({ ...process.env });
  const router = new ModelRouter(adapters);
  const store = new SessionStore(config.dbPath);
  const tools = new ToolRegistry();

  let prefer = config.defaultProvider as ProviderId;
  let session = store.createSession({ title: 'REPL session', providerId: prefer });
  let history: ChatMessage[] = [];

  console.log('folio harness REPL — type /quit to exit, /providers to list models.');
  console.log(`session ${session.id} · prefer ${prefer}`);

  // Piped (non-TTY) stdin: buffer ALL lines up front so slow model calls
  // can't race EOF. Interactive TTY keeps readline for line editing.
  const useReadline = process.stdin.isTTY === true;
  const queued: string[] = [];
  let stdinEnded = false;
  let rl: ReturnType<typeof createInterface> | null = null;
  let inputClosed = false;

  if (useReadline) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.on('close', () => {
      inputClosed = true;
    });
    rl.setPrompt('> ');
  } else {
    process.stdin.setEncoding('utf8');
    let buf = '';
    process.stdin.on('data', (chunk: string) => {
      buf += chunk;
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        queued.push(buf.slice(0, idx).replace(/\r$/, ''));
        buf = buf.slice(idx + 1);
      }
    });
    process.stdin.on('end', () => {
      if (buf.length) queued.push(buf.replace(/\r$/, ''));
      stdinEnded = true;
    });
    process.stdin.resume();
  }

  /** No-op once stdin EOF has closed the interface (piped input). */
  const prompt = () => {
    if (useReadline && rl && !inputClosed) {
      try {
        rl.prompt();
      } catch {
        /* interface closed mid-flight — loop exit handles it */
      }
    }
  };

  async function* inputLines(): AsyncGenerator<string> {
    if (useReadline && rl) {
      for await (const rawLine of rl) yield rawLine;
      return;
    }
    for (;;) {
      const next = queued.shift();
      if (next !== undefined) {
        yield next;
        continue;
      }
      if (stdinEnded) return;
      await new Promise((res) => setTimeout(res, 25));
    }
  }

  prompt();

  for await (const rawLine of inputLines()) {
    const line = rawLine.trim();
    if (!line) {
      prompt();
      continue;
    }
    if (line === '/quit') break;

    if (line === '/providers') {
      for (const a of router.list()) console.log(`  ${describeCapabilities(a)}`);
      prompt();
      continue;
    }
    if (line.startsWith('/use ')) {
      const id = line.slice(5).trim() as ProviderId;
      if (!router.get(id)) {
        console.log(`  unknown or unconfigured provider: ${id}`);
        prompt();
        continue;
      }
      prefer = id;
      console.log(`  prefer → ${prefer}`);
      prompt();
      continue;
    }
    if (line === '/sessions') {
      for (const s of store.listSessions()) {
        console.log(`  ${s.id} · ${s.title} · ${s.provider_id} · ${s.updated_at}`);
      }
      prompt();
      continue;
    }
    if (line.startsWith('/new')) {
      const title = line.slice(4).trim() || 'REPL session';
      session = store.createSession({ title, providerId: prefer });
      history = [];
      console.log(`  new session ${session.id}`);
      prompt();
      continue;
    }
    if (line.startsWith('/resume ')) {
      const id = line.slice(8).trim();
      const found = store.getSession(id);
      if (!found) {
        console.log('  no such session');
        prompt();
        continue;
      }
      session = found;
      history = store
        .getMessages(session.id)
        .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content }));
      console.log(`  resumed ${session.id} (${history.length} messages)`);
      prompt();
      continue;
    }
    if (line === '/tools') {
      for (const t of tools.definitions()) console.log(`  ${t.name} — ${t.description}`);
      prompt();
      continue;
    }
    if (line === '/log') {
      for (const e of store.getActivity(session.id) as Array<{ summary: string; created_at: string }>) {
        console.log(`  [${e.created_at}] ${e.summary}`);
      }
      prompt();
      continue;
    }
    if (line === '/structured') {
      // Smoke-test for the zod repair loop without needing a JD.
      try {
        const r = await chatStructured(router, DemoSchema, [
          { role: 'system', content: 'Return ONLY valid JSON matching the schema.' },
          { role: 'user', content: 'Classify this message: "tailor my resume for Stripe".' },
        ], { prefer });
        console.log(`  [${r.adapterId}/${r.model} repairs=${r.repairs}]`, JSON.stringify(r.value));
      } catch (err) {
        console.log(`  error: ${String(err).slice(0, 300)}`);
      }
      prompt();
      continue;
    }

    const userMsg: ChatMessage = { role: 'user', content: line };
    history.push(userMsg);
    store.addMessage(session.id, 'user', line);
    try {
      const r = await chatText(router, history, { prefer });
      history.push({ role: 'assistant', content: r.text });
      store.addMessage(session.id, 'assistant', r.text);
      store.logActivity(session.id, `turn via ${r.adapterId}/${r.model}`);
      console.log(`[${r.adapterId}] ${r.text}`);
    } catch (err) {
      console.log(`  error: ${String(err).slice(0, 500)}`);
    }
    if (inputClosed) break;
    prompt();
  }

  rl?.close();
  store.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

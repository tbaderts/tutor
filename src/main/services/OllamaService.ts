import type { ChatMessage, LlmStatus } from '../../shared/types/tutor';

interface ChatOptions {
  json?: boolean;
  temperature?: number;
}

/** Drops <think>…</think> blocks of reasoning models (qwen3, deepseek-r1) from a streamed answer. */
export class ThinkFilter {
  private inThink = false;

  push(chunk: string): string {
    let out = '';
    while (chunk) {
      if (this.inThink) {
        const end = chunk.indexOf('</think>');
        if (end < 0) return out;
        chunk = chunk.slice(end + '</think>'.length);
        this.inThink = false;
      } else {
        const start = chunk.indexOf('<think>');
        if (start < 0) return out + chunk;
        out += chunk.slice(0, start);
        chunk = chunk.slice(start + '<think>'.length);
        this.inThink = true;
      }
    }
    return out;
  }
}

export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/** The local Ollama server: translation, feedback and the Ask chat. */
export class OllamaService {
  private statusCache: { at: number; status: LlmStatus } | null = null;

  constructor(private settings: () => { host: string; model: string }) {}

  private url(p: string): string {
    return this.settings().host.replace(/\/+$/, '') + p;
  }

  async models(): Promise<string[]> {
    const res = await fetch(this.url('/api/tags'), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Ollama answered ${res.status}`);
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name).sort();
  }

  /** Reachability and installed models, cached briefly because the status bar polls it. */
  async status(maxAgeMs = 15_000): Promise<LlmStatus> {
    if (this.statusCache && Date.now() - this.statusCache.at < maxAgeMs) return this.statusCache.status;
    let status: LlmStatus;
    try {
      const models = await this.models();
      const wanted = this.settings().model;
      const name = wanted.includes(':') ? wanted : `${wanted}:latest`;
      status = models.includes(name)
        ? { ok: true, models }
        : { ok: false, models, error: `Model '${wanted}' is not installed. Run: ollama pull ${wanted}` };
    } catch (err) {
      status = { ok: false, models: [], error: `Cannot reach Ollama at ${this.settings().host}: ${(err as Error).message}` };
    }
    this.statusCache = { at: Date.now(), status };
    return status;
  }

  invalidateStatus(): void {
    this.statusCache = null;
  }

  async chat(system: string, user: string, options: ChatOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.settings().model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      stream: false,
      keep_alive: '15m',
      options: { temperature: options.temperature ?? 0.2 },
    };
    if (options.json) body.format = 'json';
    const res = await fetch(this.url('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message: { content: string } };
    return stripThink(data.message.content);
  }

  /** JSON-mode chat; an unparsable answer comes back as `{ feedback: <raw text> }`. */
  async chatJson(system: string, user: string): Promise<Record<string, unknown>> {
    const raw = await this.chat(system, user, { json: true });
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { verdict: '?', feedback: raw };
    }
  }

  /** Multi-turn chat; `onChunk` receives the answer as it arrives. Resolves with the whole answer. */
  async chatStream(system: string, messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const res = await fetch(this.url('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.settings().model,
        messages: [{ role: 'system', content: system }, ...messages],
        stream: true,
        keep_alive: '15m',
        options: { temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(300_000),
    });
    if (!res.ok || !res.body) throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);

    const filter = new ThinkFilter();
    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = '';
    let answer = '';
    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const parsed = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (parsed.error) throw new Error(parsed.error);
      const text = filter.push(parsed.message?.content ?? '');
      if (text) {
        answer += text;
        onChunk(text);
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handleLine);
    }
    handleLine(buffer);
    return answer.trim();
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { HistoryEntry } from '../../shared/types/tutor';

const MAX_ENTRIES = 2000;

/** Practice attempts, newest first, kept in <config dir>/history.json across sessions. */
export class HistoryService {
  private entries: HistoryEntry[] = [];
  private file: string;

  constructor(configDir: string) {
    this.file = path.join(configDir, 'history.json');
    try {
      if (fs.existsSync(this.file)) this.entries = JSON.parse(fs.readFileSync(this.file, 'utf-8')) as HistoryEntry[];
    } catch (err) {
      console.error('[history] could not read history:', err);
    }
  }

  list(): HistoryEntry[] {
    return this.entries;
  }

  add(entry: Omit<HistoryEntry, 'id' | 'at'>): HistoryEntry {
    const full: HistoryEntry = { id: randomUUID(), at: new Date().toISOString(), ...entry };
    this.entries = [full, ...this.entries].slice(0, MAX_ENTRIES);
    this.persist();
    return full;
  }

  clear(): void {
    this.entries = [];
    this.persist();
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.entries, null, 2), 'utf-8');
  }
}

import * as fs from 'fs';
import * as path from 'path';
import type { ItemProgress, ProgressMap } from '../../shared/types/lessons';

/** Best and last score per lesson item, in <config dir>/progress.json. */
export class ProgressService {
  private progress: ProgressMap = {};
  private file: string;

  constructor(configDir: string) {
    this.file = path.join(configDir, 'progress.json');
    try {
      if (fs.existsSync(this.file)) this.progress = JSON.parse(fs.readFileSync(this.file, 'utf-8')) as ProgressMap;
    } catch (err) {
      console.error('[progress] could not read progress:', err);
    }
  }

  all(): ProgressMap {
    return this.progress;
  }

  record(key: string, score: number): ItemProgress {
    const prev = this.progress[key];
    const entry: ItemProgress = {
      best: Math.max(prev?.best ?? 0, score),
      last: score,
      attempts: (prev?.attempts ?? 0) + 1,
      lastAt: new Date().toISOString(),
    };
    this.progress[key] = entry;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.progress, null, 2), 'utf-8');
    return entry;
  }

  /** Forgets every item whose key starts with the prefix (one lesson: "<lessonId>/"). */
  reset(prefix: string): void {
    for (const key of Object.keys(this.progress)) if (key.startsWith(prefix)) delete this.progress[key];
    fs.writeFileSync(this.file, JSON.stringify(this.progress, null, 2), 'utf-8');
  }
}

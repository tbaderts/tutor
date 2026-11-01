import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_CONFIG, type TutorConfig } from '../../shared/types/config';

/** Settings live in ~/.tutor/config.json (TUTOR_CONFIG_DIR overrides the folder). */
export class ConfigService {
  private config: TutorConfig = structuredClone(DEFAULT_CONFIG);
  private configFile: string;

  constructor(private configDir: string = process.env.TUTOR_CONFIG_DIR || path.join(os.homedir(), '.tutor')) {
    this.configFile = path.join(configDir, 'config.json');
  }

  async load(): Promise<TutorConfig> {
    try {
      if (fs.existsSync(this.configFile)) {
        const loaded = JSON.parse(fs.readFileSync(this.configFile, 'utf-8')) as Partial<TutorConfig>;
        this.config = this.merge(DEFAULT_CONFIG, loaded);
      } else {
        await this.save(this.config);
      }
    } catch (err) {
      console.error('[config] could not read config, using defaults:', err);
      this.config = structuredClone(DEFAULT_CONFIG);
    }
    return this.config;
  }

  async save(config: TutorConfig): Promise<void> {
    this.config = config;
    fs.mkdirSync(this.configDir, { recursive: true });
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  getConfig(): TutorConfig {
    return this.config;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  /** Configured models folder, or ~/.tutor/models. */
  getModelsDir(): string {
    return this.config.speech.modelsDir.trim() || path.join(this.configDir, 'models');
  }

  private merge(defaults: TutorConfig, overrides: Partial<TutorConfig>): TutorConfig {
    const result = structuredClone(defaults) as any;
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = { ...result[key], ...value };
      } else if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}

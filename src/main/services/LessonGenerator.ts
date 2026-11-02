import type { ConfigService } from './ConfigService';
import type { LessonService } from './LessonService';
import type { OllamaService } from './OllamaService';
import { fromGenerated, LESSON_SCHEMA, slugify, toSchemaShape, type GeneratedDraft, type GenerateRequest } from '../../shared/lessonGen';
import { nativeLanguageName, targetLanguage } from '../../shared/languages';
import { lessonPrompt } from '../../shared/prompts';
import type { Topic } from '../../shared/types/lessons';

/** A whole lesson plus the example in the prompt needs more than Ollama's default context. */
const NUM_CTX = 8192;
/** A small model on a busy GPU (or the CPU) can take minutes for a whole lesson. */
const TIMEOUT_MS = 15 * 60_000;
/** The shipped lesson shown to the model as a worked example, if the language has it. */
const EXAMPLE_LESSON = 'sports-3';

/** Has the Ollama model write a lesson, then checks and tidies it. Nothing is saved here. */
export class LessonGenerator {
  private running = new Map<string, AbortController>();

  constructor(private config: ConfigService, private lessons: LessonService, private ollama: OllamaService) {}

  async generate(requestId: string, req: GenerateRequest, onProgress: (chars: number) => void): Promise<GeneratedDraft> {
    const { general, llm } = this.config.getConfig();
    const target = targetLanguage(general.targetLanguage);
    const model = req.model || llm.model;
    const description = req.description.trim();
    if (!description) throw new Error('Describe what the lesson should be about.');

    const catalog = this.lessons.catalog(general.targetLanguage);
    const newTopic: Topic | undefined = req.newTopic?.trim()
      ? { id: slugify(req.newTopic), title: req.newTopic.trim(), description: '', icon: 'BookOpen' }
      : undefined;
    const topic = newTopic ?? catalog.topics.find((t) => t.id === req.topicId);
    if (!topic) throw new Error('Pick a topic for the lesson.');

    const example = catalog.lessons.find((l) => l.id === EXAMPLE_LESSON) ?? catalog.lessons.find((l) => l.source === 'bundled');
    const user = [
      `Write a ${req.level} lesson about: ${description}`,
      `It belongs to the topic "${topic.title}".`,
      example &&
        `\nHere is an example of a finished lesson in the same JSON format (about "${example.subtitle}"). ` +
          `Write a NEW lesson about the subject above in ${target.name}; do not copy the example.\n` +
          JSON.stringify(toSchemaShape(example)),
    ]
      .filter(Boolean)
      .join('\n');

    const controller = new AbortController();
    this.running.set(requestId, controller);
    let chars = 0;
    try {
      const raw = await this.ollama.chatStream(
        lessonPrompt(nativeLanguageName(general.nativeLanguage), target.name, req.level),
        [{ role: 'user', content: user }],
        (chunk) => onProgress((chars += chunk.length)),
        { format: LESSON_SCHEMA, temperature: 0.5, numCtx: NUM_CTX, model, timeoutMs: TIMEOUT_MS, signal: controller.signal },
      );
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('The model did not return valid JSON. Try again, or pick a larger model.');
      }
      const id = `gen-${slugify(description)}-${Date.now().toString(36)}`;
      return { lesson: fromGenerated(parsed, { id, topic: topic.id, level: req.level, model }), newTopic };
    } catch (err) {
      if (controller.signal.aborted) throw new Error('Cancelled.');
      throw err;
    } finally {
      this.running.delete(requestId);
    }
  }

  cancel(requestId: string): void {
    this.running.get(requestId)?.abort();
  }
}

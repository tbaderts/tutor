import { normWords } from './wordDiff';
import type { Dialogue, Lesson, LessonItem, LessonSection, ProgressMap, Topic } from './types/lessons';

/** An item counts as mastered from this best score on. */
export const MASTERY_SCORE = 80;

/** Speaker name of the learner's lines in a dialogue. */
export const LEARNER = 'you';

/** Progress key of an item: stable when lessons are reordered or edited elsewhere. */
export function itemKey(lessonId: string, section: LessonSection, text: string): string {
  return `${lessonId}/${section}/${normWords(text).join(' ')}`;
}

/** Every item the learner can say in a lesson, with its progress key. */
export function speakableItems(lesson: Lesson): { key: string; text: string }[] {
  const items = [
    ...lesson.vocabulary.map((i) => ({ key: itemKey(lesson.id, 'vocabulary', i.text), text: i.text })),
    ...lesson.phrases.map((i) => ({ key: itemKey(lesson.id, 'phrases', i.text), text: i.text })),
    ...(lesson.dialogue?.lines ?? [])
      .filter((l) => l.speaker === LEARNER)
      .map((l) => ({ key: itemKey(lesson.id, 'dialogue', l.text), text: l.text })),
    ...lesson.challenge.map((i) => ({ key: itemKey(lesson.id, 'challenge', i.text), text: i.text })),
  ];
  return items;
}

export function lessonProgress(lesson: Lesson, progress: ProgressMap): { mastered: number; total: number; percent: number } {
  const items = speakableItems(lesson);
  const mastered = items.filter((i) => (progress[i.key]?.best ?? 0) >= MASTERY_SCORE).length;
  return { mastered, total: items.length, percent: items.length ? Math.round((100 * mastered) / items.length) : 0 };
}

// ---------------------------------------------------------------- validation of parsed YAML

class LessonError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function str(obj: Record<string, unknown>, key: string, where: string, required = true): string {
  const v = obj[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number') return String(v);
  if (required) throw new LessonError(`${where}: '${key}' is missing or not text`);
  return '';
}

function list(obj: Record<string, unknown>, key: string, where: string): unknown[] {
  const v = obj[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new LessonError(`${where}: '${key}' must be a list`);
  return v;
}

function parseItem(raw: unknown, where: string): LessonItem {
  if (!isObject(raw)) throw new LessonError(`${where}: expected 'text' and 'en'`);
  const accept = list(raw, 'accept', where).map((a, i) => {
    if (typeof a !== 'string') throw new LessonError(`${where}: accept[${i}] must be text`);
    return a.trim();
  });
  return {
    text: str(raw, 'text', where),
    en: str(raw, 'en', where),
    ...(str(raw, 'note', where, false) && { note: str(raw, 'note', where, false) }),
    ...(accept.length && { accept }),
  };
}

function parseDialogue(raw: unknown, where: string): Dialogue | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isObject(raw)) throw new LessonError(`${where}: dialogue must have 'title' and 'lines'`);
  const speakers = raw.speakers;
  if (speakers !== undefined && (!isObject(speakers) || Object.values(speakers).some((g) => g !== 'female' && g !== 'male'))) {
    throw new LessonError(`${where}: dialogue speakers must map names to female or male`);
  }
  return {
    title: str(raw, 'title', `${where} dialogue`),
    ...(speakers && { speakers: speakers as Dialogue['speakers'] }),
    lines: list(raw, 'lines', `${where} dialogue`).map((l, i) => {
      const w = `${where} dialogue line ${i + 1}`;
      if (!isObject(l)) throw new LessonError(`${w}: expected speaker, text and en`);
      return { speaker: str(l, 'speaker', w), text: str(l, 'text', w), en: str(l, 'en', w) };
    }),
  };
}

/** Checks one parsed lesson file; throws a readable message naming the file and the field. */
export function parseLesson(raw: unknown, file: string, source: Lesson['source']): Lesson {
  if (!isObject(raw)) throw new LessonError(`${file}: not a lesson (expected id, topic, title, …)`);
  const where = file;
  const items = (key: string) => list(raw, key, where).map((it, i) => parseItem(it, `${where} ${key}[${i + 1}]`));
  return {
    id: str(raw, 'id', where),
    topic: str(raw, 'topic', where),
    title: str(raw, 'title', where),
    subtitle: str(raw, 'subtitle', where, false),
    level: str(raw, 'level', where, false) || 'A1',
    goals: list(raw, 'goals', where).map(String),
    vocabulary: items('vocabulary'),
    phrases: items('phrases'),
    grammar: str(raw, 'grammar', where, false),
    dialogue: parseDialogue(raw.dialogue, where),
    challenge: items('challenge'),
    ...(str(raw, 'generated_by', where, false) && { generatedBy: str(raw, 'generated_by', where, false) }),
    source,
    file,
  };
}

export function parseTopics(raw: unknown, file: string): Topic[] {
  if (!Array.isArray(raw)) throw new LessonError(`${file}: expected a list of topics`);
  return raw.map((t, i) => {
    const where = `${file} topic ${i + 1}`;
    if (!isObject(t)) throw new LessonError(`${where}: expected id, title and description`);
    return {
      id: str(t, 'id', where),
      title: str(t, 'title', where),
      titleTarget: str(t, 'title_target', where, false) || undefined,
      description: str(t, 'description', where, false),
      icon: str(t, 'icon', where, false) || undefined,
    };
  });
}

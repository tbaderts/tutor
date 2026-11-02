import { LEARNER, parseLesson } from './lessons';
import { normWords } from './wordDiff';
import type { Lesson, LessonItem, Topic } from './types/lessons';

export type LessonLevel = 'A1' | 'A2';

/** A generated lesson that is not saved yet. */
export interface GeneratedDraft {
  lesson: Lesson;
  /** Set when the request asked for a new topic; created when the draft is saved. */
  newTopic?: Topic;
}

export interface GenerateRequest {
  /** What the lesson is about, in the learner's words. */
  description: string;
  /** Existing topic, or… */
  topicId?: string;
  /** …a new topic to create when the lesson is saved. */
  newTopic?: string;
  level: LessonLevel;
  /** Ollama model; defaults to the configured one. */
  model?: string;
}

const item = {
  type: 'object',
  properties: { text: { type: 'string' }, en: { type: 'string' }, note: { type: 'string' } },
  required: ['text', 'en'],
};

/** JSON schema handed to Ollama (`format`), so the model can only answer in this shape. */
export const LESSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    goals: { type: 'array', items: { type: 'string' } },
    vocabulary: { type: 'array', items: item },
    phrases: { type: 'array', items: item },
    grammar: { type: 'string' },
    dialogue: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        speakers: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, gender: { type: 'string', enum: ['female', 'male'] } },
            required: ['name', 'gender'],
          },
        },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: { speaker: { type: 'string' }, text: { type: 'string' }, en: { type: 'string' } },
            required: ['speaker', 'text', 'en'],
          },
        },
      },
      required: ['title', 'speakers', 'lines'],
    },
    challenge: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, en: { type: 'string' }, accept: { type: 'array', items: { type: 'string' } } },
        required: ['text', 'en', 'accept'],
      },
    },
  },
  required: ['title', 'subtitle', 'goals', 'vocabulary', 'phrases', 'grammar', 'dialogue', 'challenge'],
};

/** A lesson in the schema's shape: the worked example in the prompt. */
export function toSchemaShape(lesson: Lesson): Record<string, unknown> {
  const items = (list: LessonItem[]) => list.map(({ text, en, note }) => ({ text, en, ...(note && { note }) }));
  return {
    title: lesson.title,
    subtitle: lesson.subtitle,
    goals: lesson.goals,
    vocabulary: items(lesson.vocabulary),
    phrases: items(lesson.phrases),
    grammar: lesson.grammar,
    dialogue: lesson.dialogue && {
      title: lesson.dialogue.title,
      speakers: Object.entries(lesson.dialogue.speakers ?? {}).map(([name, gender]) => ({ name, gender })),
      lines: lesson.dialogue.lines,
    },
    challenge: lesson.challenge.map(({ text, en, accept }) => ({ text, en, accept: accept ?? [] })),
  };
}

export function slugify(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'lesson'
  );
}

/** Names a model might use for the learner instead of "you". */
const LEARNER_ALIASES = new Set(['you', 'tu', 'io', 'learner', 'student', 'me', 'user', 'lei', 'du', 'vous', 'usted']);

/** Notes that only name the word class or gender (small models love them) say nothing the article doesn't. */
const TRIVIAL_NOTE = /^(maschile|femminile|masculine|feminine|m\.?|f\.?|noun|verb|adjective|adverb|verb in (the )?infinitive|sostantivo|verbo|aggettivo)\.?$/i;

/** "[Your Name]", "<name>", "..." — things a learner can't say aloud. */
const PLACEHOLDER = /[[\]<>{}]|\.\.\.|…/;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Trimmed text; "E'" (a common way of typing "È") becomes "È". */
const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/(^|[\s«"(])E'(?=\s)/g, '$1È') : '');
const note = (v: unknown) => (TRIVIAL_NOTE.test(text(v)) ? '' : text(v));

function cleanItems(raw: unknown, withAccept = false): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const r of raw) {
    if (!isObject(r)) continue;
    const t = text(r.text);
    const en = text(r.en);
    const key = normWords(t).join(' ');
    if (!t || !en || !key || seen.has(key) || PLACEHOLDER.test(t)) continue;
    seen.add(key);
    const accept = withAccept && Array.isArray(r.accept)
      ? r.accept.map(text).filter((a) => a && normWords(a).join(' ') !== key)
      : [];
    out.push({ text: t, en, ...(note(r.note) && { note: note(r.note) }), ...(accept.length && { accept }) });
  }
  return out;
}

/**
 * Turns the model's JSON into a lesson: drops empty and duplicate items, maps learner aliases to "you",
 * gives every speaker a gender, and refuses lessons too thin to practise with.
 */
export function fromGenerated(raw: unknown, meta: { id: string; topic: string; level: string; model: string }): Lesson {
  if (!isObject(raw)) throw new Error('The model did not return a lesson.');
  const vocabulary = cleanItems(raw.vocabulary);
  const phrases = cleanItems(raw.phrases);
  const challenge = cleanItems(raw.challenge, true);

  const d = isObject(raw.dialogue) ? raw.dialogue : {};
  const genders: Record<string, 'female' | 'male'> = {};
  for (const s of Array.isArray(d.speakers) ? d.speakers : []) {
    if (isObject(s) && text(s.name) && (s.gender === 'female' || s.gender === 'male')) genders[text(s.name)] = s.gender;
  }
  const lines = (Array.isArray(d.lines) ? d.lines : [])
    .filter(isObject)
    .map((l) => {
      const speaker = text(l.speaker);
      return { speaker: LEARNER_ALIASES.has(speaker.toLowerCase()) ? LEARNER : speaker, text: text(l.text), en: text(l.en) };
    })
    .filter((l) => l.speaker && l.text && l.en && !PLACEHOLDER.test(l.text));
  const speakers: Record<string, 'female' | 'male'> = {};
  for (const line of lines) {
    if (line.speaker === LEARNER || speakers[line.speaker]) continue;
    speakers[line.speaker] = genders[line.speaker] ?? (Object.keys(speakers).length % 2 ? 'male' : 'female');
  }

  const problems = [
    vocabulary.length < 4 && `${vocabulary.length} vocabulary items`,
    phrases.length < 3 && `${phrases.length} phrases`,
    challenge.length < 3 && `${challenge.length} challenge items`,
    !lines.some((l) => l.speaker === LEARNER) && 'no lines for you in the dialogue',
  ].filter(Boolean);
  if (problems.length) {
    throw new Error(`The generated lesson is incomplete (${problems.join(', ')}). Try again, or pick a larger model.`);
  }

  const lesson = parseLesson(
    {
      id: meta.id,
      topic: meta.topic,
      title: text(raw.title) || 'New lesson',
      subtitle: text(raw.subtitle),
      level: meta.level,
      generated_by: meta.model,
      goals: Array.isArray(raw.goals) ? raw.goals.map(text).filter(Boolean) : [],
      vocabulary,
      phrases,
      grammar: text(raw.grammar),
      dialogue: lines.length ? { title: text(d.title) || 'Dialogue', speakers, lines } : undefined,
      challenge,
    },
    `generated lesson ${meta.id}`,
    'user',
  );
  return { ...lesson, file: '' };
}

/** The lesson as it is written to a YAML file: readable key order, no load-time fields. */
export function toYamlObject(lesson: Lesson): Record<string, unknown> {
  const items = (list: LessonItem[]) =>
    list.map(({ text, en, note, accept }) => ({ text, en, ...(note && { note }), ...(accept?.length && { accept }) }));
  return {
    id: lesson.id,
    topic: lesson.topic,
    title: lesson.title,
    subtitle: lesson.subtitle,
    level: lesson.level,
    ...(lesson.generatedBy && { generated_by: lesson.generatedBy }),
    goals: lesson.goals,
    vocabulary: items(lesson.vocabulary),
    phrases: items(lesson.phrases),
    grammar: lesson.grammar,
    ...(lesson.dialogue && { dialogue: lesson.dialogue }),
    challenge: items(lesson.challenge),
  };
}

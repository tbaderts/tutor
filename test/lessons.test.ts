import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { LessonService } from '../src/main/services/LessonService';
import { itemKey, LEARNER, lessonProgress, speakableItems } from '@shared/lessons';
import { normWords } from '@shared/wordDiff';

const CONTENT = path.resolve(__dirname, '../content');
const emptyUserRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tutor-lessons-'));

describe('shipped Italian lessons', () => {
  const catalog = new LessonService(CONTENT, emptyUserRoot()).catalog('it');

  it('all parse', () => {
    expect(catalog.errors).toEqual([]);
    expect(catalog.lessons.length).toBeGreaterThanOrEqual(13);
  });

  it('have unique ids and known topics', () => {
    const ids = catalog.lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const topics = new Set(catalog.topics.map((t) => t.id));
    for (const l of catalog.lessons) expect(topics.has(l.topic), `${l.id} topic ${l.topic}`).toBe(true);
    // Every topic in topics.yaml has a description and lessons.
    for (const t of catalog.topics) expect(catalog.lessons.some((l) => l.topic === t.id), t.id).toBe(true);
  });

  it.each(catalog.lessons.map((l) => [l.id, l] as const))('%s is complete', (_id, lesson) => {
    expect(lesson.goals.length).toBeGreaterThan(0);
    expect(lesson.vocabulary.length).toBeGreaterThanOrEqual(8);
    expect(lesson.phrases.length).toBeGreaterThanOrEqual(6);
    expect(lesson.challenge.length).toBeGreaterThanOrEqual(5);
    expect(lesson.grammar).toMatch(/##/);
    expect(lesson.dialogue?.lines.some((l) => l.speaker === LEARNER)).toBe(true);
    // Every non-learner speaker has a gender, so dialogue voices are chosen on purpose.
    for (const line of lesson.dialogue!.lines) {
      if (line.speaker !== LEARNER) expect(lesson.dialogue!.speakers?.[line.speaker], line.speaker).toBeDefined();
    }
    // Every item is speakable and progress keys don't collide within a section.
    const keys = speakableItems(lesson).map((i) => i.key);
    for (const item of speakableItems(lesson)) expect(normWords(item.text).length, item.key).toBeGreaterThan(0);
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(duplicates, 'duplicate items').toEqual([]);
  });
});

describe('user lessons', () => {
  it('replace shipped lessons with the same id and report broken files', () => {
    const user = emptyUserRoot();
    fs.mkdirSync(path.join(user, 'it', 'lessons'), { recursive: true });
    fs.writeFileSync(
      path.join(user, 'it', 'lessons', 'mine.yaml'),
      'id: work-1\ntopic: work\ntitle: My own intro\nphrases:\n  - text: Ciao!\n    en: Hi!\n',
    );
    fs.writeFileSync(path.join(user, 'it', 'lessons', 'broken.yaml'), 'id: x\ntopic: work\ntitle: Broken\nphrases:\n  - text: Ciao!\n');
    const catalog = new LessonService(CONTENT, user).catalog('it');
    const lesson = catalog.lessons.find((l) => l.id === 'work-1')!;
    expect(lesson.title).toBe('My own intro');
    expect(lesson.source).toBe('user');
    expect(catalog.errors).toHaveLength(1);
    expect(catalog.errors[0]).toMatch(/broken\.yaml phrases\[1\]: 'en' is missing/);
  });
});

describe('progress', () => {
  it('counts items at or above the mastery score', () => {
    const lesson = new LessonService(CONTENT, emptyUserRoot()).catalog('it').lessons.find((l) => l.id === 'work-1')!;
    const first = lesson.vocabulary[0].text;
    const second = lesson.vocabulary[1].text;
    const p = lessonProgress(lesson, {
      [itemKey('work-1', 'vocabulary', first)]: { best: 100, last: 100, attempts: 1, lastAt: '' },
      [itemKey('work-1', 'vocabulary', second)]: { best: 50, last: 50, attempts: 1, lastAt: '' },
    });
    expect(p.mastered).toBe(1);
    expect(p.total).toBe(speakableItems(lesson).length);
  });

  it('keys ignore punctuation and case', () => {
    expect(itemKey('a', 'phrases', 'Piacere!')).toBe(itemKey('a', 'phrases', 'piacere'));
  });
});

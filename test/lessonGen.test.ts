import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { LessonService } from '../src/main/services/LessonService';
import { fromGenerated, slugify, toSchemaShape } from '@shared/lessonGen';

const CONTENT = path.resolve(__dirname, '../content');
const meta = { id: 'gen-vet-1', topic: 'dog', level: 'A1', model: 'gemma3:4b' };

const modelOutput = () => ({
  title: 'Dal veterinario',
  subtitle: 'At the vet',
  goals: ['Say what is wrong with your dog', ''],
  vocabulary: [
    { text: 'il veterinario', en: 'vet', note: 'maschile' },
    { text: 'la zampa', en: 'paw' },
    { text: 'La zampa!', en: 'duplicate of paw' },
    { text: 'la febbre', en: 'fever' },
    { text: 'mangiare', en: 'to eat' },
    { text: '', en: 'empty, dropped' },
  ],
  phrases: [
    { text: 'Il mio cane non mangia.', en: "My dog isn't eating." },
    { text: 'Ha la febbre?', en: 'Does he have a fever?' },
    { text: 'Gli fa male la zampa.', en: 'His paw hurts.', note: '' },
    { text: 'Buongiorno, sono [Your Name].', en: 'Good morning, I am [Your Name].' },
    { text: "E' grave?", en: 'Is it serious?' },
  ],
  grammar: '## Negation\nNon before the verb.',
  dialogue: {
    title: 'At the vet',
    speakers: [{ name: 'Dottoressa', gender: 'female' }],
    lines: [
      { speaker: 'Dottoressa', text: 'Buongiorno! Cosa succede?', en: "Good morning! What's the matter?" },
      { speaker: 'Tu', text: 'Il mio cane non mangia.', en: "My dog isn't eating." },
      { speaker: 'Assistente', text: 'Prego, si accomodi.', en: 'Please take a seat.' },
    ],
  },
  challenge: [
    { text: 'Il mio cane non mangia.', en: "My dog isn't eating.", accept: ['Il mio cane non mangia niente.', 'il mio cane non mangia'] },
    { text: 'Ha la febbre?', en: 'Does he have a fever?', accept: [] },
    { text: 'Gli fa male la zampa.', en: 'His paw hurts.', accept: [] },
  ],
});

describe('fromGenerated', () => {
  it('cleans the model output into a lesson', () => {
    const lesson = fromGenerated(modelOutput(), meta);
    expect(lesson).toMatchObject({ id: 'gen-vet-1', topic: 'dog', level: 'A1', generatedBy: 'gemma3:4b', source: 'user' });
    expect(lesson.goals).toEqual(['Say what is wrong with your dog']);
    // Empty and duplicate items are dropped.
    expect(lesson.vocabulary.map((v) => v.text)).toEqual(['il veterinario', 'la zampa', 'la febbre', 'mangiare']);
    expect(lesson.phrases[2]).not.toHaveProperty('note');
    // Placeholders can't be said aloud; "E'" is "È".
    expect(lesson.phrases.map((p) => p.text)).toEqual(['Il mio cane non mangia.', 'Ha la febbre?', 'Gli fa male la zampa.', 'È grave?']);
    expect(lesson.vocabulary[0]).not.toHaveProperty('note'); // "maschile" says nothing the article doesn't
    // "Tu" is the learner; a speaker without a gender gets one.
    expect(lesson.dialogue!.lines[1].speaker).toBe('you');
    expect(lesson.dialogue!.speakers).toEqual({ Dottoressa: 'female', Assistente: 'male' });
    // An "accept" answer that equals the expected one is dropped.
    expect(lesson.challenge[0].accept).toEqual(['Il mio cane non mangia niente.']);
  });

  it('refuses a lesson too thin to practise', () => {
    const thin = { ...modelOutput(), phrases: [], dialogue: { title: 'x', speakers: [], lines: [] } };
    expect(() => fromGenerated(thin, meta)).toThrow(/incomplete \(0 phrases, no lines for you in the dialogue\)/);
    expect(() => fromGenerated('nope', meta)).toThrow(/did not return a lesson/);
  });

  it('makes the shipped example lesson round-trip through the schema shape', () => {
    const example = new LessonService(CONTENT, fs.mkdtempSync(path.join(os.tmpdir(), 'tutor-'))).catalog('it').lessons.find((l) => l.id === 'sports-3')!;
    const again = fromGenerated(toSchemaShape(example), { ...meta, id: 'sports-3', topic: 'sports' });
    expect(again.phrases).toEqual(example.phrases);
    expect(again.dialogue).toEqual(example.dialogue);
    expect(again.challenge).toEqual(example.challenge);
  });
});

describe('saving generated lessons', () => {
  it('writes YAML that loads back, adds the new topic, and can be deleted', () => {
    const user = fs.mkdtempSync(path.join(os.tmpdir(), 'tutor-lessons-'));
    const service = new LessonService(CONTENT, user);
    const lesson = { ...fromGenerated(modelOutput(), meta), topic: 'pets' };
    const file = service.saveUserLesson('it', lesson, { id: 'pets', title: 'Pets', description: '' });
    expect(path.basename(file)).toBe('gen-vet-1.yaml');

    const catalog = service.catalog('it');
    expect(catalog.errors).toEqual([]);
    const loaded = catalog.lessons.find((l) => l.id === 'gen-vet-1')!;
    expect({ ...loaded, file: '' }).toEqual({ ...lesson, file: '' });
    expect(catalog.topics.find((t) => t.id === 'pets')?.title).toBe('Pets');

    service.deleteUserLesson('it', 'gen-vet-1');
    expect(service.catalog('it').lessons.some((l) => l.id === 'gen-vet-1')).toBe(false);
    expect(() => service.deleteUserLesson('it', 'work-1')).toThrow(/not one of your lessons/);
  });
});

describe('slugify', () => {
  it('makes file-safe ids', () => {
    expect(slugify('Al mercato del pesce: Liguria!')).toBe('al-mercato-del-pesce-liguria');
    expect(slugify('Città è più')).toBe('citta-e-piu');
    expect(slugify('???')).toBe('lesson');
  });
});

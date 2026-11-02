import * as fs from 'fs';
import * as path from 'path';
import { parse, stringify } from 'yaml';
import { parseLesson, parseTopics } from '../../shared/lessons';
import { toYamlObject } from '../../shared/lessonGen';
import type { Lesson, LessonCatalog, Topic } from '../../shared/types/lessons';

/**
 * Lessons are YAML files in <root>/<language>/: topics.yaml plus lessons/*.yaml. The app ships one root;
 * the user's root (~/.tutor/lessons) adds lessons and topics, and replaces shipped ones with the same id.
 */
export class LessonService {
  constructor(private bundledRoot: string, private userRoot: string) {}

  userDir(language: string): string {
    return path.join(this.userRoot, language);
  }

  catalog(language: string): LessonCatalog {
    const errors: string[] = [];
    const topics = new Map<string, Topic>();
    const lessons = new Map<string, Lesson>();

    for (const [root, source] of [[this.bundledRoot, 'bundled'], [this.userRoot, 'user']] as const) {
      const dir = path.join(root, language);
      const topicsFile = path.join(dir, 'topics.yaml');
      if (fs.existsSync(topicsFile)) {
        try {
          parseTopics(parse(fs.readFileSync(topicsFile, 'utf-8')), topicsFile).forEach((t) => topics.set(t.id, t));
        } catch (err) {
          errors.push((err as Error).message);
        }
      }
      const lessonDir = path.join(dir, 'lessons');
      if (!fs.existsSync(lessonDir)) continue;
      for (const name of fs.readdirSync(lessonDir).filter((n) => /\.ya?ml$/i.test(n)).sort()) {
        const file = path.join(lessonDir, name);
        try {
          const lesson = parseLesson(parse(fs.readFileSync(file, 'utf-8')), file, source);
          lessons.set(lesson.id, lesson);
        } catch (err) {
          errors.push((err as Error).message);
        }
      }
    }

    // A lesson whose topic has no entry still shows up, under a topic named after its id.
    for (const lesson of lessons.values()) {
      if (!topics.has(lesson.topic)) topics.set(lesson.topic, { id: lesson.topic, title: lesson.topic, description: '' });
    }
    return { topics: [...topics.values()], lessons: [...lessons.values()], errors, userDir: this.userDir(language) };
  }

  /**
   * Writes a lesson to the user's folder as <id>.yaml, adding `newTopic` to the user's topics.yaml first.
   * Returns the file written.
   */
  saveUserLesson(language: string, lesson: Lesson, newTopic?: Topic): string {
    const dir = this.userDir(language);
    fs.mkdirSync(path.join(dir, 'lessons'), { recursive: true });
    if (newTopic) {
      const topicsFile = path.join(dir, 'topics.yaml');
      const existing = fs.existsSync(topicsFile) ? (parse(fs.readFileSync(topicsFile, 'utf-8')) as unknown[] | null) ?? [] : [];
      const entry = { id: newTopic.id, title: newTopic.title, description: newTopic.description, icon: newTopic.icon ?? 'BookOpen' };
      fs.writeFileSync(topicsFile, stringify([...existing, entry]), 'utf-8');
    }
    const file = path.join(dir, 'lessons', `${lesson.id}.yaml`);
    fs.writeFileSync(file, stringify(toYamlObject(lesson), { lineWidth: 0 }), 'utf-8');
    return file;
  }

  /** Deletes one of the user's lessons; shipped lessons can't be deleted. */
  deleteUserLesson(language: string, id: string): void {
    const lesson = this.catalog(language).lessons.find((l) => l.id === id);
    if (!lesson || lesson.source !== 'user') throw new Error(`'${id}' is not one of your lessons.`);
    fs.rmSync(lesson.file);
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { shell, type IpcMain } from 'electron';
import type { ConfigService } from '../services/ConfigService';
import type { LessonService } from '../services/LessonService';
import type { ProgressService } from '../services/ProgressService';
import type { LessonGenerator } from '../services/LessonGenerator';
import type { GeneratedDraft, GenerateRequest } from '../../shared/lessonGen';

const README = `Your own lessons for Tutor.

Put lesson files (*.yaml) in the "lessons" folder next to this file. A lesson with the same id as a
built-in one replaces it. Copy a built-in lesson as a starting point: they live in the app's
content/<language>/lessons folder. Add topics in topics.yaml (a list of id, title, title_target,
description, icon). Press "Reload" on the Lessons page after editing.
`;

export function registerLessonsIpc(
  ipcMain: IpcMain,
  configService: ConfigService,
  lessons: LessonService,
  progress: ProgressService,
  generator: LessonGenerator,
): void {
  const language = () => configService.getConfig().general.targetLanguage;

  ipcMain.handle('lessons:generate', async (event, requestId: string, req: GenerateRequest) =>
    generator.generate(requestId, req, (chars) => {
      if (!event.sender.isDestroyed()) event.sender.send('lessons:generateProgress', requestId, chars);
    }),
  );
  ipcMain.handle('lessons:cancelGenerate', async (_event, requestId: string) => generator.cancel(requestId));
  ipcMain.handle('lessons:save', async (_event, draft: GeneratedDraft) => lessons.saveUserLesson(language(), draft.lesson, draft.newTopic));
  ipcMain.handle('lessons:delete', async (_event, id: string) => {
    lessons.deleteUserLesson(language(), id);
    progress.reset(`${id}/`);
  });

  ipcMain.handle('lessons:catalog', async () => lessons.catalog(language()));
  ipcMain.handle('lessons:progress', async () => progress.all());
  ipcMain.handle('lessons:record', async (_event, key: string, score: number) => progress.record(key, score));
  ipcMain.handle('lessons:resetProgress', async (_event, lessonId: string) => progress.reset(`${lessonId}/`));

  ipcMain.handle('lessons:openFolder', async () => {
    const dir = lessons.userDir(language());
    fs.mkdirSync(path.join(dir, 'lessons'), { recursive: true });
    const readme = path.join(dir, 'README.txt');
    if (!fs.existsSync(readme)) fs.writeFileSync(readme, README, 'utf-8');
    await shell.openPath(dir);
  });
}

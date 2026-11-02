import { Menu, BrowserWindow } from 'electron';
import type { ViewId } from '../shared/types/ipc';

function navigate(view: ViewId): void {
  BrowserWindow.getFocusedWindow()?.webContents.send('navigate', view);
}

export function createApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => navigate('settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Go',
      submenu: [
        { label: 'Lessons', accelerator: 'CmdOrCtrl+1', click: () => navigate('lessons') },
        { label: 'Practice', accelerator: 'CmdOrCtrl+2', click: () => navigate('practice') },
        { label: 'Free Speaking', accelerator: 'CmdOrCtrl+3', click: () => navigate('free') },
        { label: 'Ask the Teacher', accelerator: 'CmdOrCtrl+4', click: () => navigate('ask') },
        { label: 'History', accelerator: 'CmdOrCtrl+5', click: () => navigate('history') },
      ],
    },
    {
      label: 'Help',
      submenu: [{ label: 'About Tutor', click: () => navigate('about') }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

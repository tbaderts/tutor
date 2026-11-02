import { create } from 'zustand';
import type { ViewId } from '@shared/types/ipc';

export type { ViewId };

export interface NavItem {
  id: ViewId;
  label: string;
  group: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'lessons', label: 'Lessons', group: 'Learn', icon: 'BookOpen' },
  { id: 'practice', label: 'Practice', group: 'Learn', icon: 'AudioLines' },
  { id: 'free', label: 'Free Speaking', group: 'Learn', icon: 'Mic' },
  { id: 'ask', label: 'Ask the Teacher', group: 'Learn', icon: 'MessagesSquare' },
  { id: 'history', label: 'History', group: 'Progress', icon: 'History' },
  { id: 'settings', label: 'Settings', group: 'System', icon: 'Settings' },
  { id: 'about', label: 'About', group: 'System', icon: 'Info' },
];

interface NavigationState {
  activeView: ViewId;
  sidebarCollapsed: boolean;
  setActiveView: (view: ViewId) => void;
  toggleSidebar: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeView: 'lessons',
  sidebarCollapsed: false,
  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

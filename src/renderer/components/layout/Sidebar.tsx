import React from 'react';
import { AudioLines, Mic, MessagesSquare, History, Settings, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigationStore, NAV_ITEMS, type NavItem } from '@/stores/navigation';
import { useConfigStore } from '@/stores/config';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  AudioLines, Mic, MessagesSquare, History, Settings, Info,
};

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar } = useNavigationStore();
  const { nativeLanguage, targetLanguage } = useConfigStore((s) => s.config.general);

  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-56',
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-sidebar-border px-3">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Tutor</span>
            <span
              className="rounded bg-sidebar-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-sidebar-accent-foreground"
              title="Your language → language you practise"
            >
              {nativeLanguage} → {targetLanguage}
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded p-1 hover:bg-sidebar-accent"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-2">
            {!sidebarCollapsed && (
              <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{group}</div>
            )}
            {items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  title={item.label}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-1.5 text-sm transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    activeView === item.id && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                    sidebarCollapsed && 'justify-center',
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

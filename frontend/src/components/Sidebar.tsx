import React from 'react';
import { BrandLogo } from './BrandLogo';
import { brandConfig } from '../config/brand';
import {
  LayoutDashboard,
  FolderKanban,
  Target,
  FileText,
  CheckSquare,
  FlaskConical,
  Bug,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  FileDown,
  GitPullRequest,
  Network,
  Users,
  Settings as SettingsIcon,
  History,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onNavigatePublic?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onNavigatePublic,
  collapsed = false,
  onToggleCollapse,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'quality-planning', label: 'Quality Planning', icon: Target },
    { id: 'requirements', label: 'Requirements', icon: FileText },
    { id: 'design-reviews', label: 'Design Reviews', icon: CheckSquare },
    { id: 'tasks', label: 'Development Tasks', icon: GitPullRequest },
    { id: 'code-reviews', label: 'Code Reviews', icon: ShieldCheck },
    { id: 'tests', label: 'Test Management', icon: FlaskConical },
    { id: 'defects', label: 'Defect Management', icon: Bug },
    { id: 'metrics', label: 'Quality Metrics', icon: BarChart3 },
    { id: 'releases', label: 'Release Management', icon: ShieldCheck, highlight: true },
    { id: 'capa', label: 'CAPA Management', icon: RefreshCw },
    { id: 'traceability', label: 'Traceability Matrix', icon: Network },
    { id: 'reports', label: 'Reports', icon: FileDown },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 select-none z-20 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {!collapsed ? (
          <BrandLogo size="sm" showSubtitle={false} />
        ) : (
          <div className="mx-auto">
            <BrandLogo size="sm" showText={false} />
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Quality Modules
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-md text-xs font-medium transition-colors ${
                collapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'
              } ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!collapsed && item.highlight && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Identity */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1">
        {!collapsed && (
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
            <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200">
              <span>{brandConfig.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">v{brandConfig.version}</span>
            </div>
            <p className="text-slate-400 text-[10px] truncate mt-0.5">{brandConfig.tagline}</p>
          </div>
        )}

        {onNavigatePublic && (
          <button
            onClick={onNavigatePublic}
            title={collapsed ? 'Public Website' : undefined}
            className={`w-full flex items-center rounded py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              collapsed ? 'justify-center px-0' : 'space-x-1.5 px-2'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            {!collapsed && <span>Public Website</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import {
  UserCircle,
  RotateCcw,
  LogOut,
  Bell,
  CheckCircle2,
  ChevronDown,
  Building2,
  Check,
  Sun,
  Moon,
  Globe,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onRefreshData?: () => void;
  onNavigatePublic?: () => void;
  onToggleSidebar?: () => void;
  pageTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefreshData,
  onNavigatePublic,
  onToggleSidebar,
  pageTitle = 'Dashboard',
}) => {
  const { user, logout, quickSwitchUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [switching, setSwitching] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleQuickSwitch = async (username: string) => {
    setSwitching(true);
    setShowRoleMenu(false);
    try {
      await quickSwitchUser(username);
      setNotice(`Active user: ${DEMO_CREDENTIALS[username]?.title || username}`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      alert(`Switch failed: ${e.message}`);
    } finally {
      setSwitching(false);
    }
  };

  const handleReseed = async () => {
    if (!window.confirm('Reset quality dataset to verified baseline?')) return;
    setReseeding(true);
    try {
      await api.reseedSystem();
      setNotice('Quality baseline restored.');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setNotice(null), 3500);
    } catch (e: any) {
      alert(`Reset failed: ${e.message}`);
    } finally {
      setReseeding(false);
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">SmartQMS</span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{pageTitle}</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium text-slate-700 dark:text-slate-200">PRJ-ECOM-001</span>
        </div>

        {notice && (
          <div className="hidden md:flex items-center space-x-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded text-xs animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2">
        {onNavigatePublic && (
          <button
            onClick={onNavigatePublic}
            className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Public Site</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Restore Baseline Button */}
        <button
          onClick={handleReseed}
          disabled={reseeding}
          title="Restore standard quality baseline records"
          className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${reseeding ? 'animate-spin' : ''}`} />
          <span>Reset Baseline</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-600"></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 z-50 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 flex items-center justify-between">
                <span>Release Gate Notifications</span>
                <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-mono">
                  1 Blocker
                </span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="p-2 rounded bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300">
                  <div className="font-semibold">Critical Defect DEF-01-001</div>
                  <div className="text-slate-600 dark:text-slate-400 text-[10px] mt-0.5">
                    Duplicate payment webhook defect is currently halting Release Candidate 1.0.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            disabled={switching}
            className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <div className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : <UserCircle className="w-4 h-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-1">
                <span>{user?.full_name || 'User'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1.5 z-50 text-xs">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Switch Role Profile
              </div>
              <div className="py-1 space-y-0.5">
                {Object.entries(DEMO_CREDENTIALS).map(([uname, info]) => {
                  const isCurrent = user?.username === uname;
                  return (
                    <button
                      key={uname}
                      onClick={() => handleQuickSwitch(uname)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">{info.title}</div>
                        <div className="text-[10px] text-slate-400">{info.role}</div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-medium text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

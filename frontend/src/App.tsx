import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { QualityPlanningPage } from './pages/QualityPlanningPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { TestManagementPage } from './pages/TestManagementPage';
import { DefectsPage } from './pages/DefectsPage';
import { ReleaseGatePage } from './pages/ReleaseGatePage';
import { MetricsAnalyticsPage } from './pages/MetricsAnalyticsPage';
import { CAPAPage } from './pages/CAPAPage';
import { ReportsAuditPage } from './pages/ReportsAuditPage';
import { DevelopmentTasksPage } from './pages/DevelopmentTasksPage';
import { TraceabilityPage } from './pages/TraceabilityPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { SettingsPage } from './pages/SettingsPage';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [viewMode, setViewMode] = useState<'landing' | 'app' | 'login'>('landing');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading SmartQMS Workspace...</p>
        </div>
      </div>
    );
  }

  // If user clicks "Launch Application" or is logged in
  if (!user) {
    if (viewMode === 'login') {
      return <LoginPage onBackToWebsite={() => setViewMode('landing')} />;
    }
    return <LandingPage onEnterApp={() => setViewMode('login')} />;
  }

  // If logged in, but user explicitly chose to view public website
  if (viewMode === 'landing') {
    return <LandingPage onEnterApp={() => setViewMode('app')} />;
  }

  const getPageTitle = (tab: string): string => {
    const titles: Record<string, string> = {
      'dashboard': 'Executive Dashboard',
      'projects': 'Projects & Programs',
      'quality-planning': 'Quality Objectives & Planning',
      'requirements': 'Requirements Management',
      'reviews': 'Quality Reviews',
      'design-reviews': 'Design Reviews (FDR/PDR)',
      'code-reviews': 'Code Reviews & Verification',
      'tasks': 'Development Tasks & Traceability',
      'traceability': 'Bidirectional Traceability Matrix',
      'tests': 'Test Management & Test Suites',
      'defects': 'Defect Lifecycle Management',
      'releases': 'Release Readiness Gate',
      'metrics': 'Software Quality Metrics',
      'capa': 'Corrective & Preventive Actions (CAPA)',
      'reports': 'Compliance & Audit Reports',
      'audit': 'Immutable Audit Trail',
      'users': 'User & Role Management',
      'settings': 'Organization & System Settings',
    };
    return titles[tab] || 'Quality Management System';
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage key={refreshKey} onNavigateTab={setCurrentTab} />;
      case 'projects':
        return <ProjectsPage key={refreshKey} />;
      case 'quality-planning':
        return <QualityPlanningPage key={refreshKey} />;
      case 'requirements':
        return <RequirementsPage key={refreshKey} />;
      case 'reviews':
        return <ReviewsPage key={refreshKey} />;
      case 'design-reviews':
        return <ReviewsPage key={refreshKey} initialTab="design" />;
      case 'code-reviews':
        return <ReviewsPage key={refreshKey} initialTab="code" />;
      case 'tasks':
        return <DevelopmentTasksPage key={refreshKey} />;
      case 'traceability':
        return <TraceabilityPage key={refreshKey} />;
      case 'tests':
        return <TestManagementPage key={refreshKey} />;
      case 'defects':
        return <DefectsPage key={refreshKey} />;
      case 'releases':
        return <ReleaseGatePage key={refreshKey} />;
      case 'metrics':
        return <MetricsAnalyticsPage key={refreshKey} />;
      case 'capa':
        return <CAPAPage key={refreshKey} />;
      case 'reports':
        return <ReportsAuditPage key={refreshKey} />;
      case 'audit':
        return <AuditTrailPage key={refreshKey} />;
      case 'users':
        return <UserManagementPage key={refreshKey} />;
      case 'settings':
        return <SettingsPage key={refreshKey} />;
      default:
        return <DashboardPage key={refreshKey} onNavigateTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onNavigatePublic={() => setViewMode('landing')}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onRefreshData={handleRefresh}
          onNavigatePublic={() => setViewMode('landing')}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          pageTitle={getPageTitle(currentTab)}
        />
        <main className="flex-1 p-5 md:p-6 lg:p-7 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

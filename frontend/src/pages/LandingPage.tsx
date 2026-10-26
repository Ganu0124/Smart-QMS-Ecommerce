import React, { useState } from 'react';
import { brandConfig } from '../config/brand';
import { BrandLogo } from '../components/BrandLogo';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Layers,
  FileText,
  FlaskConical,
  BarChart3,
  GitBranch,
  Repeat,
  Download,
  Sun,
  Moon,
  Code2,
  FileCode,
  CheckCircle,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeWorkflowTab, setActiveWorkflowTab] = useState(0);

  const workflowSteps = [
    {
      phase: 'PLAN',
      title: 'Quality Planning & Risk Mitigation',
      desc: 'Define measurable quality objectives, assign ownership, establish target thresholds, and assess risks such as concurrent payment race conditions.',
      badge: 'Step 1: Objectives',
      icon: Layers,
    },
    {
      phase: 'DEFINE',
      title: 'Requirements & Acceptance Criteria',
      desc: 'Formulate immutable functional specifications with measurable acceptance criteria. 10-point checklist ensures clarity and testability prior to approval.',
      badge: 'Step 2: Specifications',
      icon: FileText,
    },
    {
      phase: 'EXECUTE',
      title: 'Architecture & Code Peer Reviews',
      desc: 'Baseline architecture using 10-point design checklists. Enforce segregation of duties: developers are strictly prohibited from approving their own PRs.',
      badge: 'Step 3: Verification',
      icon: GitBranch,
    },
    {
      phase: 'VERIFY',
      title: '12 E-Commerce Test Scenarios',
      desc: 'Execute rigorous test suites covering payment webhook idempotency, cart pricing recalculations, inventory locking, and order status transitions.',
      badge: 'Step 4: Quality Gate',
      icon: FlaskConical,
    },
    {
      phase: 'MEASURE',
      title: 'Software Development & Quality Metrics',
      desc: 'Calculate DevP (40.0 hrs/KLOC), CRe (25.0%), DocRe (30.0%), defect density, MTTR, and defect leakage directly from live database records.',
      badge: 'Step 5: Analytics',
      icon: BarChart3,
    },
    {
      phase: 'REPORT',
      title: 'Audit Trail & Compliance Reports',
      desc: 'Generate downloadable PDF and CSV quality scorecards. Immutable audit logging provides regulatory and governance traceability.',
      badge: 'Step 6: Governance',
      icon: Download,
    },
    {
      phase: 'IMPROVE',
      title: 'Corrective & Preventive Actions (CAPA)',
      desc: 'Close the loop with root cause analysis, containment, recurrence prevention, and verified effectiveness reviews.',
      badge: 'Step 7: Continuous QA',
      icon: Repeat,
    },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: 'Smart Release Gate Engine',
      desc: '8 automated gate rules evaluate live database evidence. Blocks deployment if any Critical defect or failed mandatory test persists.',
    },
    {
      icon: FileText,
      title: 'Requirements & Version Control',
      desc: 'Complete lifecycle with automatic version incrementing (v1.0 → v2.0) upon revising approved specifications, resetting review status.',
    },
    {
      icon: GitBranch,
      title: 'Dual-Control Peer Reviews',
      desc: 'Enforces independent architecture and code review sign-offs with strict separation of duties and 10-point checklist baselines.',
    },
    {
      icon: FlaskConical,
      title: '10-Scenario Test Execution Matrix',
      desc: 'Built-in payment webhook idempotency runner, concurrency simulation, and detailed test step evidence logging.',
    },
    {
      icon: Layers,
      title: 'End-to-End Traceability Matrix',
      desc: 'Full forward and reverse traceability connecting objectives, requirements, tasks, PRs, tests, and defects with zero coverage gaps.',
    },
    {
      icon: BarChart3,
      title: 'Software Development Quality Metrics',
      desc: 'Server-side verified formulas for DevP, Code Reuse Ratio, Doc Reuse Ratio, Defect Density, MTTR, and Defect Leakage.',
    },
    {
      icon: Repeat,
      title: 'Closed-Loop CAPA Register',
      desc: 'Systemic Root Cause Analysis (RCA), immediate containment, preventive actions, and mandatory verification prior to closure.',
    },
    {
      icon: Download,
      title: 'PDF & CSV Quality Reports',
      desc: 'Instant PDF compliance documents and CSV exports for defects, requirements, tests, and release gate audits.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Public Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <BrandLogo size="md" />
            <nav className="hidden md:flex items-center space-x-5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {brandConfig.navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark / Light Theme"
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>

            {/* Launch App Button */}
            <button
              onClick={onEnterApp}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              <span>Launch Application</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="overview" className="relative pt-14 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <span>Enterprise Software Quality Suite</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight max-w-4xl mx-auto">
            {brandConfig.tagline}
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {brandConfig.description}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <span>Sign In to SmartQMS</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <a
              href="#workflow"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium transition-colors"
            >
              <span>Explore 7-Phase Workflow</span>
            </a>
          </div>

          {/* Live Quality Preview Panel */}
          <div className="mt-12 max-w-5xl mx-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Live Operations Console Preview
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  E-Commerce Core Platform (PRJ-ECOM-001)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <span>Release Gate: BLOCKED</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">Zero Critical Tolerance</span>
              </div>
            </div>

            {/* Quick Metrics Bar in Hero */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Test Pass Rate</span>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">91.7%</div>
                <span className="text-[11px] text-slate-500">11 of 12 Passed</span>
              </div>
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Open Critical Defect</span>
                <div className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">1 Blocker</div>
                <span className="text-[11px] text-red-700 dark:text-red-400">DEF-01-001 Duplicate Payment</span>
              </div>
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Review Completion</span>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">100.0%</div>
                <span className="text-[11px] text-slate-500">Architecture Baselined</span>
              </div>
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Development Effort</span>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">40.0 hrs/KLOC</div>
                <span className="text-[11px] text-slate-500">DevP Measured</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 7-Phase Closed-Loop Workflow */}
      <section id="workflow" className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Standard Quality Lifecycle
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              PLAN → DEFINE → EXECUTE → VERIFY → MEASURE → REPORT → IMPROVE
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              SmartQMS enforces rigorous software engineering discipline at each stage, transforming development practices into a verified, automated release pipeline.
            </p>
          </div>

          {/* Workflow Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeWorkflowTab === idx;
              return (
                <button
                  key={step.phase}
                  onClick={() => setActiveWorkflowTab(idx)}
                  className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold">{step.phase}</span>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-[11px] font-medium truncate">{step.badge}</div>
                </button>
              );
            })}
          </div>

          {/* Active Workflow Step Detail Card */}
          <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider">
                <span>Phase {activeWorkflowTab + 1}: {workflowSteps[activeWorkflowTab].phase}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {workflowSteps[activeWorkflowTab].title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {workflowSteps[activeWorkflowTab].desc}
              </p>
            </div>
            <button
              onClick={onEnterApp}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors shrink-0 cursor-pointer"
            >
              <span>Explore Phase</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Smart Release Gate Feature Section */}
      <section id="release-gate" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Automated Governance Engine
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                The Smart Release Gate
              </h2>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ordinary deployment systems rely on subjective verbal approvals. SmartQMS evaluates 8 automated rules directly against live database records before allowing a release to be signed off:
              </p>

              <div className="mt-5 space-y-2">
                {[
                  { rule: 'GATE-REQ', text: '100% of mandatory in-scope requirements approved' },
                  { rule: 'GATE-DESIGN', text: 'Architectural reviews baselined with zero failed checklist items' },
                  { rule: 'GATE-CODE', text: 'Peer code reviews approved (developer self-approval prohibited)' },
                  { rule: 'GATE-TEST', text: '100% of mandatory test cases passed with recorded evidence' },
                  { rule: 'GATE-DEFECT', text: 'Zero unresolved Critical or High defects (blocks release)' },
                  { rule: 'GATE-SEC', text: 'Security checks passed with zero plain cardholder storage' },
                  { rule: 'GATE-METRICS', text: 'Quality thresholds met (Test Pass Rate ≥90%, Req Approval ≥80%)' },
                  { rule: 'GATE-EVIDENCE', text: 'Audit notes and tester verification records verified' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 shrink-0 text-[11px]">
                      {item.rule}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Release Gate State Card */}
            <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Active Gate Evaluation</h4>
                    <span className="text-[11px] text-slate-500 font-mono">Release Candidate v1.0.0-RC1</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                  BLOCKED
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs">
                  <div className="font-semibold text-red-800 dark:text-red-300">Blocking Defect Identified</div>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5 text-xs">
                    <b>DEF-01-001:</b> Duplicate Payment Callback Creates Duplicate Orders (Severity: Critical)
                  </div>
                  <div className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-mono">
                    Corrective Action: Implement distributed mutex on webhook endpoint before deployment.
                  </div>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="text-slate-500 font-medium">Remediation & Sign-off Lifecycle:</div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Developer applies distributed lock fix</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tester verifies retest with 10 concurrent requests</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Quality Manager authorizes formal release approval</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onEnterApp}
                className="w-full mt-4 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors text-center cursor-pointer shadow-sm"
              >
                Inspect Release Gate in SmartQMS
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The Three Software Quality Metrics */}
      <section id="metrics" className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Mathematical Foundation
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Three Software Development Quality Metrics
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Stored as raw inputs in SQLite and calculated on demand with server-side validation rejecting zero denominators and negative metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Metric A: DevP (Blue) */}
            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Metric A: DevP
                </span>
                <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  <Code2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Development Effort per KLOC</h3>
              <div className="mt-2 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">40.0</span>
                <span className="text-xs text-slate-500 font-medium">hours/KLOC</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Formula: </span>
                  <span className="font-mono text-blue-700 dark:text-blue-400">Development Hours / KLOC</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Inputs: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">4,800 hrs / 120 KLOC</span>
                </div>
              </div>
            </div>

            {/* Metric B: CRe (Green) */}
            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Metric B: CRe
                </span>
                <div className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  <FileCode className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Code Reuse Ratio</h3>
              <div className="mt-2 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">25.0%</span>
                <span className="text-xs text-slate-500 font-medium">Reused</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Formula: </span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">(Reused KLOC / Total KLOC) × 100</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Inputs: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">30 KLOC / 120 KLOC</span>
                </div>
              </div>
            </div>

            {/* Metric C: DocRe (Amber) */}
            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Metric C: DocRe
                </span>
                <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Documentation Reuse Ratio</h3>
              <div className="mt-2 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">30.0%</span>
                <span className="text-xs text-slate-500 font-medium">Reused</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Formula: </span>
                  <span className="font-mono text-amber-700 dark:text-amber-400">(Reused Docs / Total Docs) × 100</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Inputs: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">15 docs / 50 docs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Feature Showcase */}
      <section id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Core Capabilities
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              End-to-End Quality Management Architecture
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Built for high-concurrency systems where software quality failure means lost revenue and broken customer trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{feat.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Call To Action Banner */}
      <section className="py-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Ready to Verify Software Quality at Every Stage?
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Experience the complete SmartQMS platform. Sign in to your workspace or explore the operational quality dashboards and release gates.
          </p>
          <div className="pt-2">
            <button
              onClick={onEnterApp}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              <span>Launch SmartQMS Platform</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. Professional Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <BrandLogo size="md" />
            <div className="flex items-center space-x-5 text-slate-600 dark:text-slate-400 text-xs">
              <a href="#overview" className="hover:text-blue-600 transition-colors">Overview</a>
              <a href="#workflow" className="hover:text-blue-600 transition-colors">Workflow</a>
              <a href="#release-gate" className="hover:text-blue-600 transition-colors">Release Gate</a>
              <a href="#metrics" className="hover:text-blue-600 transition-colors">Metrics</a>
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <button onClick={onEnterApp} className="text-blue-600 dark:text-blue-400 font-semibold cursor-pointer">
                Sign In
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>© {new Date().getFullYear()} {brandConfig.companyName}. All rights reserved.</p>
            <p>Engineered in compliance with ISO/IEC 25010 Software Quality Engineering Standards.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

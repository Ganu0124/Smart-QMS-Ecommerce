import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { DashboardSummary, QualityMetricsDetails } from '../types';
import { ReleaseGateAlertBanner } from '../components/ReleaseGateAlertBanner';
import { SoftwareDevelopmentMetricsSection } from '../components/SoftwareDevelopmentMetricsSection';
import {
  CheckCircle,
  FlaskConical,
  Bug,
  ShieldCheck,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#DC2626',
  High: '#B45309',
  Medium: '#2563EB',
  Low: '#64748B',
};

const TEST_COLORS: Record<string, string> = {
  Passed: '#15803D',
  Failed: '#DC2626',
  Blocked: '#B45309',
  'Not Run': '#64748B',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<QualityMetricsDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumData, metData] = await Promise.all([
        api.getDashboardMetrics(1),
        api.getQualityMetrics(1),
      ]);
      setSummary(sumData);
      setMetrics(metData);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !summary || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading quality metrics from database...</p>
        </div>
      </div>
    );
  }

  const isBlocked = summary.release_readiness_status === 'BLOCKED';

  // Severity chart data
  const severityData = Object.entries(metrics.severity_breakdown).map(([name, count]) => ({
    name,
    count,
    fill: SEVERITY_COLORS[name] || '#2563EB',
  }));

  // Test status chart data
  const testData = Object.entries(metrics.test_status_breakdown).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Active Release Gate Policy Alert */}
      <ReleaseGateAlertBanner onNavigateTab={onNavigateTab} isBlocked={isBlocked} />

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Release Status */}
        <div
          onClick={() => onNavigateTab('releases')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Release Readiness
            </span>
            <div
              className={`p-1.5 rounded-md ${
                isBlocked
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900'
                  : 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-400 border border-green-200 dark:border-green-900'
              }`}
            >
              {isBlocked ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                isBlocked ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
              }`}
            >
              {summary.release_readiness_status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isBlocked
              ? '1 mandatory gate failing (Critical Defect)'
              : 'All 8 automated quality gates cleared'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>Inspect Release Gates</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Test Pass Percentage */}
        <div
          onClick={() => onNavigateTab('tests')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Test Suite Pass Rate
            </span>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.test_pass_percentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target: ≥90%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                summary.test_pass_percentage >= 90 ? 'bg-green-600' : 'bg-amber-500'
              }`}
              style={{ width: `${summary.test_pass_percentage}%` }}
            ></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>View 10 Test Scenarios</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Open Defects by Severity */}
        <div
          onClick={() => onNavigateTab('defects')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Open Defects
            </span>
            <div className="p-1.5 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {summary.open_defects_by_severity.critical} Critical
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              +{summary.open_defects_by_severity.high} High
            </span>
          </div>
          <div className="flex items-center space-x-1.5 mt-2.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900">
              Crit: {summary.open_defects_by_severity.critical}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900">
              High: {summary.open_defects_by_severity.high}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900">
              Med: {summary.open_defects_by_severity.medium}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>Manage Defect Registry</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Code Review & Requirements Approval */}
        <div
          onClick={() => onNavigateTab('reviews')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Review Completion
            </span>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.code_review_completion_percentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Reqs Appr: {metrics.requirements_approval_rate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {summary.requirements_awaiting_approval} requirements awaiting sign-off
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>View Architecture Reviews</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
      </div>

      {/* Software Development Quality Metrics (DevP, CRe, DocRe) */}
      <SoftwareDevelopmentMetricsSection projectId={1} />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Defect Severity Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Defect Severity Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Release Gate requires zero unresolved Critical defects
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Active Project
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 6, fontSize: 12, color: '#1E293B', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Test Execution Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Test Execution Results
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Status of all 10 verified test scenarios
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              10 Total Tests
            </span>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={testData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                >
                  {testData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={TEST_COLORS[entry.name] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 6, fontSize: 12, color: '#1E293B', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-400">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Defect Density</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.defect_density} def/req</div>
          <span className="text-[11px] text-green-700 dark:text-green-400 font-medium">Target &lt; 1.5</span>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Defect Leakage</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.defect_leakage}%</div>
          <span className="text-[11px] text-green-700 dark:text-green-400 font-medium">Zero tolerance</span>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mean Time To Resolve</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.mean_time_to_resolve_hours} hrs</div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Target &lt; 48 hrs</span>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">CAPA Closure Rate</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.capa_closure_rate}%</div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            {summary.corrective_actions_awaiting_closure} action(s) open
          </span>
        </div>
      </div>
    </div>
  );
};

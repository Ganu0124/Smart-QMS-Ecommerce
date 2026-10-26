import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { QualityMetricsDetails } from '../types';
import { SoftwareDevelopmentMetricsSection } from '../components/SoftwareDevelopmentMetricsSection';
import {
  BarChart3,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
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

export const MetricsAnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<QualityMetricsDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        const data = await api.getQualityMetrics(1);
        setMetrics(data);
      } catch (e) {
        console.error('Failed to load quality metrics', e);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading || !metrics) {
    return <div className="text-center py-12 text-slate-400">Loading Quality Analytics & Metrics...</div>;
  }

  // Categories chart data
  const categoryChartData = Object.entries(metrics.category_breakdown)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => ({
      category: cat,
      count,
    }));

  const metricsMatrix = [
    {
      name: 'Requirements Approval Rate',
      value: `${metrics.requirements_approval_rate}%`,
      benchmark: '≥ 80.0%',
      formula: '(Approved Requirements / Total Requirements) × 100',
      status: metrics.requirements_approval_rate >= 80 ? 'COMPLIANT' : 'BREACH',
      description: 'Measures alignment of baseline requirements prior to development handoff.',
    },
    {
      name: 'Code Review Completion Rate',
      value: `${metrics.code_review_completion_rate}%`,
      benchmark: '100.0%',
      formula: '(Passed Code Reviews / Total Required Reviews) × 100',
      status: metrics.code_review_completion_rate === 100 ? 'COMPLIANT' : 'PENDING',
      description: 'Enforces two-person review rule and static security verification on all PRs.',
    },
    {
      name: 'Test Suite Pass Rate',
      value: `${metrics.test_pass_rate}%`,
      benchmark: '≥ 90.0%',
      formula: '(Passed Executed Tests / Total Executed Tests) × 100',
      status: metrics.test_pass_rate >= 90 ? 'COMPLIANT' : 'BREACH',
      description: 'Verifies functional correctness and checkout edge cases across 10 scenarios.',
    },
    {
      name: 'Defect Density',
      value: `${metrics.defect_density} def/req`,
      benchmark: '< 1.50 def/req',
      formula: 'Total Discovered Defects / Total Defined Requirements',
      status: metrics.defect_density < 1.5 ? 'COMPLIANT' : 'HIGH',
      description: 'Normalized defect frequency per functional specification unit.',
    },
    {
      name: 'Defect Leakage to Production',
      value: `${metrics.defect_leakage}%`,
      benchmark: '0.0%',
      formula: '(Production Defects / Total Defects Discovered) × 100',
      status: metrics.defect_leakage === 0 ? 'EXCELLENT' : 'LEAKAGE DETECTED',
      description: 'Proportion of defects escaping internal QA verification into live production.',
    },
    {
      name: 'Mean Time To Resolve (MTTR)',
      value: `${metrics.mean_time_to_resolve_hours} hrs`,
      benchmark: '< 48.0 hrs',
      formula: 'Average elapsed hours between defect creation and defect closure',
      status: metrics.mean_time_to_resolve_hours < 48 ? 'COMPLIANT' : 'DELAY',
      description: 'Agility of development team in diagnosing and resolving discovered defects.',
    },
    {
      name: 'CAPA Action Closure Rate',
      value: `${metrics.capa_closure_rate}%`,
      benchmark: '≥ 80.0%',
      formula: '(Closed CAPAs / Total Initiated CAPAs) × 100',
      status: metrics.capa_closure_rate >= 80 ? 'COMPLIANT' : 'IN PROGRESS',
      description: 'Ensures systemic root-cause remediations and preventive checks are finalized.',
    },
    {
      name: 'Open Critical & High Defects',
      value: `${metrics.open_critical_high_defects}`,
      benchmark: '0 (Zero Tolerance)',
      formula: 'Count of unresolved defects where severity in [Critical, High]',
      status: metrics.open_critical_high_defects === 0 ? 'ZERO TOLERANCE MET' : 'BLOCKING RELEASE',
      description: 'Strict release blocker gate ensuring zero known severe defects deploy.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Quality Metrics & Mathematical Scorecards</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Phase 6 (MEASURE): Transparent calculations derived from database records with benchmark thresholds and definitions.
        </p>
      </div>

      {/* Software Development Quality Metrics (DevP, CRe, DocRe) */}
      <SoftwareDevelopmentMetricsSection projectId={1} />

      {/* Metrics Scorecard Table with Formulas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quality Measurement Matrix</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Database-calculated quality indicators and benchmark compliance</p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">ISO/IEC 25010</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Metric Indicator</th>
                <th className="px-4 py-3">Live Calculated Value</th>
                <th className="px-4 py-3">Benchmark Target</th>
                <th className="px-4 py-3">Calculation Formula</th>
                <th className="px-4 py-3">Evaluation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metricsMatrix.map((m, idx) => {
                const isGood = ['COMPLIANT', 'EXCELLENT', 'ZERO TOLERANCE MET'].includes(m.status);
                const isWarn = ['PENDING', 'IN PROGRESS', 'DELAY'].includes(m.status);
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{m.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{m.description}</div>
                    </td>
                    <td className="px-4 py-3.5 font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                      {m.value}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">{m.benchmark}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                      {m.formula}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                          isGood
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : isWarn
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Categories Distribution */}
        <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Discovered Defects by Category</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribution across e-commerce functional domains</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Live DB</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={true} horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="category" type="category" stroke="#94A3B8" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: 6,
                    fontSize: 12,
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    color: '#1E293B'
                  }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Factors Info Panel */}
        <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              E-Commerce Software Quality Factors (ISO 25010)
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            In financial and e-commerce platforms, software quality directly safeguards revenue, customer trust, and financial transaction integrity:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-blue-600 dark:text-blue-400">1. Reliability & Idempotency: </span>
              <span className="text-slate-700 dark:text-slate-300">
                Payment webhook retries and network pauses must never result in duplicate deductions or lost order confirmations.
              </span>
            </div>
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">2. Data Integrity & Stock Concurrency: </span>
              <span className="text-slate-700 dark:text-slate-300">
                Inventory decrements and cart calculations must execute atomically to prevent flash-sale overselling.
              </span>
            </div>
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200">3. Security & Access Control: </span>
              <span className="text-slate-700 dark:text-slate-300">
                Mandatory PCI-DSS compliance, bcrypt password hashing, and zero token leakage on customer endpoints.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

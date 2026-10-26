import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import {
  Code2,
  FileCode,
  FileText,
  Calculator,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SoftwareMetric {
  id: number;
  project_id: number;
  metric_key?: string;
  metric_name: string;
  formula?: string;
  raw_inputs?: string;
  value: number;
  unit: string;
  interpretation?: string;
  calculation_details?: string;
  measurement_date: string;
}

export const SoftwareDevelopmentMetricsSection: React.FC<{ projectId?: number }> = ({ projectId = 1 }) => {
  const [metrics, setMetrics] = useState<SoftwareMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [activeMetricType, setActiveMetricType] = useState<'devp' | 'cre' | 'docre'>('devp');

  // Calculator inputs
  const [devpHours, setDevpHours] = useState<number | string>(4800);
  const [devpKloc, setDevpKloc] = useState<number | string>(120);

  const [creReused, setCreReused] = useState<number | string>(30);
  const [creTotal, setCreTotal] = useState<number | string>(120);

  const [docreReused, setDocreReused] = useState<number | string>(15);
  const [docreTotal, setDocreTotal] = useState<number | string>(50);

  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcSuccess, setCalcSuccess] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSoftwareDevelopmentMetrics(projectId);
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load software development metrics', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Find latest by key
  const devpMetric = metrics.find((m) => m.metric_key === 'DevP') || {
    value: 40.0,
    unit: 'hours/KLOC',
    formula: 'Development Hours / KLOC',
    calculation_details: '4,800.0 hrs / 120.0 KLOC = 40.0 hours/KLOC',
    interpretation: 'Lower effort per KLOC is generally desirable when comparing similar projects with comparable scope and quality. Do not use this measure alone to judge developer productivity.',
  };

  const creMetric = metrics.find((m) => m.metric_key === 'CRe') || {
    value: 25.0,
    unit: '%',
    formula: 'Reused KLOC / Total KLOC × 100',
    calculation_details: '(30.0 Reused KLOC / 120.0 Total KLOC) × 100 = 25.0%',
    interpretation: 'A higher reuse ratio indicates greater reuse of existing code. Also track the suitability and quality of reused components.',
  };

  const docreMetric = metrics.find((m) => m.metric_key === 'DocRe') || {
    value: 30.0,
    unit: '%',
    formula: 'Reused Documents / Total Documents × 100',
    calculation_details: '(15 Reused Documents / 50 Total Documents) × 100 = 30.0%',
    interpretation: 'A higher ratio indicates greater documentation reuse. Verify each reused document against current requirements.',
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setCalcError(null);
    setCalcSuccess(null);
    try {
      if (activeMetricType === 'devp') {
        const res = await api.calculateDevP({
          project_id: projectId,
          development_hours: Number(devpHours),
          software_size_kloc: Number(devpKloc),
        });
        setCalcSuccess(`Calculated DevP: ${res.value} ${res.unit} successfully saved to SQLite database.`);
      } else if (activeMetricType === 'cre') {
        const res = await api.calculateCRe({
          project_id: projectId,
          reused_kloc: Number(creReused),
          total_kloc: Number(creTotal),
        });
        setCalcSuccess(`Calculated CRe: ${res.value}% successfully saved to SQLite database.`);
      } else {
        const res = await api.calculateDocRe({
          project_id: projectId,
          reused_documents: Number(docreReused),
          total_documents: Number(docreTotal),
        });
        setCalcSuccess(`Calculated DocRe: ${res.value}% successfully saved to SQLite database.`);
      }
      await loadMetrics();
    } catch (e: any) {
      setCalcError(e.message || 'Calculation rejected by server validation.');
    } finally {
      setCalculating(false);
    }
  };

  // Comparison chart data for reuse metrics (percentage scale: 0-100%)
  const reuseComparisonData = [
    {
      metric: 'Code Reuse (CRe)',
      actual: creMetric.value,
      target: 20.0,
      fill: '#15803D', // Enterprise green
    },
    {
      metric: 'Doc Reuse (DocRe)',
      actual: docreMetric.value,
      target: 25.0,
      fill: '#B45309', // Enterprise amber
    },
  ];

  // Effort chart data for DevP (hours/KLOC scale: 0-80)
  const effortData = [
    {
      metric: 'Effort (DevP)',
      actual: devpMetric.value,
      target: 45.0, // Historical baseline
      fill: '#2563EB', // Enterprise blue
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Software Development Quality Metrics
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ISO/SQM Standards
            </span>
            {loading && (
              <span className="text-[10px] text-blue-500 animate-pulse font-mono">Syncing...</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Engineered metrics measuring development effort intensity, code reuse ratios, and documentation reuse baselines.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCalcModal(true);
            setCalcError(null);
            setCalcSuccess(null);
          }}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Calculator className="w-4 h-4" />
          <span>Calculate Metric</span>
        </button>
      </div>

      {/* 3 Prominent Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI Card 1: Development Effort per KLOC */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              DevP • Effort
            </span>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Development Effort per KLOC
          </h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {devpMetric.value}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">hours / KLOC</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-normal text-slate-500">Formula:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{devpMetric.formula}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-normal text-slate-500">Inputs:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{devpMetric.calculation_details}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Lower effort per KLOC indicates higher development efficiency.</span>
            </p>
          </div>
        </div>

        {/* KPI Card 2: Code Reuse Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
              CRe • Code Reuse
            </span>
            <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900">
              <FileCode className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Code Reuse Ratio
          </h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {creMetric.value}%
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              Target &ge; 20%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-normal text-slate-500">Formula:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{creMetric.formula}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-normal text-slate-500">Inputs:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{creMetric.calculation_details}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span>Higher reuse maximizes architectural consistency and velocity.</span>
            </p>
          </div>
        </div>

        {/* KPI Card 3: Documentation Reuse Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              DocRe • Doc Reuse
            </span>
            <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Documentation Reuse Ratio
          </h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {docreMetric.value}%
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Target &ge; 25%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-normal text-slate-500">Formula:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{docreMetric.formula}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="font-normal text-slate-500">Inputs:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{docreMetric.calculation_details}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Standard templates accelerate requirement & test documentation.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Reuse Ratios Chart Panel (0-100% scale) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Reuse Ratio Benchmarks
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Code Reuse (CRe) vs Documentation Reuse (DocRe) on a normalized 0–100% scale
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Scale: 0% – 100%
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={reuseComparisonData} margin={{ top: 5, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="#64748B" fontSize={11} />
                <YAxis type="category" dataKey="metric" stroke="#64748B" fontSize={11} width={130} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Measured Ratio']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 6, fontSize: 12, color: '#1E293B', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="actual" radius={[0, 4, 4, 0]}>
                  {reuseComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Development Effort Panel (Hours/KLOC scale) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Effort Intensity
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">DevP normalized effort</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-900">
              hrs/KLOC
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={effortData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 80]} unit="h" stroke="#64748B" fontSize={11} />
                <YAxis type="category" dataKey="metric" stroke="#64748B" fontSize={11} width={90} />
                <Tooltip
                  formatter={(val: any) => [`${val} hrs/KLOC`, 'Effort Intensity']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 6, fontSize: 12, color: '#1E293B', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="actual" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Calculate Metric Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Calculate Quality Metric</span>
              </h3>
              <button
                onClick={() => setShowCalcModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Type Selector */}
            <div className="grid grid-cols-3 gap-1.5 mt-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              <button
                type="button"
                onClick={() => {
                  setActiveMetricType('devp');
                  setCalcError(null);
                  setCalcSuccess(null);
                }}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  activeMetricType === 'devp'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                DevP (Effort)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMetricType('cre');
                  setCalcError(null);
                  setCalcSuccess(null);
                }}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  activeMetricType === 'cre'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                CRe (Code Reuse)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMetricType('docre');
                  setCalcError(null);
                  setCalcSuccess(null);
                }}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  activeMetricType === 'docre'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                DocRe (Doc Reuse)
              </button>
            </div>

            {calcError && (
              <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{calcError}</span>
              </div>
            )}

            {calcSuccess && (
              <div className="mt-3 p-3 rounded-md bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                <span>{calcSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCalculate} className="mt-4 space-y-3">
              {activeMetricType === 'devp' && (
                <>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-md border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">Formula:</span> DevP = Development Hours / KLOC
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Development Hours *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={devpHours}
                      onChange={(e) => setDevpHours(e.target.value)}
                      placeholder="e.g. 4800"
                      required
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Software Size (KLOC) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={devpKloc}
                      onChange={(e) => setDevpKloc(e.target.value)}
                      placeholder="e.g. 120"
                      required
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {activeMetricType === 'cre' && (
                <>
                  <div className="p-2.5 bg-green-50 dark:bg-green-950/40 rounded-md border border-green-200 dark:border-green-900 text-xs text-green-800 dark:text-green-300">
                    <span className="font-semibold">Formula:</span> CRe = (Reused KLOC / Total KLOC) × 100
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Reused Code (KLOC) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={creReused}
                      onChange={(e) => setCreReused(e.target.value)}
                      placeholder="e.g. 30"
                      required
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Total Codebase Size (KLOC) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={creTotal}
                      onChange={(e) => setCreTotal(e.target.value)}
                      placeholder="e.g. 120"
                      required
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {activeMetricType === 'docre' && (
                <>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Formula:</span> DocRe = (Reused Documents / Total Documents) × 100
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Reused Documents Count *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={docreReused}
                      onChange={(e) => setDocreReused(e.target.value)}
                      placeholder="e.g. 15"
                      required
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Total Documents Count *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={docreTotal}
                      onChange={(e) => setDocreTotal(e.target.value)}
                      placeholder="e.g. 50"
                      required
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCalcModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calculating}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  {calculating ? 'Saving...' : 'Record Measurement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

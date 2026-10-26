import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Project, TraceabilityMatrixResponse, TraceabilityItem } from '../types';
import { Badge } from '../components/Badge';
import {
  Layers,
  Target,
  FileText,
  CheckSquare,
  GitPullRequest,
  FlaskConical,
  Bug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';

export const TraceabilityPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [data, setData] = useState<TraceabilityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gapFilter, setGapFilter] = useState<'all' | 'gaps_only' | 'traceable_only'>('all');

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const [projs, matrixRes] = await Promise.all([
        api.getProjects(),
        api.getTraceabilityMatrix(selectedProjectId),
      ]);
      setProjects(projs);
      setData(matrixRes);
    } catch (e) {
      console.error('Failed to load traceability matrix', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [selectedProjectId]);

  const filteredItems = (data?.matrix || []).filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = `${item.req_code} ${item.title} ${item.quality_objective?.title || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    if (gapFilter === 'gaps_only') {
      return item.coverage_gaps.length > 0;
    }
    if (gapFilter === 'traceable_only') {
      return item.coverage_gaps.length === 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>End-to-End Quality Traceability Matrix</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trace quality flow across: Quality Objective → Requirement → Design Review → Development Task → Code Review → Test Case.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Project Selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                Total Requirements
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{data.total_requirements}</div>
            </div>
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                Fully Traceable
              </div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {data.summary.fully_traceable_count}
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className={`p-4 rounded-lg border shadow-sm flex items-center justify-between ${
            data.summary.gap_count > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className={`text-[11px] uppercase tracking-wider font-semibold ${
                data.summary.gap_count > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                Coverage Gaps
              </div>
              <div className={`text-xl font-bold mt-1 ${
                data.summary.gap_count > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
              }`}>
                {data.summary.gap_count}
              </div>
            </div>
            <AlertTriangle className={`w-5 h-5 ${data.summary.gap_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                Traceability Rate
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {data.summary.coverage_percentage}%
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search traceability chains by requirement or objective..."
            className="bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full text-xs"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setGapFilter('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              gapFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Chains ({data?.matrix?.length || 0})
          </button>
          <button
            onClick={() => setGapFilter('gaps_only')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              gapFilter === 'gaps_only'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Gaps Only ({data?.summary?.gap_count || 0})
          </button>
          <button
            onClick={() => setGapFilter('traceable_only')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              gapFilter === 'traceable_only'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Fully Traceable ({data?.summary?.fully_traceable_count || 0})
          </button>
        </div>
      </div>

      {/* Traceability Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 min-w-[140px]">
                  <div className="flex items-center space-x-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Quality Objective</span>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[180px]">
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Requirement</span>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center space-x-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Design Review</span>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center space-x-1.5">
                    <GitPullRequest className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Dev Task</span>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Code Review</span>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <div className="flex items-center space-x-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Test Cases</span>
                  </div>
                </th>
                <th className="px-4 py-3 min-w-[180px]">
                  <div className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Coverage Gaps</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Computing quality lifecycle matrix...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const hasGaps = item.coverage_gaps.length > 0;

                  return (
                    <tr
                      key={item.requirement_id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        hasGaps ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Quality Objective */}
                      <td className="px-4 py-3.5 align-top">
                        {item.quality_objective ? (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              {item.quality_objective.title}
                            </div>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mt-1 inline-block">
                              {item.quality_objective.quality_factor}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Unlinked</span>
                        )}
                      </td>

                      {/* Requirement */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">{item.req_code}</div>
                        <div className="text-slate-800 dark:text-slate-200 font-medium text-xs mt-0.5">{item.title}</div>
                        <div className="mt-1">
                          <Badge value={item.status} />
                        </div>
                      </td>

                      {/* Design Review */}
                      <td className="px-4 py-3.5 align-top">
                        {item.design_reviews.length > 0 ? (
                          <div className="space-y-1">
                            {item.design_reviews.map((dr) => (
                              <div key={dr.id} className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <div className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{dr.review_code}</div>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <Badge value={dr.status} />
                                  {dr.is_baselined && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                                      BASELINED
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-mono text-[11px] flex items-center space-x-1 font-medium">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>

                      {/* Dev Tasks */}
                      <td className="px-4 py-3.5 align-top">
                        {item.dev_tasks.length > 0 ? (
                          <div className="space-y-1">
                            {item.dev_tasks.map((dt) => (
                              <div key={dt.id} className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <div className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{dt.task_code}</div>
                                <div className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{dt.title}</div>
                                <div className="mt-0.5">
                                  <Badge value={dt.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-mono text-[11px] flex items-center space-x-1 font-medium">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>

                      {/* Code Reviews */}
                      <td className="px-4 py-3.5 align-top">
                        {item.code_reviews.length > 0 ? (
                          <div className="space-y-1">
                            {item.code_reviews.map((cr) => (
                              <div key={cr.id} className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <div className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{cr.review_code}</div>
                                <div className="mt-0.5">
                                  <Badge value={cr.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-mono text-[11px] flex items-center space-x-1 font-medium">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>

                      {/* Test Cases */}
                      <td className="px-4 py-3.5 align-top">
                        {item.test_cases.length > 0 ? (
                          <div className="space-y-1">
                            {item.test_cases.map((tc) => (
                              <div key={tc.id} className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <div className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{tc.tc_code}</div>
                                <div className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{tc.scenario_title}</div>
                                <div className="mt-0.5">
                                  <Badge value={tc.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-mono text-[11px] flex items-center space-x-1 font-medium">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>

                      {/* Coverage Gaps */}
                      <td className="px-4 py-3.5 align-top">
                        {item.coverage_gaps.length === 0 ? (
                          <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>100% Traceable</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {item.coverage_gaps.map((gap, i) => (
                              <div
                                key={i}
                                className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300"
                              >
                                <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                                <span>{gap}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

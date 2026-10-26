import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AuditLog } from '../types';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  History,
  Download,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export const ReportsAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        entity_type: entityFilter || undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit trail', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter]);

  const reportCards = [
    {
      title: 'Executive Quality Scorecard',
      type: 'quality',
      description: 'Comprehensive ISO 25010 metrics, test pass rates, MTTR, defect density, and threshold compliance status.',
    },
    {
      title: 'Defect & Non-Conformance Register',
      type: 'defects',
      description: 'Complete defect register with severities, affected modules, root-causes, and resolution notes.',
    },
    {
      title: 'Requirements Traceability Matrix',
      type: 'requirements',
      description: 'Detailed baseline requirements, acceptance criteria specifications, versions, and approval sign-offs.',
    },
    {
      title: 'Test Suite Execution Summary',
      type: 'tests',
      description: '10 e-commerce test scenarios, execution outcomes, preconditions, and evidence verification traces.',
    },
    {
      title: 'Release Gate Readiness Verdict',
      type: 'releases',
      description: 'Evaluation audit of all 8 automated release gates, approval decisions, and evaluators.',
    },
    {
      title: 'Corrective & Preventive Actions (CAPA)',
      type: 'capa',
      description: 'Closed-loop CAPA action items, root causes, permanent fixes, and effectiveness reviews.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <FileDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Downloadable Reports & Compliance Audit Trail</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Phase 6 & 7 (REPORT & AUDIT): Export official PDF / CSV documentation and inspect tamper-evident audit records.
        </p>
      </div>

      {/* Downloadable Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((rep) => (
          <div
            key={rep.type}
            className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
          >
            <div>
              <div className="flex items-center space-x-2 mb-2 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rep.title}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{rep.description}</p>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <a
                href={api.getReportDownloadUrl('pdf', rep.type, 1)}
                target="_blank"
                rel="noreferrer"
                download
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Report</span>
              </a>
              <a
                href={api.getReportDownloadUrl('csv', rep.type, 1)}
                target="_blank"
                rel="noreferrer"
                download
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>CSV Export</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance Audit Trail Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Tamper-Evident System Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable logging of record creation, review sign-offs, gate evaluations, and release approvals
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="Release">Release</option>
              <option value="Defect">Defect</option>
              <option value="Requirement">Requirement</option>
              <option value="Review">Review</option>
              <option value="TestCase">TestCase</option>
              <option value="CAPA">CAPA</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-5 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    @{log.username}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.entity_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                    {log.entity_id}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-md truncate">
                    {log.change_details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

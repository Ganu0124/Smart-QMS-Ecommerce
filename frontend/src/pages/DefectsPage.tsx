import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Defect } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  Bug,
  Plus,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
  Eye,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

export const DefectsPage: React.FC = () => {
  const { user } = useAuth();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Defect for Detail / Lifecycle Transition
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);

  // Status Transition Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('fixed');
  const [retestOutcome, setRetestOutcome] = useState<'passed' | 'failed'>('passed');
  const [transitionComments, setTransitionComments] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Create Defect Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDefect, setNewDefect] = useState({
    title: '',
    description: '',
    category: 'payment_transaction',
    severity: 'high',
    priority: 'high',
    affected_module: 'Checkout & Payment Engine',
    steps_to_reproduce: '',
    expected_result: '',
    actual_result: '',
  });

  const loadDefects = async () => {
    setLoading(true);
    try {
      const data = await api.getDefects({
        project_id: 1,
        severity: severityFilter || undefined,
        status_filter: statusFilter || undefined,
      });
      setDefects(data);
      if (selectedDefect) {
        const updated = data.find((d) => d.id === selectedDefect.id);
        if (updated) setSelectedDefect(updated);
      }
    } catch (e) {
      console.error('Failed to load defects', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefects();
  }, [severityFilter, statusFilter]);

  const openStatusTransition = (def: Defect) => {
    setSelectedDefect(def);
    setRootCause(def.root_cause || '');
    setCorrectiveAction(def.corrective_action || '');
    setPreventiveAction(def.preventive_action || '');
    setResolutionNotes(def.resolution_notes || '');
    setTransitionComments('');

    // Pre-select logical next status
    if (def.status === 'open') setTargetStatus('in_progress');
    else if (def.status === 'in_progress') setTargetStatus('fixed');
    else if (def.status === 'fixed') setTargetStatus('retest');
    else if (def.status === 'retest') setTargetStatus('closed');
    else setTargetStatus(def.status);

    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDefect) return;
    try {
      await api.updateDefectStatus(selectedDefect.id, {
        new_status: targetStatus,
        comments: transitionComments,
        retest_result: targetStatus === 'retest' ? retestOutcome : undefined,
        root_cause: rootCause,
        corrective_action: correctiveAction,
        preventive_action: preventiveAction,
        resolution_notes: resolutionNotes,
      });
      setShowStatusModal(false);
      loadDefects();
    } catch (err: any) {
      alert(`Status transition error: ${err.message}`);
    }
  };

  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDefect({
        project_id: 1,
        ...newDefect,
      });
      setShowCreateModal(false);
      setNewDefect({
        title: '',
        description: '',
        category: 'payment_transaction',
        severity: 'high',
        priority: 'high',
        affected_module: 'Checkout & Payment Engine',
        steps_to_reproduce: '',
        expected_result: '',
        actual_result: '',
      });
      loadDefects();
    } catch (err: any) {
      alert(`Error logging defect: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>Defect & Non-Conformance Management</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Lifecycle Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Defect tracking through verified lifecycle stages: Open &rarr; Assigned &rarr; In Progress &rarr; Fixed &rarr; Retest &rarr; Closed.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report Defect</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 pl-1">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Filter:</span>
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical (Release Blockers)</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="fixed">Fixed</option>
          <option value="retest">Retest</option>
          <option value="closed">Closed</option>
        </select>
        {(severityFilter || statusFilter) && (
          <button
            onClick={() => {
              setSeverityFilter('');
              setStatusFilter('');
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline text-xs ml-auto font-medium cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Defects Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Defect ID</th>
                <th className="px-4 py-3">Title & Summary</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {defects.map((def) => {
                const isCriticalBlocker = def.severity === 'critical' && def.status !== 'closed';
                return (
                  <tr
                    key={def.id}
                    className={`transition-colors ${
                      isCriticalBlocker ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {def.defect_code}
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                        {isCriticalBlocker && (
                          <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        )}
                        <span>{def.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{def.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge type="severity" value={def.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase font-mono font-medium">
                        {def.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{def.affected_module}</td>
                    <td className="px-4 py-3">
                      <Badge value={def.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedDefect(def)}
                          className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center space-x-1 text-xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => openStatusTransition(def)}
                          className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center space-x-1 transition-colors cursor-pointer ${
                            isCriticalBlocker
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          }`}
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Transition</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Defect Detail Modal */}
      {selectedDefect && !showStatusModal && (
        <Modal
          isOpen={!!selectedDefect}
          onClose={() => setSelectedDefect(null)}
          title={`Defect Audit: ${selectedDefect.defect_code}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Badge type="severity" value={selectedDefect.severity} size="md" />
                  <span className="text-slate-400">•</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">{selectedDefect.affected_module}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">{selectedDefect.title}</h3>
              </div>
              <Badge value={selectedDefect.status} size="md" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">Steps to Reproduce</h4>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                  {selectedDefect.steps_to_reproduce}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1 text-xs">Expected Outcome</h4>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">{selectedDefect.expected_result}</p>
                </div>
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1 text-xs">Actual Observed Defect</h4>
                  <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{selectedDefect.actual_result}</p>
                </div>
              </div>
            </div>

            {/* Root Cause & Corrective Action */}
            <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Engineering Root Cause & Resolution</h4>
              <div className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-blue-700 dark:text-blue-400">Root Cause: </span>
                {selectedDefect.root_cause || 'Under investigation.'}
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-green-700 dark:text-green-400">Corrective Action: </span>
                {selectedDefect.corrective_action || 'Pending implementation.'}
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-600 dark:text-slate-400">Preventive Action: </span>
                {selectedDefect.preventive_action || 'Pending review.'}
              </div>
            </div>

            {/* Defect Lifecycle History Log */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center space-x-1.5 text-xs">
                <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Lifecycle History Trail</span>
              </h4>
              <div className="space-y-1.5">
                {selectedDefect.history && selectedDefect.history.length > 0 ? (
                  selectedDefect.history.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {hist.old_status.toUpperCase()} &rarr; {hist.new_status.toUpperCase()}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hist.comments}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        <div>{hist.changed_by}</div>
                        <div>{new Date(hist.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs">No lifecycle transitions recorded yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedDefect(null)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Close View
              </button>
              <button
                onClick={() => openStatusTransition(selectedDefect)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                Change Defect Lifecycle Status
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lifecycle Transition Modal */}
      {selectedDefect && showStatusModal && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title={`Update Lifecycle: ${selectedDefect.defect_code}`}
        >
          <form onSubmit={handleStatusSubmit} className="space-y-3.5 text-xs">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedDefect.title}</div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                Current Status: <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase">{selectedDefect.status}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Target Lifecycle State</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="fixed">Fixed</option>
                <option value="retest">Retest (Verification)</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {targetStatus === 'retest' && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-slate-800 dark:text-slate-200 font-semibold">
                  Retest Evaluation (Verification Result)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Note: If retesting fails, the system automatically reopens the defect and records history!
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRetestOutcome('passed')}
                    className={`py-2 rounded-md border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      retestOutcome === 'passed'
                        ? 'bg-green-50 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>RETEST PASSED</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetestOutcome('failed')}
                    className={`py-2 rounded-md border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      retestOutcome === 'failed'
                        ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>RETEST FAILED (REOPEN)</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Root Cause Analysis</label>
              <textarea
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Identify underlying architectural or concurrency root cause..."
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Corrective Action Implemented</label>
              <input
                type="text"
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Distributed Redis lock applied with unique DB constraint..."
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Resolution & Transition Notes</label>
              <textarea
                rows={2}
                required
                value={transitionComments}
                onChange={(e) => setTransitionComments(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="State commit hash, PR link, or retest evidence..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                Apply Lifecycle State
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Defect Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Log Defect / Non-Conformance">
        <form onSubmit={handleCreateDefect} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Defect Title</label>
            <input
              type="text"
              required
              value={newDefect.title}
              onChange={(e) => setNewDefect({ ...newDefect, title: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Double payment deduction on network retry"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Category</label>
              <select
                value={newDefect.category}
                onChange={(e) => setNewDefect({ ...newDefect, category: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="payment_transaction">Payment & Transactions</option>
                <option value="functional">Functional Defect</option>
                <option value="security">Security Defect</option>
                <option value="performance">Performance Defect</option>
                <option value="data_integrity">Data Integrity</option>
                <option value="usability">Usability Defect</option>
                <option value="requirements">Requirements Defect</option>
                <option value="design">Design Defect</option>
                <option value="testing">Testing Defect</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Severity</label>
              <select
                value={newDefect.severity}
                onChange={(e) => setNewDefect({ ...newDefect, severity: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="critical">Critical (Release Blocker)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Affected Module</label>
              <input
                type="text"
                required
                value={newDefect.affected_module}
                onChange={(e) => setNewDefect({ ...newDefect, affected_module: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Webhook Handler"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Detailed Description</label>
            <textarea
              rows={2}
              required
              value={newDefect.description}
              onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="State precise failure behavior..."
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Steps to Reproduce</label>
            <textarea
              rows={2}
              required
              value={newDefect.steps_to_reproduce}
              onChange={(e) => setNewDefect({ ...newDefect, steps_to_reproduce: e.target.value })}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="1. Trigger action A...&#10;2. Observe outcome B..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Expected Result</label>
              <input
                type="text"
                required
                value={newDefect.expected_result}
                onChange={(e) => setNewDefect({ ...newDefect, expected_result: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Expected behavior"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Actual Observed Result</label>
              <input
                type="text"
                required
                value={newDefect.actual_result}
                onChange={(e) => setNewDefect({ ...newDefect, actual_result: e.target.value })}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Observed error"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              Record Defect
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

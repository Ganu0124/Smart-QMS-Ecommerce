import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { CAPA } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  RefreshCw,
  Plus,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Eye,
  FileCheck,
} from 'lucide-react';

const getDefaultDueDate = () => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

export const CAPAPage: React.FC = () => {
  const [capas, setCapas] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapa, setSelectedCapa] = useState<CAPA | null>(null);

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('in_progress');
  const [verificationEvidence, setVerificationEvidence] = useState('');
  const [effectivenessReview, setEffectivenessReview] = useState('');
  const [isEffective, setIsEffective] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCapa, setNewCapa] = useState(() => ({
    title: '',
    defect_id: 1,
    root_cause_analysis: '',
    immediate_correction: '',
    corrective_action: '',
    preventive_action: '',
    owner_id: 3, // Liam Patel (Dev)
    due_date: getDefaultDueDate(),
  }));

  const loadCapas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCapas({ project_id: 1 });
      setCapas(data);
      setSelectedCapa((prev) => {
        if (!prev) return null;
        return data.find((c) => c.id === prev.id) || null;
      });
    } catch (e) {
      console.error('Failed to load CAPAs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapas();
  }, [loadCapas]);

  const openStatusModal = (c: CAPA) => {
    setSelectedCapa(c);
    setNewStatus(c.status);
    setVerificationEvidence(c.verification_evidence || '');
    setEffectivenessReview(c.effectiveness_review || '');
    setIsEffective(c.is_effective ?? true);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapa) return;
    try {
      await api.updateCapa(selectedCapa.id, {
        status: newStatus,
        verification_evidence: verificationEvidence,
        effectiveness_review: effectivenessReview,
        is_effective: isEffective,
      });
      setShowStatusModal(false);
      loadCapas();
    } catch (err: any) {
      alert(`Error updating CAPA: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCapa({
        project_id: 1,
        ...newCapa,
        due_date: new Date(newCapa.due_date).toISOString(),
      });
      setShowCreateModal(false);
      loadCapas();
    } catch (err: any) {
      alert(`Error creating CAPA: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading CAPA Registry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Corrective & Preventive Actions (CAPA)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phase 7 (IMPROVE): Closed-loop quality remediation eliminating root causes of defect recurrence.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate New CAPA</span>
        </button>
      </div>

      {/* CAPA Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active CAPA Action Items</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mandatory root-cause resolution for recurring defects</p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">{capas.length} Items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">CAPA ID</th>
                <th className="px-4 py-3">Action Title & Root Cause</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Effectiveness</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {capas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {c.capa_code}
                  </td>
                  <td className="px-4 py-3.5 max-w-md">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{c.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Root Cause: </span>
                      {c.root_cause_analysis}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1 font-mono text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(c.due_date).toLocaleDateString()}</span>
                    </div>
                    {c.is_overdue && (
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center space-x-1 mt-0.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>OVERDUE</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge value={c.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    {c.is_effective === true && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>EFFECTIVE</span>
                      </span>
                    )}
                    {c.is_effective === false && (
                      <span className="text-red-600 dark:text-red-400 font-semibold text-[11px]">NOT EFFECTIVE</span>
                    )}
                    {c.is_effective === undefined && (
                      <span className="text-slate-400 text-[11px]">Pending Review</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedCapa(c)}
                        className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-1 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => openStatusModal(c)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center space-x-1 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>Update Status</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCapa && !showStatusModal && (
        <Modal
          isOpen={!!selectedCapa}
          onClose={() => setSelectedCapa(null)}
          title={`CAPA Audit: ${selectedCapa.capa_code}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedCapa.title}</h3>
                <div className="text-slate-500 dark:text-slate-400 mt-1">Due: {new Date(selectedCapa.due_date).toLocaleDateString()}</div>
              </div>
              <Badge value={selectedCapa.status} size="md" />
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Systemic Remediation Actions</h4>
              <div>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Root Cause Analysis: </span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{selectedCapa.root_cause_analysis}</p>
              </div>
              <div>
                <span className="font-semibold text-amber-700 dark:text-amber-400">Immediate Correction: </span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{selectedCapa.immediate_correction}</p>
              </div>
              <div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Corrective Action (Permanent Fix): </span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{selectedCapa.corrective_action}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Preventive Action (Recurrence Guard): </span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{selectedCapa.preventive_action}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => openStatusModal(selectedCapa)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs shadow-sm transition-colors cursor-pointer"
              >
                Update Verification & Effectiveness
              </button>
              <button
                onClick={() => setSelectedCapa(null)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Modal */}
      {selectedCapa && showStatusModal && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title={`Update CAPA: ${selectedCapa.capa_code}`}
        >
          <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Status Lifecycle</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Verification Evidence</label>
              <textarea
                rows={2}
                value={verificationEvidence}
                onChange={(e) => setVerificationEvidence(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="State automated test suite ID, code review approval, or load test results..."
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Effectiveness Review Notes</label>
              <textarea
                rows={2}
                value={effectivenessReview}
                onChange={(e) => setEffectivenessReview(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Reviewer confirmation that no duplicate payment race condition has recurred..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="eff-check"
                checked={isEffective}
                onChange={(e) => setIsEffective(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="eff-check" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                Remediation verified effective in preventing recurrence
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
              >
                Save Updates
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Initiate CAPA Action Item">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Action Title</label>
            <input
              type="text"
              required
              value={newCapa.title}
              onChange={(e) => setNewCapa({ ...newCapa, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Prevent Webhook Race Condition Double Deductions"
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Root Cause Analysis</label>
            <textarea
              rows={2}
              required
              value={newCapa.root_cause_analysis}
              onChange={(e) => setNewCapa({ ...newCapa, root_cause_analysis: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Underlying flaw..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Immediate Correction</label>
              <input
                type="text"
                required
                value={newCapa.immediate_correction}
                onChange={(e) => setNewCapa({ ...newCapa, immediate_correction: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Temporary containment..."
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Corrective Action</label>
              <input
                type="text"
                required
                value={newCapa.corrective_action}
                onChange={(e) => setNewCapa({ ...newCapa, corrective_action: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Permanent architectural fix..."
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Preventive Action</label>
            <input
              type="text"
              required
              value={newCapa.preventive_action}
              onChange={(e) => setNewCapa({ ...newCapa, preventive_action: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Mandate automated multi-thread concurrency regression..."
            />
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            >
              Initiate CAPA
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

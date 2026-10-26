import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Release } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCw,
  Lock,
  Info,
} from 'lucide-react';

export const ReleaseGatePage: React.FC = () => {
  const { user } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [approving, setApproving] = useState(false);

  // Approval Modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  const loadReleases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getReleases(1);
      setReleases(data);
      if (data.length > 0) {
        setSelectedRelease((prev) => {
          if (!prev) return data[0];
          return data.find((r) => r.id === prev.id) || data[0];
        });
      }
    } catch (e) {
      console.error('Failed to load releases', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const handleEvaluateGate = async () => {
    if (!selectedRelease) return;
    setEvaluating(true);
    try {
      const updated = await api.evaluateReleaseGate(selectedRelease.id);
      setSelectedRelease(updated);
      loadReleases();
    } catch (err: any) {
      alert(`Gate Evaluation Error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleApproveRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRelease) return;
    setApproving(true);
    try {
      const updated = await api.approveRelease(selectedRelease.id, { notes: approvalNotes });
      setShowApproveModal(false);
      setApprovalNotes('');
      setSelectedRelease(updated);
      loadReleases();
      alert(`Release ${updated.release_code} has been officially approved for ${updated.target_environment}!`);
    } catch (err: any) {
      alert(`Approval Blocked: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const isQualityDirector = ['admin', 'quality_manager'].includes(user?.role || '');
  const isBlocked = selectedRelease?.release_decision === 'BLOCKED';
  const isApproved = selectedRelease?.release_decision === 'APPROVED';
  const isReady = selectedRelease?.release_decision === 'READY_FOR_APPROVAL';

  if (loading && !selectedRelease) {
    return <div className="text-center py-12 text-slate-400">Loading Smart Release Gates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Smart Release Readiness Gate</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Automated Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strict policy enforcement engine evaluating 8 automated quality criteria across live test runs, defects, and verification logs.
          </p>
        </div>

        {/* Release Selector and Action buttons */}
        <div className="flex items-center space-x-2">
          {releases.length > 1 && (
            <select
              value={selectedRelease?.id}
              onChange={(e) => {
                const found = releases.find((r) => r.id === Number(e.target.value));
                if (found) setSelectedRelease(found);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-300 text-xs font-medium focus:ring-1 focus:ring-blue-500 shadow-sm"
            >
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.release_code} - {r.target_environment}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleEvaluateGate}
            disabled={evaluating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating Gates...' : 'Re-Evaluate Gates'}</span>
          </button>

          {isApproved ? (
            <div className="px-3.5 py-1.5 rounded-md bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-xs font-semibold flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
              <span>RELEASE FORMALLY APPROVED</span>
            </div>
          ) : (
            <button
              onClick={() => setShowApproveModal(true)}
              disabled={isBlocked || !isQualityDirector}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm ${
                isBlocked
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  : 'bg-green-700 hover:bg-green-800 text-white cursor-pointer'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve Release</span>
            </button>
          )}
        </div>
      </div>

      {/* Release Decision Summary Banner */}
      {selectedRelease && (
        <div
          className={`p-5 rounded-lg border shadow-sm transition-all ${
            isApproved
              ? 'bg-green-50/70 dark:bg-green-950/30 border-green-200 dark:border-green-900'
              : isBlocked
              ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900'
              : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {selectedRelease.release_code}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Target: {selectedRelease.target_environment}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedRelease.version_name}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                {isApproved
                  ? `Approved for production deployment by Quality Management.`
                  : isBlocked
                  ? `Release deployment blocked: 1 or more mandatory quality criteria failed. Resolve the highlighted action items below to qualify for deployment.`
                  : isReady
                  ? `Release cleared for sign-off: All 8 automated quality criteria have passed successfully.`
                  : `Release evaluation status: ${selectedRelease.release_decision}.`}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end shrink-0 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                Automated Gate Verdict
              </div>
              <div
                className={`px-3 py-1.5 rounded-md border text-xs font-bold tracking-wider uppercase flex items-center space-x-1.5 shadow-sm ${
                  isApproved
                    ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
                    : isBlocked
                    ? 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                    : 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}
              >
                {isBlocked ? <ShieldAlert className="w-4 h-4 text-red-600" /> : <ShieldCheck className="w-4 h-4 text-green-700" />}
                <span>{selectedRelease.release_decision}</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Evaluated: {selectedRelease.evaluated_at ? new Date(selectedRelease.evaluated_at).toLocaleTimeString() : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* The 8 Automated Quality Gate Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Release Gate Verification Matrix (8 Criteria)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Evaluates actual stored database entities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedRelease?.gate_results.map((gate) => {
            const isPass = gate.status === 'PASS';
            return (
              <div
                key={gate.id}
                className={`p-4 rounded-lg border transition-all ${
                  isPass
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    : 'bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{gate.check_code}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{gate.check_name}</h4>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center space-x-1 shrink-0 ${
                      isPass
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900'
                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900'
                    }`}
                  >
                    {isPass ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{gate.status}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{gate.explanation}</p>

                {gate.related_record && (
                  <div className="mt-2 text-[11px] text-slate-500 font-mono">
                    <span className="text-slate-400">Related Record: </span>
                    <span className="text-blue-600 dark:text-blue-400">{gate.related_record}</span>
                  </div>
                )}

                {!isPass && gate.required_corrective_action && (
                  <div className="mt-2.5 p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
                    <span className="font-semibold">Required Action: </span>
                    {gate.required_corrective_action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Release Audit History */}
      {selectedRelease?.approval_history && (
        <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Formal Release Evaluation & Approval Audit Trail</span>
          </h4>
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {selectedRelease.approval_history}
          </div>
        </div>
      )}

      {/* Approve Release Sign-Off Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title={`Authorize Production Release: ${selectedRelease?.release_code}`}
      >
        <form onSubmit={handleApproveRelease} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-md bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-900 dark:text-green-200">
            <div className="font-semibold flex items-center space-x-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-green-700 dark:text-green-400" />
              <span>All 8 Mandatory Quality Gates Cleared</span>
            </div>
            <p className="text-[11px] text-green-800 dark:text-green-300/90 leading-relaxed">
              Zero open Critical/High defects detected. 100% mandatory tests passed with execution evidence. Architecture baselined.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Formal Sign-Off Notes</label>
            <textarea
              rows={3}
              required
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
              placeholder="e.g. Certified compliant with E-Commerce Zero-Double-Charge standards. Approved for production deploy."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approving}
              className="px-3.5 py-1.5 rounded-md bg-green-700 hover:bg-green-800 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            >
              {approving ? 'Authorizing...' : 'Authorize Release'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

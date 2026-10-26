import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Review, Project, Requirement } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  AlertTriangle,
  Layers,
  Code2,
  Plus,
  AlertCircle,
  CheckCircle,
  GitBranch,
} from 'lucide-react';

interface ReviewsPageProps {
  initialTab?: 'design' | 'code';
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ initialTab = 'design' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'design' | 'code'>(initialTab);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const selectedReviewIdRef = React.useRef<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    selectedReviewIdRef.current = selectedReview?.id || null;
  }, [selectedReview]);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    title: '',
    target_ref: '',
    requirement_id: undefined as number | undefined,
  });

  // Review Decision Modal (for Code Reviews)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState<'approved' | 'rework_required' | 'rejected'>('approved');
  const [decisionComments, setDecisionComments] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const isReviewer = ['admin', 'quality_manager', 'reviewer'].includes(user?.role || '');

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [projs, revs, reqs] = await Promise.all([
        api.getProjects(),
        api.getReviews({ project_id: selectedProjectId, review_type: activeTab }),
        api.getRequirements({ project_id: selectedProjectId }),
      ]);
      setProjects(projs);
      setReviews(revs);
      setRequirements(reqs);

      if (revs.length > 0) {
        const currentId = selectedReviewIdRef.current;
        const target = currentId ? revs.find((r) => r.id === currentId) || revs[0] : revs[0];
        const full = await api.getReview(target.id);
        setSelectedReview(full);
      } else {
        setSelectedReview(null);
      }
    } catch (e) {
      console.error('Failed to load reviews data', e);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectReview = async (rev: Review) => {
    setActionError(null);
    try {
      const full = await api.getReview(rev.id);
      setSelectedReview(full);
    } catch (err: any) {
      alert(`Failed to load review: ${err.message}`);
    }
  };

  const handleChecklistResult = async (
    itemId: number,
    newResult: 'pass' | 'fail' | 'not_applicable' | 'pending'
  ) => {
    setActionError(null);
    let comments = '';
    if (newResult === 'fail' || newResult === 'not_applicable') {
      const promptComment = window.prompt(
        `Please provide mandatory explanation for marking this checklist item as ${newResult.toUpperCase()}:`
      );
      if (!promptComment || promptComment.trim().length === 0) {
        alert('An explanation is required when an item fails or is marked Not Applicable.');
        return;
      }
      comments = promptComment.trim();
    }

    try {
      await api.updateChecklistItem(itemId, { result: newResult, comments: comments || undefined });
      if (selectedReview) {
        const full = await api.getReview(selectedReview.id);
        setSelectedReview(full);
      }
    } catch (err: any) {
      alert(`Error updating checklist item: ${err.message}`);
    }
  };

  const handleBaselineDesign = async (reviewId: number) => {
    setActionError(null);
    try {
      await api.updateReview(reviewId, {
        is_baselined: true,
        status: 'passed',
        outcome: 'approved',
        outcome_notes: `Architectural baseline formally established and verified by ${user?.full_name}`,
      });
      alert('Design successfully verified, passed, and formally baselined!');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Design baselining was blocked.');
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createReview({
        project_id: selectedProjectId,
        review_type: activeTab,
        title: newReviewForm.title,
        target_ref: newReviewForm.target_ref,
        requirement_id: newReviewForm.requirement_id || undefined,
      });
      setShowCreateModal(false);
      setNewReviewForm({ title: '', target_ref: '', requirement_id: undefined });
      loadData();
      alert(`New ${activeTab.toUpperCase()} Review created with 10 standard checklist items.`);
    } catch (err: any) {
      alert(`Error creating review: ${err.message}`);
    }
  };

  // Self-approval detection for Code Reviews
  const isSelfApprovalBlocked = (): boolean => {
    if (activeTab !== 'code' || !selectedReview) return false;
    // If the review has a linked task, check if the developer is the current user
    if (selectedReview.task && selectedReview.task.developer_id === user?.id) {
      return true;
    }
    return false;
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    setActionError(null);

    if (decisionOutcome === 'rejected' && (!decisionComments || decisionComments.trim().length < 5)) {
      setActionError('Comments explaining rejection rationale are required (min 5 characters).');
      return;
    }

    try {
      let newStatus: string = 'in_progress';
      if (decisionOutcome === 'approved') newStatus = 'passed';
      else if (decisionOutcome === 'rework_required') newStatus = 'rework_required';
      else if (decisionOutcome === 'rejected') newStatus = 'failed';

      await api.updateReview(selectedReview.id, {
        status: newStatus,
        outcome: decisionOutcome,
        outcome_notes: decisionComments || undefined,
        comments: decisionComments || undefined,
      });

      setShowDecisionModal(false);
      setDecisionComments('');
      loadData();
      alert(`Code Review decision '${decisionOutcome.toUpperCase()}' recorded successfully.`);
    } catch (err: any) {
      setActionError(err.message || 'Review decision rejected by server.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Architecture & Peer Code Reviews</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              10-Point Verification
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Systematic 10-point architectural verification, payment idempotency audit, and peer code review gating.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>

          {/* Tab Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
            <button
              onClick={() => {
                setActiveTab('design');
                setSelectedReview(null);
              }}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'design'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Design Reviews (10 Checks)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('code');
                setSelectedReview(null);
              }}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Reviews (10 Checks)</span>
            </button>
          </div>

          {activeTab === 'design' && isReviewer && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Design Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Review Records List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {activeTab === 'design' ? 'Design Reviews' : 'Code Reviews'}
            </h3>
            <span className="text-xs font-mono text-slate-500">{reviews.length} Total</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-500 text-xs">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              No {activeTab} reviews found for this project.
            </div>
          ) : (
            reviews.map((rev) => {
              const isSelected = selectedReview?.id === rev.id;
              return (
                <div
                  key={rev.id}
                  onClick={() => handleSelectReview(rev)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-slate-800 border-blue-400 dark:border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{rev.review_code}</span>
                    <Badge value={rev.status} />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{rev.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono text-[11px] truncate">
                    Ref: {rev.target_ref}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">
                      {rev.checklist_items ? rev.checklist_items.length : 10} Checklist Items
                    </span>
                    {activeTab === 'design' ? (
                      rev.is_baselined ? (
                        <span className="text-green-700 dark:text-green-400 font-semibold flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>BASELINED</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>PENDING BASELINE</span>
                        </span>
                      )
                    ) : rev.outcome ? (
                      <span className={`font-semibold uppercase text-[10px] ${
                        rev.outcome === 'approved' ? 'text-green-700 dark:text-green-400' : rev.outcome === 'rework_required' ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {rev.outcome.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Awaiting Sign-off</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column (2 spans): Active Review Details & 10-Point Checklist */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col">
          {selectedReview ? (
            <>
              {/* Review Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {selectedReview.review_code}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedReview.target_ref}</span>
                    {selectedReview.requirement && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                          {selectedReview.requirement.req_code}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{selectedReview.title}</h3>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  {/* Action for Design Review: Baseline Design */}
                  {activeTab === 'design' && isReviewer && !selectedReview.is_baselined && (
                    <button
                      onClick={() => handleBaselineDesign(selectedReview.id)}
                      className="px-3 py-1.5 rounded-md bg-green-700 hover:bg-green-800 text-white font-medium text-xs shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Baseline Architecture</span>
                    </button>
                  )}

                  {/* Action for Code Review: Sign-off Decision */}
                  {activeTab === 'code' && isReviewer && (
                    <button
                      onClick={() => {
                        setShowDecisionModal(true);
                        setActionError(null);
                      }}
                      disabled={isSelfApprovalBlocked()}
                      className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        isSelfApprovalBlocked()
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                          : 'bg-green-700 hover:bg-green-800 text-white shadow-sm'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Record Decision</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Error Banner */}
              {actionError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Operation Blocked: </span>
                    <span>{actionError}</span>
                  </div>
                </div>
              )}

              {/* Self-approval Warning Banner */}
              {isSelfApprovalBlocked() && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Self-Approval Restricted: </span>
                    <span>
                      You are assigned as the developer for this task. Developers cannot approve their own code changes. An independent authorized reviewer must sign off.
                    </span>
                  </div>
                </div>
              )}

              {/* Context bar (Task info / PR info) */}
              {selectedReview.task && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                      Task: {selectedReview.task.task_code}
                    </span>
                    <span>{selectedReview.task.title}</span>
                    {selectedReview.task.branch && (
                      <span className="flex items-center space-x-1 text-slate-400 font-mono text-[11px]">
                        <GitBranch className="w-3 h-3 text-slate-500" />
                        <span>{selectedReview.task.branch}</span>
                      </span>
                    )}
                  </div>
                  {selectedReview.task.pr_url && (
                    <a
                      href={selectedReview.task.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 text-[11px]"
                    >
                      <span>View Pull Request</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Outcome notes if present */}
              {selectedReview.outcome_notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Review Outcome Notes: </span>
                  <span className="text-slate-600 dark:text-slate-400">{selectedReview.outcome_notes}</span>
                </div>
              )}

              {/* Checklist items list */}
              <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium flex items-center justify-between">
                  <span>
                    Enforcing 10 Mandatory Quality Checklists (All mandatory items must pass to approve):
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    {selectedReview.checklist_items?.filter((i) => i.result === 'pass').length || 0}/
                    {selectedReview.checklist_items?.length || 10} Passed
                  </span>
                </div>

                {selectedReview.checklist_items?.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 max-w-lg">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400 font-bold text-xs">{idx + 1}.</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{item.item_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-mono">
                            {item.category.replace(/_/g, ' ')}
                          </span>
                          {item.is_mandatory && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 uppercase font-bold">
                              Mandatory
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-4">{item.description}</p>
                        )}
                        {item.comments && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-mono mt-1 ml-4 italic">
                            Evidence/Comment: {item.comments}
                          </p>
                        )}
                      </div>

                      {/* Interactive Result Selector */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-4 sm:ml-0">
                        {isReviewer ? (
                          <>
                            <button
                              onClick={() => handleChecklistResult(item.id, 'pass')}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                                item.result === 'pass'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>PASS</span>
                            </button>
                            <button
                              onClick={() => handleChecklistResult(item.id, 'fail')}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                                item.result === 'fail'
                                  ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-500'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <XCircle className="w-3 h-3" />
                              <span>FAIL</span>
                            </button>
                            <button
                              onClick={() => handleChecklistResult(item.id, 'not_applicable')}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                                item.result === 'not_applicable'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-500'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <span>N.A.</span>
                            </button>
                          </>
                        ) : (
                          <Badge value={item.result} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-xs">
              Select a review from the left panel to inspect the 10-point checklist.
            </div>
          )}
        </div>
      </div>

      {/* Create Design Review Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Initiate New Architecture Design Review"
      >
        <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Review Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newReviewForm.title}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Multi-AZ Idempotent Payment Flow Architecture Design"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Design Target Reference (Doc / ADR / Spec URL) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newReviewForm.target_ref}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, target_ref: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              placeholder="e.g. docs/adr/003-payment-concurrency.md"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Linked Approved Requirement</label>
            <select
              value={newReviewForm.requirement_id || ''}
              onChange={(e) =>
                setNewReviewForm({
                  ...newReviewForm,
                  requirement_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None (General Architecture Review)</option>
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.req_code} - {req.title} ({req.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
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
              Create Review
            </button>
          </div>
        </form>
      </Modal>

      {/* Code Review Formal Decision Modal */}
      <Modal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title={`Record Code Review Decision: ${selectedReview?.review_code}`}
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedReview?.title}</div>
            <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
              Verifies 10-point code quality checklist, duplicate prevention, and test coverage before task completion.
            </div>
          </div>

          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Decision Blocked: </span>
                <span className="text-[11px]">{actionError}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Decision Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecisionOutcome('approved')}
                className={`py-2 rounded-md border font-semibold text-center transition-colors cursor-pointer text-xs ${
                  decisionOutcome === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                APPROVE
              </button>
              <button
                type="button"
                onClick={() => setDecisionOutcome('rework_required')}
                className={`py-2 rounded-md border font-semibold text-center transition-colors cursor-pointer text-xs ${
                  decisionOutcome === 'rework_required'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                REWORK
              </button>
              <button
                type="button"
                onClick={() => setDecisionOutcome('rejected')}
                className={`py-2 rounded-md border font-semibold text-center transition-colors cursor-pointer text-xs ${
                  decisionOutcome === 'rejected'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                REJECT
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Decision Comments / Findings {decisionOutcome !== 'approved' && <span className="text-red-500">* (Required)</span>}
            </label>
            <textarea
              rows={3}
              required={decisionOutcome !== 'approved'}
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={
                decisionOutcome === 'approved'
                  ? 'All 10 quality checks verified. PR approved for merge...'
                  : 'Specify defect findings, unhandled race conditions, or missing tests requiring rework...'
              }
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDecisionModal(false)}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-md font-medium text-xs text-white shadow-sm transition-colors cursor-pointer ${
                decisionOutcome === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : decisionOutcome === 'rework_required'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Confirm Decision
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

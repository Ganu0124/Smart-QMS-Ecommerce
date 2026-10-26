import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Requirement, QualityObjective, Project, Review, RequirementHistory } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Send,
  History,
  ShieldCheck,
  AlertCircle,
  Eye,
  Filter,
  Search,
  Edit2,
  CheckSquare,
  AlertTriangle,
  Clock,
  User,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const RequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [objectives, setObjectives] = useState<QualityObjective[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected Requirement for Detail View & Active Tab
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [detailTab, setDetailTab] = useState<'spec' | 'checklist' | 'versions'>('spec');
  const [versions, setVersions] = useState<RequirementHistory[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [reqReview, setReqReview] = useState<Review | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Approval Form
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'rejected'>('approved');
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Requirement Form State (Used for both Create and Edit)
  const [reqForm, setReqForm] = useState({
    title: '',
    description: '',
    acceptance_criteria: '',
    category: 'Payment Processing',
    priority: 'high',
    risk_level: 'medium',
    quality_factor: 'reliability',
    quality_objective_id: undefined as number | undefined,
    is_mandatory: true,
  });

  const canApprove = ['admin', 'quality_manager', 'reviewer'].includes(user?.role || '');

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const [projs, reqs, objs] = await Promise.all([
        api.getProjects(),
        api.getRequirements({
          project_id: selectedProjectId,
          status_filter: statusFilter || undefined,
          priority_filter: priorityFilter || undefined,
          risk_level: riskFilter || undefined,
          category: categoryFilter || undefined,
          search: searchQuery || undefined,
        }),
        api.getObjectives(selectedProjectId),
      ]);
      setProjects(projs);
      setRequirements(reqs);
      setObjectives(objs);
    } catch (e) {
      console.error('Failed to load requirements', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, [selectedProjectId, statusFilter, priorityFilter, riskFilter, categoryFilter, searchQuery]);

  // Load detail data when a requirement is selected
  const handleSelectRequirement = async (req: Requirement) => {
    setSelectedReq(req);
    setDetailTab('spec');
    loadRequirementReview(req.id);
    loadRequirementVersions(req.id);
  };

  const loadRequirementReview = async (reqId: number) => {
    setLoadingReview(true);
    try {
      const revs = await api.getReviews({
        project_id: selectedProjectId,
        requirement_id: reqId,
        review_type: 'requirement',
      });
      if (revs && revs.length > 0) {
        // Fetch full review with checklist items
        const fullReview = await api.getReview(revs[0].id);
        setReqReview(fullReview);
      } else {
        setReqReview(null);
      }
    } catch (err) {
      console.error('Failed to load requirement review', err);
      setReqReview(null);
    } finally {
      setLoadingReview(false);
    }
  };

  const loadRequirementVersions = async (reqId: number) => {
    setLoadingVersions(true);
    try {
      const vers = await api.getRequirementVersions(reqId);
      setVersions(vers);
    } catch (err) {
      console.error('Failed to load requirement versions', err);
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequirement({
        project_id: selectedProjectId,
        title: reqForm.title,
        description: reqForm.description,
        acceptance_criteria: reqForm.acceptance_criteria,
        category: reqForm.category,
        priority: reqForm.priority,
        risk_level: reqForm.risk_level,
        quality_factor: reqForm.quality_factor,
        quality_objective_id: reqForm.quality_objective_id || undefined,
        is_mandatory: reqForm.is_mandatory,
      });
      setShowCreateModal(false);
      resetReqForm();
      loadRequirements();
    } catch (err: any) {
      alert(`Error creating requirement: ${err.message}`);
    }
  };

  const handleOpenEdit = (req: Requirement) => {
    setReqForm({
      title: req.title,
      description: req.description,
      acceptance_criteria: req.acceptance_criteria,
      category: req.category || 'Payment Processing',
      priority: req.priority,
      risk_level: req.risk_level,
      quality_factor: req.quality_factor,
      quality_objective_id: req.quality_objective_id,
      is_mandatory: req.is_mandatory,
    });
    setSelectedReq(req);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      const updated = await api.updateRequirement(selectedReq.id, {
        title: reqForm.title,
        description: reqForm.description,
        acceptance_criteria: reqForm.acceptance_criteria,
        category: reqForm.category,
        priority: reqForm.priority,
        risk_level: reqForm.risk_level,
        quality_factor: reqForm.quality_factor,
        quality_objective_id: reqForm.quality_objective_id || undefined,
        is_mandatory: reqForm.is_mandatory,
      });
      setShowEditModal(false);
      setSelectedReq(updated);
      loadRequirements();
      loadRequirementVersions(selectedReq.id);
      loadRequirementReview(selectedReq.id);
    } catch (err: any) {
      alert(`Error updating requirement: ${err.message}`);
    }
  };

  const resetReqForm = () => {
    setReqForm({
      title: '',
      description: '',
      acceptance_criteria: '',
      category: 'Payment Processing',
      priority: 'high',
      risk_level: 'medium',
      quality_factor: 'reliability',
      quality_objective_id: undefined,
      is_mandatory: true,
    });
  };

  const handleSubmitForReview = async (reqId: number) => {
    try {
      const updated = await api.submitRequirement(reqId);
      loadRequirements();
      if (selectedReq?.id === reqId) {
        setSelectedReq(updated);
        loadRequirementReview(reqId);
      }
      alert('Requirement submitted for review. 10-point Quality Checklist initiated.');
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    }
  };

  const handleChecklistChange = async (itemId: number, newResult: 'pass' | 'fail' | 'not_applicable' | 'pending') => {
    let comment = '';
    if (newResult === 'fail' || newResult === 'not_applicable') {
      const promptComment = window.prompt(`Please provide a mandatory explanation for marking this item as ${newResult.toUpperCase()}:`);
      if (!promptComment || promptComment.trim().length === 0) {
        alert('An explanation is required when an item fails or is marked Not Applicable.');
        return;
      }
      comment = promptComment.trim();
    }
    try {
      await api.updateChecklistItem(itemId, {
        result: newResult,
        comments: comment || undefined,
      });
      if (selectedReq) {
        loadRequirementReview(selectedReq.id);
      }
    } catch (err: any) {
      alert(`Checklist update error: ${err.message}`);
    }
  };

  const handleOpenApproval = (req: Requirement) => {
    setSelectedReq(req);
    setApprovalDecision('approved');
    setApprovalComments('');
    setApprovalError(null);
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setApprovalError(null);

    if (approvalDecision === 'rejected' && (!approvalComments || approvalComments.trim().length < 5)) {
      setApprovalError('Rejection requires descriptive comments (minimum 5 characters) explaining the failure.');
      return;
    }

    try {
      const updated = await api.approveRequirement(selectedReq.id, {
        decision: approvalDecision,
        comments: approvalComments,
      });
      setShowApprovalModal(false);
      setApprovalComments('');
      setSelectedReq(updated);
      loadRequirements();
      loadRequirementReview(selectedReq.id);
      loadRequirementVersions(selectedReq.id);
      alert(`Requirement successfully ${approvalDecision.toUpperCase()}!`);
    } catch (err: any) {
      setApprovalError(err.message || 'Approval decision rejected by server.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Requirements Management & Peer Reviews</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Requirements Baseline
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formal acceptance criteria, quality factors, 10-point checklist reviews, and strict version control.
          </p>
        </div>

        <div className="flex items-center space-x-2">
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

          <button
            onClick={() => {
              resetReqForm();
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Requirement</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requirements by code, title, or acceptance criteria..."
            className="bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none w-full text-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Payment Processing">Payment Processing</option>
          <option value="Checkout & Cart">Checkout & Cart</option>
          <option value="Security & Auth">Security & Auth</option>
          <option value="Pricing & Inventory">Pricing & Inventory</option>
          <option value="Order Management">Order Management</option>
          <option value="Compliance">Compliance & Auditing</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="submitted">Submitted for Review</option>
          <option value="draft">Draft</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {(searchQuery || statusFilter || priorityFilter || categoryFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
              priorityFilter && setPriorityFilter('');
              setCategoryFilter('');
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline text-xs ml-auto font-medium cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Requirements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Req ID</th>
                <th className="px-4 py-3">Requirement Title & Specification</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority / Risk</th>
                <th className="px-4 py-3">Quality Objective</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Review Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requirements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No requirements found matching criteria.
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {req.req_code}
                    </td>
                    <td className="px-4 py-3 max-w-xs sm:max-w-md">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{req.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{req.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                        {req.category || 'Core'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Badge type="severity" value={req.priority} />
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">R:{req.risk_level}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      {req.quality_objective ? (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate" title={req.quality_objective.title}>
                          {req.quality_objective.title}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unlinked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px]">
                        v{req.version}.0
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge value={req.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleSelectRequirement(req)}
                          className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center space-x-1 text-xs cursor-pointer"
                          title="View Details & Checklist"
                        >
                          <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(req)}
                          className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center space-x-1 text-xs cursor-pointer"
                          title="Edit Requirement"
                        >
                          <Edit2 className="w-3 h-3 text-amber-600" />
                          <span>Edit</span>
                        </button>

                        {(req.status === 'draft' || req.status === 'rejected') && (
                          <button
                            onClick={() => handleSubmitForReview(req.id)}
                            className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center space-x-1 text-xs cursor-pointer"
                            title={req.status === 'rejected' ? 'Re-submit for Review' : 'Submit for Review'}
                          >
                            <Send className="w-3 h-3" />
                            <span>{req.status === 'rejected' ? 'Re-submit' : 'Submit'}</span>
                          </button>
                        )}

                        {req.status === 'submitted' && canApprove && (
                          <button
                            onClick={() => handleOpenApproval(req)}
                            className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center space-x-1 text-xs cursor-pointer"
                            title="Review Sign-off"
                          >
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span>Sign-Off</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requirement Details Modal with Tabbed Interface */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq && !showApprovalModal && !showEditModal}
          onClose={() => setSelectedReq(null)}
          title={`Requirement Traceability & Review: ${selectedReq.req_code}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedReq.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">Version v{selectedReq.version}.0</span>
                  <span>•</span>
                  <span>Category: {selectedReq.category || 'General'}</span>
                  <span>•</span>
                  <span>Quality Factor: {selectedReq.quality_factor}</span>
                  <span>•</span>
                  <span>Mandatory: {selectedReq.is_mandatory ? 'YES' : 'NO'}</span>
                </div>
              </div>
              <Badge value={selectedReq.status} size="md" />
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setDetailTab('spec')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                  detailTab === 'spec'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Specification & Alignment
              </button>
              <button
                onClick={() => setDetailTab('checklist')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  detailTab === 'checklist'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>10-Point Review Checklist</span>
                {reqReview && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
                    {reqReview.checklist_items?.filter((i) => i.result === 'pass').length || 0}/10
                  </span>
                )}
              </button>
              <button
                onClick={() => setDetailTab('versions')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  detailTab === 'versions'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Version History ({versions.length})</span>
              </button>
            </div>

            {/* Tab 1: Spec & Alignment */}
            {detailTab === 'spec' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-1.5 text-xs">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Requirement Specification</span>
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-xs">
                      {selectedReq.description}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center space-x-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Acceptance Criteria</span>
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                      {selectedReq.acceptance_criteria}
                    </p>
                  </div>
                </div>

                {/* Quality Objective Link */}
                {selectedReq.quality_objective && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Linked Quality Objective</div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{selectedReq.quality_objective.title}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Factor: <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">{selectedReq.quality_objective.quality_factor}</span> | Target: {selectedReq.quality_objective.measurable_target}
                    </div>
                  </div>
                )}

                {/* Review Comments */}
                {selectedReq.review_comments && (
                  <div className={`p-3.5 rounded-lg border ${
                    selectedReq.status === 'rejected'
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                  }`}>
                    <h4 className="font-semibold mb-1 flex items-center space-x-1.5 text-xs">
                      {selectedReq.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      <span>Reviewer Feedback ({selectedReq.status.toUpperCase()})</span>
                    </h4>
                    <p className="leading-relaxed text-xs">{selectedReq.review_comments}</p>
                  </div>
                )}

                {/* Linked Test Cases & Defects */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-xs">Linked Test Cases</h5>
                    {selectedReq.test_cases && selectedReq.test_cases.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedReq.test_cases.map((tc) => (
                          <div key={tc.id} className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">{tc.tc_code}</span>
                            <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">{tc.scenario_title}</span>
                            <Badge value={tc.status} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">No test cases linked yet.</p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-xs">Related Defects</h5>
                    {selectedReq.defects && selectedReq.defects.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedReq.defects.map((def) => (
                          <div key={def.id} className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                            <span className="font-mono text-red-600 dark:text-red-400 font-medium">{def.defect_code}</span>
                            <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">{def.title}</span>
                            <Badge type="severity" value={def.severity} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">No open defects recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: 10-Point Checklist */}
            {detailTab === 'checklist' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Requirements Quality Review Checklist</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mandatory verification across clarity, completeness, security, testability, and error handling.
                    </p>
                  </div>
                  {reqReview && (
                    <Badge value={reqReview.status} />
                  )}
                </div>

                {loadingReview ? (
                  <div className="py-6 text-center text-slate-500">Loading checklist items...</div>
                ) : !reqReview ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p>No active review initiated for this requirement.</p>
                    {(selectedReq.status === 'draft' || selectedReq.status === 'rejected') && (
                      <button
                        onClick={() => handleSubmitForReview(selectedReq.id)}
                        className="mt-3 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        {selectedReq.status === 'rejected' ? 'Re-submit Requirement for Review' : 'Submit Requirement to Initialize Checklist'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {reqReview.checklist_items?.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-slate-400 font-bold">{idx + 1}.</span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{item.item_name}</span>
                              {item.is_mandatory && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium">
                                  Mandatory
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 ml-5">{item.description}</p>
                            )}
                            {item.comments && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 ml-5 italic">
                                Note: {item.comments}
                              </p>
                            )}
                          </div>

                          {/* Pass / Fail / N.A. Button group */}
                          {canApprove && selectedReq.status !== 'approved' ? (
                            <div className="flex items-center space-x-1 shrink-0 ml-5 sm:ml-0">
                              <button
                                type="button"
                                onClick={() => handleChecklistChange(item.id, 'pass')}
                                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  item.result === 'pass'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                PASS
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistChange(item.id, 'fail')}
                                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  item.result === 'fail'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                FAIL
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChecklistChange(item.id, 'not_applicable')}
                                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                  item.result === 'not_applicable'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                N.A.
                              </button>
                            </div>
                          ) : (
                            <Badge value={item.result} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Version History */}
            {detailTab === 'versions' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Historical Revision Baseline</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Audit log of requirement changes, previous approval decisions, and version snapshots.
                    </p>
                  </div>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-xs">Current: v{selectedReq.version}.0</span>
                </div>

                {loadingVersions ? (
                  <div className="py-6 text-center text-slate-500">Loading version history...</div>
                ) : versions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    No previous versions. This is the initial baseline (v{selectedReq.version}.0).
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {versions.map((ver) => (
                      <div key={ver.id} className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">v{ver.version}.0</span>
                            <span className="text-slate-900 dark:text-slate-100 font-semibold text-xs">{ver.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Changed by <span className="text-slate-700 dark:text-slate-300 font-semibold">{ver.changed_by}</span> at{' '}
                            {new Date(ver.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Summary: </span>
                          {ver.change_summary || 'Requirement specification baseline updated'}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-3">
                          {ver.acceptance_criteria}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(selectedReq)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit Specification</span>
                </button>
                {selectedReq.status === 'draft' && (
                  <button
                    onClick={() => handleSubmitForReview(selectedReq.id)}
                    className="px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Review</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {selectedReq.status === 'submitted' && canApprove && (
                  <button
                    onClick={() => handleOpenApproval(selectedReq)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-xs shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Sign-Off Decision</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedReq(null)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Formal Approval Decision Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={`Formal Review Sign-Off: ${selectedReq?.req_code}`}
      >
        <form onSubmit={handleApprovalSubmit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedReq?.title}</div>
            <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
              Quality Engineer sign-off validates acceptance criteria clarity, testability, and 10-point checklist completion.
            </div>
          </div>

          {approvalError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <div className="font-bold">Sign-off Blocked:</div>
                <div className="text-[11px]">{approvalError}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Approval Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApprovalDecision('approved')}
                className={`py-2 rounded-md border font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer text-xs ${
                  approvalDecision === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>APPROVE</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovalDecision('rejected')}
                className={`py-2 rounded-md border font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer text-xs ${
                  approvalDecision === 'rejected'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>REJECT</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Review Comments {approvalDecision === 'rejected' && <span className="text-red-600">* (Required on Rejection)</span>}
            </label>
            <textarea
              rows={3}
              required={approvalDecision === 'rejected'}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={
                approvalDecision === 'rejected'
                  ? 'Mandatory: State the precise reasons for rejection (e.g. Missing non-repudiation logging or vague criteria)...'
                  : 'State verification notes and quality compliance approval remarks...'
              }
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowApprovalModal(false)}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-md font-medium text-xs text-white shadow-sm transition-colors cursor-pointer ${
                approvalDecision === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Confirm {approvalDecision === 'approved' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Requirement Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Requirement: ${selectedReq?.req_code}`}
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          {selectedReq?.status === 'approved' && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Version Increment & Re-Review Warning:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  This requirement is currently <strong>Approved (v{selectedReq.version}.0)</strong>. Saving changes will automatically increment the version to <strong>v{selectedReq.version + 1}.0</strong>, archive the current baseline in historical records, and reset review status to <strong>Draft/In-Review</strong>.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Requirement Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reqForm.title}
              onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Category</label>
              <select
                value={reqForm.category}
                onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Payment Processing">Payment Processing</option>
                <option value="Checkout & Cart">Checkout & Cart</option>
                <option value="Security & Auth">Security & Auth</option>
                <option value="Pricing & Inventory">Pricing & Inventory</option>
                <option value="Order Management">Order Management</option>
                <option value="Compliance">Compliance & Auditing</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Link Quality Objective</label>
              <select
                value={reqForm.quality_objective_id || ''}
                onChange={(e) =>
                  setReqForm({
                    ...reqForm,
                    quality_objective_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None (Standalone)</option>
                {objectives.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Priority</label>
              <select
                value={reqForm.priority}
                onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Risk Level</label>
              <select
                value={reqForm.risk_level}
                onChange={(e) => setReqForm({ ...reqForm, risk_level: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Quality Factor</label>
              <select
                value={reqForm.quality_factor}
                onChange={(e) => setReqForm({ ...reqForm, quality_factor: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="reliability">Reliability</option>
                <option value="security">Security</option>
                <option value="correctness">Correctness</option>
                <option value="data_integrity">Data Integrity</option>
                <option value="efficiency">Efficiency</option>
                <option value="maintainability">Maintainability</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Specification Description (Min 10 characters) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={reqForm.description}
              onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Acceptance Criteria (Min 10 characters) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={reqForm.acceptance_criteria}
              onChange={(e) => setReqForm({ ...reqForm, acceptance_criteria: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="edit-mand"
              checked={reqForm.is_mandatory}
              onChange={(e) => setReqForm({ ...reqForm, is_mandatory: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="edit-mand" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Mandatory Release Gate Requirement
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Requirement Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Define New E-Commerce Requirement">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Requirement Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reqForm.title}
              onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Distributed Payment Gateway Idempotency Mutex"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Category</label>
              <select
                value={reqForm.category}
                onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Payment Processing">Payment Processing</option>
                <option value="Checkout & Cart">Checkout & Cart</option>
                <option value="Security & Auth">Security & Auth</option>
                <option value="Pricing & Inventory">Pricing & Inventory</option>
                <option value="Order Management">Order Management</option>
                <option value="Compliance">Compliance & Auditing</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Link Quality Objective</label>
              <select
                value={reqForm.quality_objective_id || ''}
                onChange={(e) =>
                  setReqForm({
                    ...reqForm,
                    quality_objective_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None (Standalone)</option>
                {objectives.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Priority</label>
              <select
                value={reqForm.priority}
                onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Risk Level</label>
              <select
                value={reqForm.risk_level}
                onChange={(e) => setReqForm({ ...reqForm, risk_level: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Quality Factor</label>
              <select
                value={reqForm.quality_factor}
                onChange={(e) => setReqForm({ ...reqForm, quality_factor: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="reliability">Reliability</option>
                <option value="security">Security</option>
                <option value="correctness">Correctness</option>
                <option value="data_integrity">Data Integrity</option>
                <option value="efficiency">Efficiency</option>
                <option value="maintainability">Maintainability</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Specification Description (Min 10 characters) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={reqForm.description}
              onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="State precise functional behavior and edge cases..."
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Acceptance Criteria (Min 10 characters) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={reqForm.acceptance_criteria}
              onChange={(e) => setReqForm({ ...reqForm, acceptance_criteria: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
              placeholder="1. When condition X happens, system must verify Y..."
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="mand-check"
              checked={reqForm.is_mandatory}
              onChange={(e) => setReqForm({ ...reqForm, is_mandatory: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="mand-check" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Mandatory release gate requirement (Must be approved before release)
            </label>
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
              Create Requirement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { QualityObjective, RiskAssessment, QAPlan, ProjectMilestone, Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  Target,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Calendar,
  User,
  Flag,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const QualityPlanningPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [objectives, setObjectives] = useState<QualityObjective[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [qaPlans, setQaPlans] = useState<QAPlan[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [factorFilter, setFactorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showObjModal, setShowObjModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<QualityObjective | null>(null);

  // Objective Form State
  const [objForm, setObjForm] = useState({
    title: '',
    description: '',
    quality_factor: 'reliability',
    target_value: 0.0,
    unit: '%',
    measurable_target: '',
    responsible_owner: '',
    priority: 'high',
    status: 'in_progress',
    due_date: '',
  });

  // Risk Form State
  const [newRisk, setNewRisk] = useState({
    risk_item: '',
    category: 'payment',
    probability: 'medium',
    impact: 'high',
    risk_score: 15,
    mitigation_strategy: '',
  });

  const canManage = ['admin', 'quality_manager'].includes(user?.role || '');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, objs, rks, qps, mls] = await Promise.all([
        api.getProjects(),
        api.getObjectives({
          project_id: selectedProjectId,
          quality_factor: factorFilter || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: searchQuery || undefined,
        }),
        api.getRisks(selectedProjectId),
        api.getQAPlans(selectedProjectId),
        api.getMilestones(selectedProjectId),
      ]);
      setProjects(projs);
      setObjectives(objs);
      setRisks(rks);
      setQaPlans(qps);
      setMilestones(mls);
    } catch (e) {
      console.error('Failed to load quality planning data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId, factorFilter, statusFilter, priorityFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingObjective(null);
    setObjForm({
      title: '',
      description: '',
      quality_factor: 'reliability',
      target_value: 0.0,
      unit: '%',
      measurable_target: '',
      responsible_owner: '',
      priority: 'high',
      status: 'in_progress',
      due_date: '',
    });
    setShowObjModal(true);
  };

  const handleOpenEditModal = (obj: QualityObjective) => {
    setEditingObjective(obj);
    setObjForm({
      title: obj.title,
      description: obj.description || '',
      quality_factor: obj.quality_factor,
      target_value: obj.target_value ?? 0.0,
      unit: obj.unit || '%',
      measurable_target: obj.measurable_target,
      responsible_owner: obj.responsible_owner,
      priority: obj.priority || 'high',
      status: obj.status,
      due_date: obj.due_date ? obj.due_date.split('T')[0] : '',
    });
    setShowObjModal(true);
  };

  const handleSaveObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      alert('Permission Denied: Only Quality Managers and Admins can create or update objectives.');
      return;
    }
    try {
      if (editingObjective) {
        await api.updateObjective(editingObjective.id, {
          ...objForm,
          due_date: objForm.due_date ? new Date(objForm.due_date).toISOString() : null,
        });
      } else {
        await api.createObjective({
          project_id: selectedProjectId,
          ...objForm,
          due_date: objForm.due_date ? new Date(objForm.due_date).toISOString() : null,
        });
      }
      setShowObjModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error saving objective: ${err.message}`);
    }
  };

  const handleDeleteObjective = async (id: number) => {
    if (!canManage) {
      alert('Permission Denied: Only Quality Managers and Admins can delete quality objectives.');
      return;
    }
    if (!confirm('Are you sure you want to delete this quality objective?')) return;
    try {
      await api.deleteObjective(id);
      loadData();
    } catch (err: any) {
      alert(`Failed to delete objective: ${err.message}`);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRisk({
        project_id: selectedProjectId,
        ...newRisk,
      });
      setShowRiskModal(false);
      setNewRisk({
        risk_item: '',
        category: 'payment',
        probability: 'medium',
        impact: 'high',
        risk_score: 15,
        mitigation_strategy: '',
      });
      loadData();
    } catch (err: any) {
      alert(`Error creating risk: ${err.message}`);
    }
  };

  // Stats calculation
  const totalCount = objectives.length;
  const achievedCount = objectives.filter((o) => o.status === 'achieved').length;
  const inProgressCount = objectives.filter((o) => o.status === 'in_progress').length;
  const atRiskCount = objectives.filter((o) => o.status === 'at_risk').length;
  const overdueCount = objectives.filter((o) => {
    if (o.status === 'overdue') return true;
    if (o.due_date && new Date(o.due_date) < new Date() && o.status !== 'achieved') return true;
    return false;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Quality Planning & Objective Tracking</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Establish measurable e-commerce quality targets, ISO 25010 factors, proactive risk mitigations, and track progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

          {canManage ? (
            <>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Objective</span>
              </button>
              <button
                onClick={() => setShowRiskModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log Risk</span>
              </button>
            </>
          ) : (
            <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Role: {user?.role} (View Only)
            </span>
          )}
        </div>
      </div>

      {/* Progress & Overdue Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Total Targets</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
          </div>
          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">Achieved</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{achievedCount}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">In Progress</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{inProgressCount}</div>
          </div>
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">At Risk</div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{atRiskCount}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className={`p-3.5 rounded-lg border shadow-sm flex items-center justify-between ${
          overdueCount > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div>
            <div className={`text-[11px] uppercase tracking-wider font-semibold ${
              overdueCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
            }`}>Overdue Items</div>
            <div className={`text-xl font-bold mt-1 ${
              overdueCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
            }`}>{overdueCount}</div>
          </div>
          <Clock className={`w-5 h-5 ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`} />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search objectives by title, factor, or owner..."
            className="bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full text-xs"
          />
        </div>

        <select
          value={factorFilter}
          onChange={(e) => setFactorFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Quality Factors</option>
          <option value="reliability">Reliability (Payment Integrity)</option>
          <option value="security">Security (Data Protection)</option>
          <option value="correctness">Correctness (Price & Inventory)</option>
          <option value="maintainability">Maintainability (Code Review)</option>
          <option value="efficiency">Efficiency & Performance</option>
          <option value="testability">Testability & Defect Leakage</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="achieved">Achieved</option>
          <option value="at_risk">At Risk</option>
          <option value="overdue">Overdue</option>
          <option value="not_started">Not Started</option>
        </select>

        {(searchQuery || factorFilter || priorityFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFactorFilter('');
              setPriorityFilter('');
              setStatusFilter('');
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline text-xs ml-auto cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Quality Objectives Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Measurable Quality Objectives</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 font-mono">
                {objectives.length} active
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Strictly tracked quality factor targets with verified owners and deadlines</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Objective & Description</th>
                <th className="px-3 py-3">Quality Factor</th>
                <th className="px-3 py-3">Measurable Target</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Responsible Owner</th>
                <th className="px-3 py-3">Due Date</th>
                <th className="px-3 py-3">Status</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {objectives.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="text-center py-8 text-slate-500">
                    No quality objectives match the selected filters.
                  </td>
                </tr>
              ) : (
                objectives.map((obj) => {
                  const isOverdue =
                    obj.status === 'overdue' ||
                    (obj.due_date && new Date(obj.due_date) < new Date() && obj.status !== 'achieved');

                  return (
                    <tr key={obj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{obj.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{obj.description}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {obj.quality_factor}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-blue-700 dark:text-blue-400 font-semibold">{obj.measurable_target}</div>
                        {obj.target_value !== undefined && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Target: {obj.target_value} {obj.unit || ''}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge type="severity" value={obj.priority || 'high'} />
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{obj.responsible_owner}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {obj.due_date ? (
                          <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(obj.due_date).toLocaleDateString()}</span>
                            {isOverdue && <span className="text-[10px] px-1 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 ml-1">LATE</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge value={isOverdue && obj.status !== 'achieved' ? 'overdue' : obj.status} />
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenEditModal(obj)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Objective"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteObjective(obj.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Delete Objective"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Risks & Mitigation Actions Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Quality Risks & Mitigation Actions</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Transaction integrity, double charges, overselling, and security mitigations</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{risks.length} Logged</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {risks.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">No risk assessments logged yet.</div>
            ) : (
              risks.map((risk) => (
                <div key={risk.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center space-x-2">
                        <span>{risk.risk_item}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono uppercase">
                          {risk.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
                        <span className="text-blue-700 dark:text-blue-400 font-semibold">Mitigation Action: </span>
                        {risk.mitigation_strategy}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-slate-500 font-mono">P: {risk.probability}</span>
                        <span className="text-[10px] text-slate-500 font-mono">| I: {risk.impact}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                        Score: {risk.risk_score}/25
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-mono">
                        {risk.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QA Scope & Milestones */}
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>QA Plan & Governance</span>
            </h3>
            {qaPlans.map((qp) => (
              <div key={qp.id} className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{qp.scope}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Standard: </span>
                  <span className="text-blue-700 dark:text-blue-400">{qp.quality_standards}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Cadence: </span>
                  <span className="text-slate-500">{qp.review_cadence}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 mb-2">
              <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quality Milestones</span>
            </h3>
            <div className="space-y-2">
              {milestones.map((ms) => (
                <div key={ms.id} className="text-xs p-2.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{ms.name}</span>
                    <Badge value={ms.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{ms.criteria}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Objective Modal (Create / Edit) */}
      <Modal
        isOpen={showObjModal}
        onClose={() => setShowObjModal(false)}
        title={editingObjective ? 'Edit Quality Objective' : 'Create Measurable Quality Objective'}
      >
        <form onSubmit={handleSaveObjective} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Objective Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={objForm.title}
              onChange={(e) => setObjForm({ ...objForm, title: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Prevent duplicate payment processing on checkout"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Quality Factor <span className="text-red-500">*</span>
              </label>
              <select
                value={objForm.quality_factor}
                onChange={(e) => setObjForm({ ...objForm, quality_factor: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="reliability">Reliability (Payment & Checkout)</option>
                <option value="security">Security (Customer Data & Auth)</option>
                <option value="correctness">Correctness (Pricing & Inventory)</option>
                <option value="maintainability">Maintainability (Code Review)</option>
                <option value="efficiency">Efficiency & Performance</option>
                <option value="testability">Testability & Test Suite</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={objForm.priority}
                onChange={(e) => setObjForm({ ...objForm, priority: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Target Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={objForm.target_value}
                onChange={(e) => setObjForm({ ...objForm, target_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Unit</label>
              <input
                type="text"
                value={objForm.unit}
                onChange={(e) => setObjForm({ ...objForm, unit: e.target.value })}
                placeholder="%, ms, defects, errors"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Measurable Target Statement <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={objForm.measurable_target}
              onChange={(e) => setObjForm({ ...objForm, measurable_target: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 0.00% double charges under 1,000 concurrent webhooks"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Responsible Owner <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={objForm.responsible_owner}
                onChange={(e) => setObjForm({ ...objForm, responsible_owner: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Liam Patel (Tech Lead)"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={objForm.due_date}
                onChange={(e) => setObjForm({ ...objForm, due_date: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Status</label>
              <select
                value={objForm.status}
                onChange={(e) => setObjForm({ ...objForm, status: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="in_progress">In Progress</option>
                <option value="achieved">Achieved</option>
                <option value="at_risk">At Risk</option>
                <option value="overdue">Overdue</option>
                <option value="not_started">Not Started</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Description & Quality Rationale</label>
            <textarea
              rows={3}
              value={objForm.description}
              onChange={(e) => setObjForm({ ...objForm, description: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Detailed justification and organizational risk scope..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowObjModal(false)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              {editingObjective ? 'Update Objective' : 'Save Objective'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Risk Modal */}
      <Modal isOpen={showRiskModal} onClose={() => setShowRiskModal(false)} title="Log Risk Assessment">
        <form onSubmit={handleCreateRisk} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Risk Scenario <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newRisk.risk_item}
              onChange={(e) => setNewRisk({ ...newRisk, risk_item: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Webhook concurrent arrival causes race condition"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Category</label>
              <select
                value={newRisk.category}
                onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="payment">Payment & Transactions</option>
                <option value="security">Security & Auth</option>
                <option value="data_integrity">Data Integrity</option>
                <option value="performance">Performance & Load</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Probability</label>
              <select
                value={newRisk.probability}
                onChange={(e) => setNewRisk({ ...newRisk, probability: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Impact</label>
              <select
                value={newRisk.impact}
                onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Mitigation Strategy <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={newRisk.mitigation_strategy}
              onChange={(e) => setNewRisk({ ...newRisk, mitigation_strategy: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Implement distributed Redis mutex locking on transaction idempotency key..."
            />
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowRiskModal(false)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              Save Risk Assessment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

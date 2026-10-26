import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DevTask, Project, Requirement, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  GitPullRequest,
  Plus,
  GitBranch,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertTriangle,
  Play,
  Send,
  CheckSquare,
  Search,
  Filter,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const DevelopmentTasksPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DevTask | null>(null);
  const [reviewerId, setReviewerId] = useState<number>(1);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // New Task Form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    requirement_id: undefined as number | undefined,
    developer_id: user?.id || 1,
    priority: 'high',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: '',
    pr_url: '',
  });

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [projs, tsks, reqs, usrs] = await Promise.all([
        api.getProjects(),
        api.getTasks({
          project_id: selectedProjectId,
          status_filter: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        api.getRequirements({ project_id: selectedProjectId }),
        api.getUsers(),
      ]);
      setProjects(projs);
      setTasks(tsks);
      setRequirements(reqs);
      setUsers(usrs);

      // Default reviewer to someone else with reviewer/manager role
      const reviewerCandidate = usrs.find(
        (u) => ['reviewer', 'quality_manager', 'admin'].includes(u.role) && u.id !== user?.id
      );
      if (reviewerCandidate) {
        setReviewerId(reviewerCandidate.id);
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId, statusFilter, priorityFilter, searchQuery]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTask({
        project_id: selectedProjectId,
        title: taskForm.title,
        description: taskForm.description,
        requirement_id: taskForm.requirement_id || undefined,
        developer_id: Number(taskForm.developer_id),
        priority: taskForm.priority,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : undefined,
        branch: taskForm.branch || undefined,
        pr_url: taskForm.pr_url || undefined,
      });
      setShowCreateModal(false);
      setTaskForm({
        title: '',
        description: '',
        requirement_id: undefined,
        developer_id: user?.id || 1,
        priority: 'high',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        branch: '',
        pr_url: '',
      });
      loadData();
    } catch (err: any) {
      alert(`Error creating task: ${err.message}`);
    }
  };

  const handleStartTask = async (taskId: number) => {
    setActionError(null);
    try {
      await api.updateTask(taskId, { status: 'in_progress' });
      loadData();
    } catch (err: any) {
      alert(`Error starting task: ${err.message}`);
    }
  };

  const handleOpenRequestReview = (task: DevTask) => {
    setSelectedTask(task);
    setReviewNotes(`Code review requested for ${task.task_code}. Branch: ${task.branch || 'main'}`);
    setActionError(null);
    setShowReviewModal(true);
  };

  const handleRequestReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setActionError(null);
    try {
      await api.requestTaskReview(selectedTask.id, reviewerId, reviewNotes);
      setShowReviewModal(false);
      loadData();
      alert(`Code review requested! 10-point peer code review checklist generated.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to request review.');
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    setActionError(null);
    try {
      await api.updateTask(taskId, { status: 'completed' });
      loadData();
      alert('Task successfully verified and completed!');
    } catch (err: any) {
      alert(`Task Completion Blocked: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <GitPullRequest className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Development Tasks & Code Review Workflow</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trace code implementation to approved requirements, track PR reviews, and enforce code review gating before completion.
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

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by code, title, or branch..."
            className="bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="code_review">In Code Review</option>
          <option value="completed">Completed</option>
        </select>

        {(searchQuery || statusFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline text-xs ml-auto cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Task ID</th>
                <th className="px-4 py-3">Task Title & Details</th>
                <th className="px-4 py-3">Linked Requirement</th>
                <th className="px-4 py-3">Assigned Developer</th>
                <th className="px-4 py-3">Branch / PR</th>
                <th className="px-4 py-3">Code Review Status</th>
                <th className="px-4 py-3">Task Status</th>
                <th className="px-4 py-3 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No development tasks match the criteria.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const assignedDev = users.find((u) => u.id === task.developer_id);
                  const linkedReq = requirements.find((r) => r.id === task.requirement_id);
                  const activeReview = task.reviews && task.reviews.length > 0 ? task.reviews[0] : null;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {task.task_code}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        {linkedReq ? (
                          <div className="flex items-center space-x-1.5" title={linkedReq.title}>
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="font-mono text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                              {linkedReq.req_code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unlinked</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{assignedDev ? assignedDev.full_name : `User #${task.developer_id}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {task.branch && (
                          <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                            <GitBranch className="w-3 h-3 text-slate-400" />
                            <span>{task.branch}</span>
                          </div>
                        )}
                        {task.pr_url && (
                          <a
                            href={task.pr_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 mt-0.5"
                          >
                            <span>Pull Request</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {activeReview ? (
                          <div className="space-y-1">
                            <Badge value={activeReview.status} />
                            {activeReview.outcome && (
                              <div className={`text-[10px] font-semibold uppercase ${
                                activeReview.outcome === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                              }`}>
                                {activeReview.outcome.replace('_', ' ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No Review</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge value={task.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {task.status === 'todo' && (
                            <button
                              onClick={() => handleStartTask(task.id)}
                              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center space-x-1 text-xs font-medium transition-colors cursor-pointer"
                              title="Start Work"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start</span>
                            </button>
                          )}

                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => handleOpenRequestReview(task)}
                              className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 text-xs font-medium transition-colors cursor-pointer"
                              title="Request Code Review"
                            >
                              <Send className="w-3 h-3" />
                              <span>Request Review</span>
                            </button>
                          )}

                          {task.status === 'code_review' && activeReview?.status === 'passed' && (
                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center space-x-1 text-xs font-medium transition-colors cursor-pointer"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </button>
                          )}

                          {task.status === 'code_review' && activeReview?.status !== 'passed' && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 font-medium">
                              Review Gated
                            </span>
                          )}

                          {task.status === 'completed' && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono flex items-center space-x-1 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Done</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Development Task">
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Implement payment idempotency Redis lock middleware"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Link to Approved Requirement <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={taskForm.requirement_id || ''}
              onChange={(e) =>
                setTaskForm({
                  ...taskForm,
                  requirement_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Requirement...</option>
              {requirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.req_code} - {req.title} ({req.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Assigned Developer</label>
              <select
                value={taskForm.developer_id}
                onChange={(e) => setTaskForm({ ...taskForm, developer_id: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Git Feature Branch</label>
              <input
                type="text"
                value={taskForm.branch}
                onChange={(e) => setTaskForm({ ...taskForm, branch: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                placeholder="feature/payment-mutex"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Pull Request / Repository Link</label>
            <input
              type="text"
              value={taskForm.pr_url}
              onChange={(e) => setTaskForm({ ...taskForm, pr_url: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              placeholder="https://github.com/org/ecomm/pull/42"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Task Technical Description</label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Implementation plan, error handling details, and regression risks..."
            />
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
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Code Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`Request Peer Code Review: ${selectedTask?.task_code}`}
      >
        <form onSubmit={handleRequestReview} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedTask?.title}</div>
            <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
              Select an authorized independent reviewer. Note: As per policy, developers cannot approve their own code.
            </div>
          </div>

          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error: </span>
                <span className="text-[11px]">{actionError}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Assigned Peer Reviewer <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={reviewerId}
              onChange={(e) => setReviewerId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {users
                .filter((u) => ['reviewer', 'quality_manager', 'admin'].includes(u.role))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role}) {u.id === user?.id ? '- (Self)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Review Notes & PR Context</label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Provide context, pull request link, or special test instructions for the reviewer..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            >
              Initiate Code Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

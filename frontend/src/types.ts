export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'quality_manager' | 'developer' | 'tester' | 'reviewer';
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: string;
  target_release_date?: string;
  created_at: string;
}

export interface QualityObjective {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  measurable_target: string;
  metric_key?: string;
  target_value?: number;
  unit?: string;
  quality_factor: string;
  responsible_owner: string;
  deadline?: string;
  due_date?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'achieved' | 'at_risk' | 'overdue';
  requirements?: Requirement[];
}

export interface RiskAssessment {
  id: number;
  project_id: number;
  risk_item: string;
  category: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  risk_score: number;
  mitigation_strategy: string;
  status: string;
}

export interface QAPlan {
  id: number;
  project_id: number;
  version: string;
  title: string;
  scope: string;
  quality_standards: string;
  review_cadence: string;
  release_criteria_summary: string;
  created_at: string;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  name: string;
  target_date?: string;
  status: string;
  criteria?: string;
}

export interface RequirementHistory {
  id: number;
  version: number;
  title: string;
  description: string;
  acceptance_criteria: string;
  changed_by: string;
  change_summary?: string;
  timestamp: string;
}

export interface Requirement {
  id: number;
  req_code: string;
  project_id: number;
  title: string;
  description: string;
  acceptance_criteria: string;
  category?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  risk_level: 'high' | 'medium' | 'low';
  quality_factor: string;
  quality_objective_id?: number;
  version: number;
  is_mandatory: boolean;
  author_id: number;
  reviewer_id?: number;
  assigned_owner?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  review_status?: string;
  review_comments?: string;
  created_at: string;
  updated_at: string;
  versions?: RequirementHistory[];
  quality_objective?: QualityObjective;
  reviews?: Review[];
  test_cases?: TestCase[];
  defects?: Defect[];
}

export interface ReviewChecklistItem {
  id: number;
  review_id: number;
  category: string;
  item_name: string;
  description?: string;
  is_mandatory: boolean;
  result: 'pass' | 'fail' | 'not_applicable' | 'pending';
  comments?: string;
}

export interface Review {
  id: number;
  review_code: string;
  project_id: number;
  review_type: 'requirement' | 'design' | 'code';
  title: string;
  target_ref: string;
  requirement_id?: number;
  task_id?: number;
  reviewer_id?: number;
  review_date?: string;
  status: 'draft' | 'in_progress' | 'passed' | 'failed' | 'rework_required';
  outcome?: 'approved' | 'rejected' | 'rework_required';
  outcome_notes?: string;
  comments?: string;
  is_baselined: boolean;
  created_at: string;
  checklist_items: ReviewChecklistItem[];
  requirement?: Requirement;
  task?: DevTask;
}

export interface DevTask {
  id: number;
  task_code: string;
  project_id: number;
  requirement_id?: number;
  title: string;
  description?: string;
  developer_id?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  due_date?: string;
  pr_url?: string;
  branch?: string;
  status: 'todo' | 'in_progress' | 'code_review' | 'completed';
  rework_status: 'none' | 'needed' | 'in_rework';
  review_id?: number;
  created_at: string;
  reviews?: Review[];
  requirement?: Requirement;
}

export interface TraceabilityItem {
  requirement_id: number;
  req_code: string;
  title: string;
  status: string;
  quality_objective?: { id: number; title: string; quality_factor: string } | null;
  design_reviews: Array<{ id: number; review_code: string; status: string; is_baselined: boolean }>;
  dev_tasks: Array<{ id: number; task_code: string; title: string; status: string }>;
  code_reviews: Array<{ id: number; review_code: string; status: string; outcome?: string }>;
  test_cases: Array<{ id: number; tc_code: string; scenario_title: string; status: string }>;
  defects: Array<{ id: number; defect_code: string; title: string; severity: string; status: string }>;
  coverage_gaps: string[];
}

export interface TraceabilityMatrixResponse {
  project_id: number;
  total_requirements: number;
  matrix: TraceabilityItem[];
  summary: {
    fully_traceable_count: number;
    gap_count: number;
    coverage_percentage: number;
  };
}

export interface TestCase {
  id: number;
  tc_code: string;
  project_id: number;
  requirement_id?: number;
  scenario_title: string;
  scenario_category: string;
  preconditions?: string;
  test_steps: string;
  expected_result: string;
  actual_result?: string;
  status: 'pass' | 'fail' | 'blocked' | 'not_run';
  is_mandatory: boolean;
  tester_id?: number;
  execution_date?: string;
  evidence_notes?: string;
  evidence_url?: string;
  created_at: string;
}

export interface DefectHistory {
  id: number;
  defect_id: number;
  changed_by: string;
  old_status: string;
  new_status: string;
  comments?: string;
  timestamp: string;
}

export interface Defect {
  id: number;
  defect_code: string;
  project_id: number;
  requirement_id?: number;
  test_case_id?: number;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  affected_module: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  assigned_to_id?: number;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  resolution_notes?: string;
  retest_result: 'passed' | 'failed' | 'pending';
  status: 'open' | 'assigned' | 'in_progress' | 'fixed' | 'retest' | 'closed';
  is_production_leakage: number;
  created_at: string;
  closed_at?: string;
  history?: DefectHistory[];
}

export interface ReleaseGateResult {
  id: number;
  check_code: string;
  check_name: string;
  is_mandatory: boolean;
  status: 'PASS' | 'FAIL';
  explanation: string;
  related_record?: string;
  required_corrective_action?: string;
}

export interface Release {
  id: number;
  release_code: string;
  project_id: number;
  version_name: string;
  target_environment: string;
  release_decision: 'BLOCKED' | 'READY_FOR_APPROVAL' | 'APPROVED';
  evaluator_id?: number;
  evaluated_at?: string;
  approved_by_id?: number;
  approved_at?: string;
  approval_notes?: string;
  approval_history?: string;
  created_at: string;
  gate_results: ReleaseGateResult[];
}

export interface CAPA {
  id: number;
  capa_code: string;
  project_id: number;
  defect_id?: number;
  title: string;
  root_cause_analysis: string;
  immediate_correction: string;
  corrective_action: string;
  preventive_action: string;
  owner_id: number;
  due_date: string;
  status: 'open' | 'in_progress' | 'pending_verification' | 'closed';
  verification_evidence?: string;
  effectiveness_review?: string;
  is_effective?: boolean;
  created_at: string;
  closed_at?: string;
  is_overdue: boolean;
}

export interface DashboardSummary {
  total_projects: number;
  total_requirements: number;
  requirements_awaiting_approval: number;
  code_review_completion_percentage: number;
  test_pass_percentage: number;
  open_defects_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  failed_quality_gates: number;
  release_readiness_status: string;
  corrective_actions_awaiting_closure: number;
}

export interface QualityMetricsDetails {
  project_id?: number;
  requirements_approval_rate: number;
  code_review_completion_rate: number;
  test_pass_rate: number;
  defect_density: number;
  defect_leakage: number;
  mean_time_to_resolve_hours: number;
  capa_closure_rate: number;
  open_critical_high_defects: number;
  release_gate_pass_rate: number;
  severity_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  test_status_breakdown: Record<string, number>;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string;
  change_details?: string;
  timestamp: string;
}

function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    const stripped = envUrl.replace(/\/+$/, '');
    return stripped.endsWith('/api') ? stripped : `${stripped}/api`;
  }
  return 'http://127.0.0.1:8000/api';
}

const API_BASE = resolveApiBase();

export function getAuthToken(): string | null {
  return localStorage.getItem('smartqms_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('smartqms_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('smartqms_token');
  localStorage.removeItem('smartqms_user');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { email?: string; username?: string; password: string }) =>
    request<{ access_token: string; token_type: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignored if offline or expired
    } finally {
      removeAuthToken();
    }
  },
  getMe: () => request<any>('/auth/me'),
  getUsers: () => request<any[]>('/users'),
  changePassword: (data: { old_password: string; new_password: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),


  // Projects
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: number) => request<any>(`/projects/${id}`),
  createProject: (data: any) =>
    request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Quality Planning
  getObjectives: (params?: { project_id?: number; quality_factor?: string; status?: string; priority?: string; search?: string } | number) => {
    if (typeof params === 'number') {
      return request<any[]>(`/quality-plans/objectives?project_id=${params}`);
    }
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.quality_factor) q.set('quality_factor', params.quality_factor);
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.search) q.set('search', params.search);
    const queryStr = q.toString();
    return request<any[]>(`/quality-plans/objectives${queryStr ? `?${queryStr}` : ''}`);
  },
  createObjective: (data: any) =>
    request<any>('/quality-plans/objectives', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateObjective: (id: number, data: any) =>
    request<any>(`/quality-plans/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteObjective: (id: number) =>
    request<any>(`/quality-plans/objectives/${id}`, {
      method: 'DELETE',
    }),
  getRisks: (projectId?: number) =>
    request<any[]>(`/quality-plans/risks${projectId ? `?project_id=${projectId}` : ''}`),
  createRisk: (data: any) =>
    request<any>('/quality-plans/risks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getQAPlans: (projectId?: number) =>
    request<any[]>(`/quality-plans/qa-plans${projectId ? `?project_id=${projectId}` : ''}`),
  getMilestones: (projectId?: number) =>
    request<any[]>(`/quality-plans/milestones${projectId ? `?project_id=${projectId}` : ''}`),

  // Requirements
  getRequirements: (params?: { project_id?: number; status_filter?: string; priority_filter?: string; risk_level?: string; owner_id?: number; category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    if (params?.priority_filter) q.set('priority_filter', params.priority_filter);
    if (params?.risk_level) q.set('risk_level', params.risk_level);
    if (params?.owner_id) q.set('owner_id', String(params.owner_id));
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    return request<any[]>(`/requirements?${q.toString()}`);
  },
  getRequirement: (id: number) => request<any>(`/requirements/${id}`),
  getRequirementVersions: (id: number) => request<any[]>(`/requirements/${id}/versions`),
  createRequirement: (data: any) =>
    request<any>('/requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRequirement: (id: number, data: any) =>
    request<any>(`/requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  submitRequirement: (id: number) =>
    request<any>(`/requirements/${id}/submit`, {
      method: 'POST',
    }),
  approveRequirement: (id: number, data: { decision: string; comments?: string }) =>
    request<any>(`/requirements/${id}/approval`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reviews
  getReviews: (params?: { project_id?: number; review_type?: string; status?: string; requirement_id?: number; task_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.review_type) q.set('review_type', params.review_type);
    if (params?.status) q.set('status', params.status);
    if (params?.requirement_id) q.set('requirement_id', String(params.requirement_id));
    if (params?.task_id) q.set('task_id', String(params.task_id));
    return request<any[]>(`/reviews?${q.toString()}`);
  },
  getReview: (id: number) => request<any>(`/reviews/${id}`),
  createReview: (data: any) =>
    request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateChecklistItem: (itemId: number, data: { result: string; comments?: string }) =>
    request<any>(`/reviews/checklist-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateReview: (id: number, data: any) =>
    request<any>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Development Tasks
  getTasks: (params?: { project_id?: number; status_filter?: string; requirement_id?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    if (params?.requirement_id) q.set('requirement_id', String(params.requirement_id));
    if (params?.search) q.set('search', params.search);
    return request<any[]>(`/tasks?${q.toString()}`);
  },
  getTask: (id: number) => request<any>(`/tasks/${id}`),
  createTask: (data: any) =>
    request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTask: (id: number, data: any) =>
    request<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  requestTaskReview: (id: number, reviewerId: number, notes?: string) =>
    request<any>(`/tasks/${id}/request-review?reviewer_id=${reviewerId}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`, {
      method: 'POST',
    }),

  // Traceability
  getTraceabilityMatrix: (projectId?: number, status?: string) => {
    const q = new URLSearchParams();
    if (projectId) q.set('project_id', String(projectId));
    if (status) q.set('status', status);
    return request<any>(`/traceability/matrix?${q.toString()}`);
  },

  // Tests
  getTestCases: (params?: { project_id?: number; status_filter?: string; scenario_category?: string }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    if (params?.scenario_category) q.set('scenario_category', params.scenario_category);
    return request<any[]>(`/tests?${q.toString()}`);
  },
  executeTest: (id: number, data: { actual_result: string; status: string; evidence_notes?: string; evidence_url?: string }) =>
    request<any>(`/tests/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  simulatePaymentGateway: (data: { order_id: string; amount: number; currency?: string; idempotency_key: string }) =>
    request<any>('/tests/simulate-payment-gateway', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Defects
  getDefects: (params?: { project_id?: number; severity?: string; status_filter?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.severity) q.set('severity', params.severity);
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    if (params?.category) q.set('category', params.category);
    return request<any[]>(`/defects?${q.toString()}`);
  },
  getDefect: (id: number) => request<any>(`/defects/${id}`),
  createDefect: (data: any) =>
    request<any>('/defects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDefectStatus: (id: number, data: any) =>
    request<any>(`/defects/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateDefect: (id: number, data: any) =>
    request<any>(`/defects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Smart Release Gate
  getReleases: (projectId?: number) =>
    request<any[]>(`/releases${projectId ? `?project_id=${projectId}` : ''}`),
  getRelease: (id: number) => request<any>(`/releases/${id}`),
  createRelease: (data: { project_id: number; version_name: string; target_environment: string }) =>
    request<any>('/releases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  evaluateReleaseGate: (id: number) =>
    request<any>(`/releases/${id}/evaluate`, {
      method: 'POST',
    }),
  approveRelease: (id: number, data: { notes?: string }) =>
    request<any>(`/releases/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // CAPA
  getCapas: (params?: { project_id?: number; status_filter?: string }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', String(params.project_id));
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    return request<any[]>(`/capas?${q.toString()}`);
  },
  createCapa: (data: any) =>
    request<any>('/capas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCapa: (id: number, data: any) =>
    request<any>(`/capas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Metrics
  getDashboardMetrics: (projectId?: number) =>
    request<any>(`/metrics/dashboard${projectId ? `?project_id=${projectId}` : ''}`),
  getQualityMetrics: (projectId?: number) =>
    request<any>(`/metrics/quality${projectId ? `?project_id=${projectId}` : ''}`),
  getSoftwareDevelopmentMetrics: (projectId?: number) =>
    request<any[]>(`/metrics/software-development${projectId ? `?project_id=${projectId}` : ''}`),
  calculateDevP: (data: { project_id: number; development_hours: number; software_size_kloc: number }) =>
    request<any>('/metrics/calculate/devp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  calculateCRe: (data: { project_id: number; reused_kloc: number; total_kloc: number }) =>
    request<any>('/metrics/calculate/cre', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  calculateDocRe: (data: { project_id: number; reused_documents: number; total_documents: number }) =>
    request<any>('/metrics/calculate/docre', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users Management
  createUser: (data: any) =>
    request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: number, data: any) =>
    request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Projects CRUD
  updateProject: (id: number, data: any) =>
    request<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: number) =>
    request<any>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Audit Logs
  getAuditLogs: (params?: { entity_type?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.entity_type) q.set('entity_type', params.entity_type);
    if (params?.limit) q.set('limit', String(params.limit));
    return request<any[]>(`/audit/logs?${q.toString()}`);
  },

  // Reseed System
  reseedSystem: () =>
    request<{ message: string }>('/system/reseed', {
      method: 'POST',
    }),

  // Reports download URL generators
  getReportDownloadUrl: (format: 'pdf' | 'csv', type: string, projectId?: number) => {
    const token = getAuthToken();
    return `${API_BASE}/reports/export/${format}/${type}?project_id=${projectId || 1}&token=${token || ''}`;
  },
};

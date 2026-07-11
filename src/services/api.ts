const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'farm_token';

export const authStore = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = authStore.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
  // 401：清掉 token，抛错让上层处理（跳转登录页）
  if (res.status === 401) {
    authStore.clear();
    window.dispatchEvent(new CustomEvent('farm:unauthorized'));
    const json = await res.json().catch(() => ({}));
    throw new ApiError(json.error || 'Unauthorized', 401);
  }
  const json = await res.json();
  if (!json.success) throw new ApiError(json.error || 'API Error', res.status);
  return json.data as T;
}

// 鉴权
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { username: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ username: string; role: string }>('/auth/me'),
};

// 传感器
export const sensorApi = {
  getLatest: () => request<Record<string, number>>('/sensors/latest'),
  getHistory: (parameter: string, hours = 24) =>
    request<{ timestamp: number; value: number }[]>(`/sensors/history/${parameter}?hours=${hours}`),
};

// 设备
export const deviceApi = {
  getLatest: () => request<Record<string, unknown>>('/device/latest'),
};

// 报警
export const alarmApi = {
  list: (status?: string) =>
    request<unknown[]>(`/alarms${status ? `?status=${status}` : ''}`),
  getActiveCount: () => request<{ count: number }>('/alarms/active-count'),
  updateStatus: (id: number, status: string) =>
    request<unknown>(`/alarms/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  markAllRead: () =>
    request<{ count: number }>('/alarms/mark-all-read', { method: 'POST' }),
};

// 农事日志
export const farmLogApi = {
  list: (limit = 50) => request<unknown[]>(`/farm-logs?limit=${limit}`),
};

// 阈值
export const thresholdApi = {
  get: () => request<Record<string, { min: number; max: number }>>('/thresholds'),
  update: (parameter: string, min: number, max: number) =>
    request<unknown>(`/thresholds/${parameter}`, {
      method: 'PUT',
      body: JSON.stringify({ min, max }),
    }),
};

// 系统配置
export const configApi = {
  getAll: () => request<Record<string, string>>('/config'),
  get: (key: string) => request<{ key: string; value: string }>(`/config/${key}`),
  set: (key: string, value: string) =>
    request<unknown>(`/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
};

// 控制
export const controlApi = {
  sendCommand: (command: Record<string, unknown>) =>
    request<{ sent: boolean }>('/control/command', {
      method: 'POST',
      body: JSON.stringify(command),
    }),
  getStatus: () =>
    request<{
      online: boolean;
      lastSeen: string | null;
      sensor: Record<string, number> | null;
      device: Record<string, unknown> | null;
    }>('/control/status'),
};

export { ApiError };

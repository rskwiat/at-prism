const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  getUploads: (params?: { sort?: string; cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<{ items: any[]; cursor: string | null }>(`/uploads${qs ? `?${qs}` : ''}`);
  },
  getUpload: (id: string) => request<any>(`/uploads/${id}`),
  upload: (form: FormData) => request<any>('/uploads', { method: 'POST', body: form }),
  deleteUpload: (id: string) => request<any>(`/uploads/${id}`, { method: 'DELETE' }),
  like: (id: string) => request<{ liked: boolean }>(`/uploads/${id}/like`, { method: 'POST' }),
  unlike: (id: string) => request<{ liked: boolean }>(`/uploads/${id}/like`, { method: 'DELETE' }),
  login: (handle: string, password: string) =>
    request<{ user: any }>('/auth/bluesky', { method: 'POST', body: new URLSearchParams({ handle, password }) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: any }>('/auth/me'),
  getUser: (did: string) => request<{ user: any }>(`/users/${did}`),
  getUserUploads: (did: string) => request<{ items: any[] }>(`/users/${did}/uploads`),
};
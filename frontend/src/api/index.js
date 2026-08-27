import api from './client';

export const projectApi = {
  /** GET /api/projects — fetch all with nested data */
  getAll: () => api.get('/projects').then(r => r.data),

  /** GET /api/projects/:id */
  getById: (id) => api.get(`/projects/${id}`).then(r => r.data),

  /** POST /api/projects  { name, folder } */
  create: (data) => api.post('/projects', data).then(r => r.data),

  /** PUT /api/projects/:id  { name?, folder?, collapsed? } */
  update: (id, data) => api.put(`/projects/${id}`, data).then(r => r.data),

  /** DELETE /api/projects/:id */
  remove: (id) => api.delete(`/projects/${id}`).then(r => r.data),
};

export const linkApi = {
  /** POST /api/projects/:projectId/links  { name, url } */
  create: (projectId, data) =>
    api.post(`/projects/${projectId}/links`, data).then(r => r.data),

  /** DELETE /api/projects/:projectId/links/:linkId */
  remove: (projectId, linkId) =>
    api.delete(`/projects/${projectId}/links/${linkId}`).then(r => r.data),
};

export const noteApi = {
  /** POST /api/projects/:projectId/notes  { title, content, color } */
  create: (projectId, data) =>
    api.post(`/projects/${projectId}/notes`, data).then(r => r.data),

  /** PUT /api/projects/:projectId/notes/:noteId */
  update: (projectId, noteId, data) =>
    api.put(`/projects/${projectId}/notes/${noteId}`, data).then(r => r.data),

  /** DELETE /api/projects/:projectId/notes/:noteId */
  remove: (projectId, noteId) =>
    api.delete(`/projects/${projectId}/notes/${noteId}`).then(r => r.data),
};

export const graphApi = {
  /** POST /api/projects/:projectId/graphs */
  create: (projectId, data) =>
    api.post(`/projects/${projectId}/graphs`, data).then(r => r.data),

  /** PUT /api/projects/:projectId/graphs/:graphId */
  update: (projectId, graphId, data) =>
    api.put(`/projects/${projectId}/graphs/${graphId}`, data).then(r => r.data),

  /** DELETE /api/projects/:projectId/graphs/:graphId */
  remove: (projectId, graphId) =>
    api.delete(`/projects/${projectId}/graphs/${graphId}`).then(r => r.data),
};

export const apiDefApi = {
  /** POST /api/projects/:projectId/apis */
  create: (projectId, data) =>
    api.post(`/projects/${projectId}/apis`, data).then(r => r.data),

  /** PUT /api/projects/:projectId/apis/:apiId */
  update: (projectId, apiId, data) =>
    api.put(`/projects/${projectId}/apis/${apiId}`, data).then(r => r.data),

  /** DELETE /api/projects/:projectId/apis/:apiId */
  remove: (projectId, apiId) =>
    api.delete(`/projects/${projectId}/apis/${apiId}`).then(r => r.data),
};

export const settingApi = {
  /** GET /api/settings */
  getAll: () => api.get('/settings').then(r => r.data),

  /** PUT /api/settings  { graphNodeImages?, graphEdgeNames?, ... } */
  update: (data) => api.put('/settings', data).then(r => r.data),
};

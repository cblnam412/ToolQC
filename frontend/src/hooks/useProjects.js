import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '../api';

/**
 * Central state management hook for projects data.
 * All CRUD mutations go through this hook to keep state in sync.
 */
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectApi.getAll();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const addProject = useCallback(async (name, folder) => {
    const created = await projectApi.create({ name, folder });
    setProjects(prev => [...prev, created]);
    return created;
  }, []);

  const updateProject = useCallback(async (id, data) => {
    const updated = await projectApi.update(id, data);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  }, []);

  const removeProject = useCallback(async (id) => {
    await projectApi.remove(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  /** Optimistically update a project's nested array (links/notes/graphs/apis) */
  const updateProjectNested = useCallback((projectId, key, updater) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, [key]: updater(p[key] || []) } : p
    ));
  }, []);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    addProject,
    updateProject,
    removeProject,
    updateProjectNested,
  };
}

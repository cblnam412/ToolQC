import { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import ProjectCard from './ProjectCard';
import ProjectModal from './modals/ProjectModal';

/**
 * Project tab — search bar + tree + add project button.
 */
export default function ProjectView({ toast }) {
  const { projects, loading, error, addProject, updateProject, removeProject, updateProjectNested, refetch } = useProjects();
  const [search, setSearch]           = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleProjectAdded(project) {
    // useProjects.addProject already updated the state
    toast('Đã thêm dự án mới');
  }

  async function handleAdd(name, folder) {
    await addProject(name, folder);
  }

  function handleProjectUpdated(projectId, key, updater) {
    updateProjectNested(projectId, key, updater);
  }

  function handleProjectRemoved(id) {
    return removeProject(id);
  }

  if (loading) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }} />
        <p>Đang kết nối server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state error">
        <i className="fa-solid fa-server" style={{ fontSize: '2rem' }} />
        <h2>Không thể kết nối Backend</h2>
        <p>{error}</p>
        <p style={{ opacity: 0.6 }}>Hãy đảm bảo <code>node server.js</code> đang chạy trên port 3001</p>
      </div>
    );
  }

  return (
    <div id="project-view">
      {/* Search Bar */}
      <div className="search-container">
        <i className="fa-solid fa-search" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm dự án..."
          autoComplete="off"
        />
        <div style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => setShowProjectModal(true)}>
          <i className="fa-solid fa-plus" /> Thêm Dự Án Mới
        </button>
      </div>

      {/* Tree */}
      <main className="tree-container">
        {projects.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-folder-open" />
            <h2>Chưa có dự án nào</h2>
            <p>Bấm "Thêm Dự Án Mới" để bắt đầu</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-search" />
            <h2>Không tìm thấy dự án nào</h2>
            <p>Thử từ khóa khác</p>
          </div>
        ) : (
          <ul className="tree">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onProjectUpdated={handleProjectUpdated}
                onProjectRemoved={handleProjectRemoved}
                toast={toast}
              />
            ))}
          </ul>
        )}
      </main>

      {/* Add Project Modal */}
      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onAdded={() => {
            refetch(); // Refetch from backend after creation
            toast('Đã thêm dự án mới');
          }}
        />
      )}
    </div>
  );
}

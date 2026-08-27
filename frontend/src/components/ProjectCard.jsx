import { useState } from 'react';
import { projectApi, linkApi, noteApi } from '../api';

import NoteModal from './modals/NoteModal';
import LinkModal from './modals/LinkModal';

const COLOR_MAP = {
  yellow: '#fef08a',
  blue:   '#bfdbfe',
  green:  '#bbf7d0',
  pink:   '#fbcfe8',
  purple: '#e9d5ff',
};

/**
 * Single project card in the tree view.
 */
export default function ProjectCard({ project, onProjectUpdated, onProjectRemoved, toast }) {
  const [showLinkModal, setShowLinkModal]   = useState(false);
  const [showNotesList, setShowNotesList]   = useState(false);
  const [noteToEdit, setNoteToEdit]         = useState(null);  // null=closed, undefined=new, note=edit
  const [collapsed, setCollapsed]           = useState(project.collapsed);

  /* ── Collapse ── */
  async function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      await projectApi.update(project.id, { collapsed: next });
    } catch {/* silent — UI still updates optimistically */}
  }

  /* ── Delete project ── */
  async function handleDeleteProject() {
    if (!confirm(`Xóa dự án "${project.name}" và toàn bộ dữ liệu bên trong?`)) return;
    try {
      await onProjectRemoved(project.id);
      toast('Đã xóa dự án');
    } catch (err) {
      toast('Lỗi khi xóa dự án', 'error');
    }
  }

  /* ── Links ── */
  function handleLinkAdded(link) {
    onProjectUpdated(project.id, 'links', prev => [...prev, link]);
    toast('Đã thêm link mới');
  }

  async function handleDeleteLink(linkId) {
    if (!confirm('Xóa link này?')) return;
    try {
      await linkApi.remove(project.id, linkId);
      onProjectUpdated(project.id, 'links', prev => prev.filter(l => l.id !== linkId));
      toast('Đã xóa link');
    } catch {
      toast('Lỗi khi xóa link', 'error');
    }
  }

  /* ── Notes ── */
  function handleNoteSaved(savedNote) {
    const isNew = !project.notes?.find(n => n.id === savedNote.id);
    onProjectUpdated(project.id, 'notes', prev =>
      isNew ? [...prev, savedNote] : prev.map(n => n.id === savedNote.id ? savedNote : n)
    );
    toast(isNew ? 'Đã thêm ghi chú' : 'Đã cập nhật ghi chú');
  }

  async function handleDeleteNote(e, noteId) {
    e.stopPropagation();
    if (!confirm('Xóa ghi chú này?')) return;
    try {
      await noteApi.remove(project.id, noteId);
      onProjectUpdated(project.id, 'notes', prev => prev.filter(n => n.id !== noteId));
      toast('Đã xóa ghi chú');
    } catch {
      toast('Lỗi khi xóa ghi chú', 'error');
    }
  }

  const hasChildren = (project.links?.length > 0) || (project.notes?.length > 0) || (project.graphs?.length > 0);

  return (
    <li className="tree-item">
      {/* ── Project Node ── */}
      <div className={`node project-node ${collapsed ? 'collapsed' : ''}`}>
        <div className="node-header">
          <div className="node-title">
            {hasChildren && (
              <button className="collapse-btn" onClick={toggleCollapse} title="Thu gọn/Mở rộng">
                <i className={`fa-solid fa-chevron-${collapsed ? 'right' : 'down'}`} />
              </button>
            )}
            <i className="fa-solid fa-diagram-project" />
            &nbsp;{project.name}
          </div>
          <div className="node-actions">
            <button className="icon-btn" onClick={() => setShowNotesList(true)} title="Ghi chú">
              <i className="fa-solid fa-note-sticky" />
              {project.notes?.length > 0 && (
                <span className="badge">{project.notes.length}</span>
              )}
            </button>
            <button className="icon-btn" onClick={() => setShowLinkModal(true)} title="Thêm Link">
              <i className="fa-solid fa-plus" />
            </button>
            <button className="icon-btn delete" onClick={handleDeleteProject} title="Xóa Dự Án">
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        </div>
        {project.folder && (
          <div className="node-subtitle">
            <i className="fa-solid fa-folder" />
            <span
              className="copy-folder"
              onClick={() => navigator.clipboard.writeText(project.folder)}
              title="Nhấn để copy"
            >
              {project.folder}
            </span>
          </div>
        )}
      </div>

      {/* ── Children ── */}
      {!collapsed && (
        <ul className="tree-children">
          {/* Links */}
          {project.links?.map(link => (
            <li key={link.id} className="tree-item">
              <div
                className="node link-node"
                onClick={() => window.open(link.url, '_blank')}
              >
                <div className="node-header">
                  <div className="node-title">
                    <i className="fa-solid fa-link" /> {link.name}
                  </div>
                  <div className="node-actions">
                    <button
                      className="icon-btn delete"
                      onClick={e => { e.stopPropagation(); handleDeleteLink(link.id); }}
                      title="Xóa Link"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                </div>
                <div className="node-subtitle link-url">{link.url}</div>
              </div>
            </li>
          ))}

          {/* Graphs folder */}
          {project.graphs?.length > 0 && (
            <li className="tree-item">
              <div className="node project-node">
                <div className="node-header">
                  <div className="node-title" style={{ color: 'var(--text-secondary)' }}>
                    <i className="fa-solid fa-sitemap" /> Sơ đồ ({project.graphs.length})
                  </div>
                </div>
              </div>
            </li>
          )}
        </ul>
      )}

      {/* ── Notes List Overlay ── */}
      {showNotesList && (
        <div className="modal-overlay" onClick={() => setShowNotesList(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-note-sticky" /> Ghi chú: {project.name}</h3>
              <button className="close-btn" onClick={() => setShowNotesList(false)}>×</button>
            </div>
            <div className="modal-body">
              {(!project.notes || project.notes.length === 0) ? (
                <p style={{ textAlign: 'center', opacity: 0.5 }}>Chưa có ghi chú nào.</p>
              ) : (
                <div className="notes-list">
                  {project.notes.map(note => (
                    <div
                      key={note.id}
                      className="note-list-item"
                      style={{ borderLeftColor: COLOR_MAP[note.color] || COLOR_MAP.yellow }}
                      onClick={() => { setNoteToEdit(note); setShowNotesList(false); }}
                    >
                      <span>
                        <i className="fa-solid fa-note-sticky" style={{ color: COLOR_MAP[note.color], marginRight: 8 }} />
                        {note.title}
                      </span>
                      <button
                        className="icon-btn delete"
                        onClick={e => handleDeleteNote(e, note.id)}
                        title="Xóa"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-footer">
                <button
                  className="btn-primary"
                  onClick={() => { setNoteToEdit(undefined); setShowNotesList(false); }}
                >
                  <i className="fa-solid fa-plus" /> Thêm ghi chú
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Note Modal (add/edit) ── */}
      {noteToEdit !== null && (
        <NoteModal
          projectId={project.id}
          note={noteToEdit}  // undefined = new, note object = edit
          onClose={() => setNoteToEdit(null)}
          onSaved={handleNoteSaved}
        />
      )}

      {/* ── Link Modal ── */}
      {showLinkModal && (
        <LinkModal
          projectId={project.id}
          onClose={() => setShowLinkModal(false)}
          onAdded={handleLinkAdded}
        />
      )}
    </li>
  );
}

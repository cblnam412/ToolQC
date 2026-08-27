import { useState } from 'react';
import { projectApi } from '../../api';

/**
 * Modal to add a new project.
 */
export default function ProjectModal({ onClose, onAdded }) {
  const [name, setName]     = useState('');
  const [folder, setFolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const project = await projectApi.create({ name: name.trim(), folder: folder.trim() });
      onAdded(project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi thêm dự án');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fa-solid fa-diagram-project" /> Thêm Dự Án Mới</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Tên dự án <span className="required">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: NUH Project"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Thư mục (tuỳ chọn)</label>
            <input
              type="text"
              value={folder}
              onChange={e => setFolder(e.target.value)}
              placeholder="VD: C:\Projects\NUH"
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo Dự Án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

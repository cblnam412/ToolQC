import { useState } from 'react';
import { linkApi } from '../../api';

/**
 * Modal to add a new link to a project.
 */
export default function LinkModal({ projectId, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const link = await linkApi.create(projectId, { name: name.trim(), url: url.trim() });
      onAdded(link);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi thêm link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fa-solid fa-link" /> Thêm Link Mới</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Tên hiển thị</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Figma Design"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang thêm...' : 'Thêm Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

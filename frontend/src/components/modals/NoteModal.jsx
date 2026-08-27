import { useState } from 'react';
import { noteApi } from '../../api';

const COLOR_OPTIONS = [
  { value: 'yellow', label: 'Vàng', bg: '#fef08a', text: '#854d0e' },
  { value: 'blue',   label: 'Xanh dương', bg: '#bfdbfe', text: '#1e3a8a' },
  { value: 'green',  label: 'Xanh lá', bg: '#bbf7d0', text: '#166534' },
  { value: 'pink',   label: 'Hồng', bg: '#fbcfe8', text: '#831843' },
  { value: 'purple', label: 'Tím', bg: '#e9d5ff', text: '#581c87' },
];

/**
 * Modal to create or edit a note.
 * When `note` is null → create mode; otherwise → edit mode.
 */
export default function NoteModal({ projectId, note, onClose, onSaved }) {
  const [title, setTitle]     = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor]     = useState(note?.color || 'yellow');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [viewMode, setViewMode] = useState(!!note); // start in view mode if editing

  const selectedColor = COLOR_OPTIONS.find(c => c.value === color) || COLOR_OPTIONS[0];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      let saved;
      if (note) {
        saved = await noteApi.update(projectId, note.id, { title: title.trim(), content, color });
      } else {
        saved = await noteApi.create(projectId, { title: title.trim(), content, color });
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi lưu ghi chú');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box note-modal-box" onClick={e => e.stopPropagation()}>
        {/* Sticky note preview header */}
        <div className="sticky-note-preview" style={{ background: selectedColor.bg, color: selectedColor.text }}>
          <span className="sticky-title">{title || (note ? note.title : 'Ghi chú mới')}</span>
          {viewMode && (
            <button className="btn-edit-note" onClick={() => setViewMode(false)}>
              <i className="fa-solid fa-pen" />
            </button>
          )}
        </div>

        {viewMode ? (
          /* ── VIEW MODE ── */
          <div className="modal-body">
            <div
              className="note-content-view"
              dangerouslySetInnerHTML={{ __html: content || '<em style="opacity:0.5">Chưa có nội dung</em>' }}
            />
            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Đóng</button>
            </div>
          </div>
        ) : (
          /* ── EDIT MODE ── */
          <form onSubmit={handleSubmit} className="modal-body">
            <div className="form-group">
              <label>Tiêu đề</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Tiêu đề ghi chú..."
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label>Nội dung</label>
              <div
                className="rich-editor"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: content }}
                onInput={e => setContent(e.currentTarget.innerHTML)}
              />
            </div>
            <div className="form-group">
              <label>Màu sắc</label>
              <div className="color-picker">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`color-swatch ${color === c.value ? 'selected' : ''}`}
                    style={{ background: c.bg }}
                    title={c.label}
                    onClick={() => setColor(c.value)}
                  />
                ))}
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => note ? setViewMode(true) : onClose()}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : (note ? 'Cập nhật' : 'Thêm Ghi Chú')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

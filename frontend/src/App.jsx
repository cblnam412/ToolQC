import { useState } from 'react';
import ProjectView from './components/ProjectView';
import CsvTool     from './components/CsvTool';
import GraphView   from './components/GraphView';
import LogTool     from './components/LogTool';
import ToastContainer, { toast } from './components/ToastContainer';

const TABS = [
  { id: 'project', label: 'Sơ Đồ Dự Án',    icon: 'fa-folder-tree' },
  { id: 'csv',     label: 'Công Cụ CSV',      icon: 'fa-file-csv' },
  { id: 'log',     label: 'Debug Log',         icon: 'fa-bug' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('project');

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="glass-panel">
        <div className="header-content">
          <h1>
            <i className="fa-solid fa-diagram-project" /> Sơ Đồ Quản Lý Dự Án
          </h1>

          {/* Sync status badge */}
          <div className="sync-badge">
            <i className="fa-solid fa-cloud-check" style={{ color: '#10b981' }} />
            <span>Đồng bộ Backend</span>
          </div>

          {/* Nav */}
          <nav className="header-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`fa-solid ${tab.icon}`} /> {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Views ── */}
      <div className="view-container">
        <div style={{ display: activeTab === 'project' ? 'block' : 'none', height: '100%' }}>
          <ProjectView toast={toast} />
        </div>
        <div style={{ display: activeTab === 'csv' ? 'block' : 'none', height: '100%' }}>
          <CsvTool toast={toast} />
        </div>
        <div style={{ display: activeTab === 'log' ? 'block' : 'none', height: '100%' }}>
          <LogTool toast={toast} />
        </div>
      </div>

      {/* ── Toast notifications ── */}
      <ToastContainer />
    </div>
  );
}

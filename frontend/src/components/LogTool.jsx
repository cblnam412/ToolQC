import React, { useState, useRef, useEffect } from 'react';

/**
 * Debug Log explorer tab.
 * Parses custom log format: TIMESTAMP [METHOD] [CLIENT] ENDPOINT [BODY]...  [Result]...
 * Entirely client-side, no backend needed.
 */
export default function LogTool({ toast }) {
  const [logs, setLogs]           = useState([]);
  const [filename, setFilename]   = useState('');
  const [search, setSearch]       = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [viewMode, setViewMode]   = useState('table'); // 'table' | 'raw'
  const [expanded, setExpanded]   = useState(new Set());
  const [streamPath, setStreamPath] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const bottomRef = useRef(null);

  // ── Parser ──────────────────────────────────────────────────────────────
  function parseLogFile(content) {
    const lines = content.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const uid = 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2,9);
      try {
        const bodyIndex   = line.indexOf('[BODY]');
        const resultIndex = line.indexOf('[Result]');
        if (bodyIndex === -1 || resultIndex === -1) {
          result.push({ id: uid, raw: line, isUnparsed: true });
          continue;
        }

        const prefix        = line.substring(0, bodyIndex).trim();
        const bodyRawStr    = line.substring(bodyIndex + 6, resultIndex).trim();
        const afterResult   = line.substring(resultIndex + 8).trim();

        const prefixMatch = prefix.match(/^(\S+)\s+\[([A-Z]+)\]\s*\[([^\]]+)\]\s+(\S+)$/);
        const [, timestamp = '', method = '', client = '', endpoint = ''] = prefixMatch || [];

        let resultRawStr = afterResult;
        let elapsed = '';
        const elapsedIdx = afterResult.lastIndexOf('[Elapsed]');
        if (elapsedIdx !== -1) {
          resultRawStr = afterResult.substring(0, elapsedIdx).trim();
          elapsed      = afterResult.substring(elapsedIdx + 9).trim();
        } else {
          const looseElapsedRegex = /\s+(\d{2}:\d{2}:\d{2}\.\d+)$/;
          const match = afterResult.match(looseElapsedRegex);
          if (match && afterResult.endsWith(match[1])) {
            resultRawStr = afterResult.substring(0, match.index).trim();
            elapsed      = match[1];
          }
        }

        let bodyJson = null, resultJson = null, statusCode = null, isError = false;
        try { if (bodyRawStr && bodyRawStr !== 'null') bodyJson = JSON.parse(bodyRawStr); } catch {}
        try {
          if (resultRawStr && resultRawStr !== 'null') {
            resultJson = JSON.parse(resultRawStr);
            if (resultJson?.code) statusCode = resultJson.code;
            if (resultJson?.error || (statusCode && statusCode !== 200)) isError = true;
          }
        } catch {}

        result.push({ id: uid, raw: line, timestamp, method, client, endpoint, bodyRaw: bodyRawStr, bodyJson, resultRaw: resultRawStr, resultJson, elapsed, statusCode, isError });
      } catch { /* skip malformed line */ }
    }
    return result;
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    if (isStreaming) toggleStream(); // stop stream if loading file
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseLogFile(ev.target.result);
      setLogs(parsed);
      setExpanded(new Set());
      toast(`Đã tải ${parsed.length} dòng log`);
    };
    reader.readAsText(file, 'utf-8');
  }

  function toggleStream() {
    if (isStreaming) {
      streamRef.current?.close();
      streamRef.current = null;
      setIsStreaming(false);
      toast('Đã dừng Live Stream');
      return;
    }
    
    if (!streamPath) return toast('Vui lòng nhập đường dẫn file log', 'error');
    
    setLogs([]);
    setFilename('Live: ' + streamPath);
    
    const es = new EventSource(`/api/logs/stream?path=${encodeURIComponent(streamPath)}`);
    
    es.onopen = () => {
      setIsStreaming(true);
      toast('Đã kết nối Live Stream');
    };
    
    es.onerror = () => {
      es.close();
      setIsStreaming(false);
      toast('Lỗi kết nối Stream hoặc file không tồn tại', 'error');
    };
    
    es.onmessage = (e) => {
      if (e.data) {
        const parsed = parseLogFile(e.data);
        if (parsed.length > 0) {
          setLogs(prev => {
            const next = [...prev, ...parsed];
            return next.length > 5000 ? next.slice(next.length - 5000) : next;
          });
        }
      }
    };
    streamRef.current = es;
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isStreaming]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = logs.filter(log => {
    if (errorsOnly && !log.isError) return false;
    if (!search) return true;
    
    const terms = search.trim().toLowerCase().split(/\s+/);
    return terms.every(term => {
      if (term.includes(':')) {
        const [k, v] = term.split(/:(.+)/); // split by first colon
        if (!v) return true;
        if (k === 'status' || k === 'code') {
           return String(log.statusCode) === v;
        }
        if (k === 'method') {
           return log.method?.toLowerCase() === v;
        }
        if (k === 'client') {
           return log.client?.toLowerCase().includes(v);
        }
        if (k === 'endpoint') {
           return log.endpoint?.toLowerCase().includes(v);
        }
        if (k === 'elapsed') {
           const msMatch = log.elapsed?.match(/(\d+)(\.\d+)?/);
           if (!msMatch) return false;
           const ms = parseFloat(msMatch[0]);
           
           if (v.startsWith('>=')) return ms >= parseFloat(v.substring(2));
           if (v.startsWith('<=')) return ms <= parseFloat(v.substring(2));
           if (v.startsWith('>')) return ms > parseFloat(v.substring(1));
           if (v.startsWith('<')) return ms < parseFloat(v.substring(1));
           if (v.startsWith('=')) return ms === parseFloat(v.substring(1));
           return String(ms) === v;
        }
        return true; // Ignore unknown keys
      }
      
      // Full text search fallback
      return (
        log.endpoint?.toLowerCase().includes(term) ||
        log.method?.toLowerCase().includes(term) ||
        log.client?.toLowerCase().includes(term) ||
        log.timestamp?.toLowerCase().includes(term) ||
        log.bodyRaw?.toLowerCase().includes(term) ||
        log.resultRaw?.toLowerCase().includes(term)
      );
    });
  });

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function renderJsonTree(data, depth = 0) {
    if (data === null) return <span className="json-null">null</span>;
    if (typeof data === 'boolean') return <span className="json-boolean">{String(data)}</span>;
    if (typeof data === 'number') return <span className="json-number">{data}</span>;
    if (typeof data === 'string') return <span className="json-string">"{data}"</span>;
    if (Array.isArray(data)) {
      return (
        <span>
          [
          <div style={{ paddingLeft: '1rem' }}>
            {data.map((v, i) => (
              <div key={i}>{renderJsonTree(v, depth + 1)}{i < data.length - 1 ? ',' : ''}</div>
            ))}
          </div>
          ]
        </span>
      );
    }
    return (
      <span>
        {'{'}
        <div style={{ paddingLeft: '1rem' }}>
          {Object.entries(data).map(([k, v], i, arr) => (
            <div key={k}>
              <span className="json-key">"{k}"</span>: {renderJsonTree(v, depth + 1)}{i < arr.length - 1 ? ',' : ''}
            </div>
          ))}
        </div>
        {'}'}
      </span>
    );
  }

  const errorCount = logs.filter(l => l.isError).length;

  return (
    <div id="log-view" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      {/* Toolbar */}
      <div className="log-toolbar glass-panel">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label className="btn-primary" style={{ cursor: 'pointer', flexShrink: 0 }}>
            <i className="fa-solid fa-upload" /> Chọn file Log
            <input ref={fileInputRef} type="file" accept=".log,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>

          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 0.5rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="VD: D:\logs\app.log"
              value={streamPath}
              onChange={e => setStreamPath(e.target.value)}
              disabled={isStreaming}
              style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                width: '200px',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              className="btn-primary"
              onClick={toggleStream}
              style={{
                background: isStreaming ? 'var(--danger-color)' : 'var(--accent-color)',
                color: isStreaming ? '#fff' : '#000',
                padding: '0.4rem 0.75rem',
              }}
            >
              <i className={`fa-solid ${isStreaming ? 'fa-stop' : 'fa-play'}`} /> {isStreaming ? 'Dừng' : 'Stream'}
            </button>
          </div>

          <span className="csv-filename" style={{ marginLeft: '0.5rem' }}>{filename || 'Chưa chọn file'}</span>
          {logs.length > 0 && (
            <span className="log-stats">
              Tổng: <strong>{logs.length}</strong> &nbsp;|&nbsp;
              Lỗi: <strong style={{ color: '#ef4444' }}>{errorCount}</strong>
            </span>
          )}
        </div>
        {logs.length > 0 && (
          <div className="toolbar-right">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="log-search"
            />
            <button
              className={`icon-btn ${errorsOnly ? 'active' : ''}`}
              onClick={() => setErrorsOnly(v => !v)}
              title="Chỉ hiện lỗi"
            >
              <i className="fa-solid fa-triangle-exclamation" /> Chỉ lỗi
            </button>
            <button className={`icon-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
              <i className="fa-solid fa-table" /> Bảng
            </button>
            <button className={`icon-btn ${viewMode === 'raw' ? 'active' : ''}`} onClick={() => setViewMode('raw')}>
              <i className="fa-solid fa-code" /> Raw
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-bug" style={{ fontSize: '3rem', opacity: 0.5 }} />
            <h2>Công cụ Debug Log</h2>
            <p>Chọn file log để phân tích.</p>
          </div>
        ) : viewMode === 'raw' ? (
          <div className="log-raw-container">
            {filtered.map((l, idx) => (
              <div
                key={l.id}
                className={`log-raw-line ${idx % 2 === 0 ? 'even' : 'odd'} ${l.isError ? 'error' : ''}`}
              >
                {l.isUnparsed ? (
                  l.raw
                ) : (
                  <>
                    <span className="raw-ts">{l.timestamp}</span>
                    {' '}
                    {l.method && <span className={`raw-method method-${l.method.toLowerCase()}`}>[{l.method}]</span>}
                    {' '}
                    {l.client && <span className="raw-client">[{l.client}]</span>}
                    {' '}
                    {l.endpoint && <span className="raw-endpoint">{l.endpoint}</span>}
                    {' '}
                    <span className="raw-label">[BODY]</span> <span className="raw-json">{l.bodyRaw}</span>
                    {' '}
                    <span className="raw-label">[Result]</span> <span className="raw-json">{l.resultRaw}</span>
                    {' '}
                    {l.elapsed && <><span className="raw-label">[Elapsed]</span> <span className="raw-elapsed">{l.elapsed}</span></>}
                  </>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>Thời gian</th>
                <th>Method</th>
                <th>Client</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Elapsed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className={`log-row ${log.isError ? 'log-error' : ''}`}
                    onClick={() => toggleExpand(log.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="log-expand-btn">
                      <i className={`fa-solid fa-chevron-${expanded.has(log.id) ? 'down' : 'right'}`} />
                    </td>
                    <td className="log-ts">{log.timestamp}</td>
                    <td><span className={`method-badge method-${log.method?.toLowerCase()}`}>{log.method}</span></td>
                    <td className="log-client">{log.client}</td>
                    <td className="log-endpoint">{log.endpoint}</td>
                    <td>
                      {log.statusCode && (
                        <span className={`status-badge ${log.isError ? 'status-error' : 'status-ok'}`}>
                          {log.statusCode}
                        </span>
                      )}
                    </td>
                    <td className="log-elapsed">{log.elapsed}</td>
                  </tr>
                  {expanded.has(log.id) && (
                    <tr className="log-detail-row">
                      <td colSpan={7}>
                        <div className="log-detail">
                          <div className="log-detail-section">
                            <strong>BODY:</strong>
                            <div className="json-tree">
                              {log.bodyJson !== null ? renderJsonTree(log.bodyJson) : <span style={{ opacity: 0.5 }}>(empty)</span>}
                            </div>
                          </div>
                          <div className="log-detail-section">
                            <strong>RESULT:</strong>
                            <div className="json-tree">
                              {log.resultJson !== null ? renderJsonTree(log.resultJson) : <span style={{ opacity: 0.5 }}>{log.resultRaw || '(empty)'}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr ref={bottomRef}></tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

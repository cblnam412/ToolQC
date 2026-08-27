import { useRef, useState, useEffect, useCallback } from 'react';
import { projectApi, settingApi, graphApi } from '../api';

/**
 * Graph tool tab — full port of the original vis-network graph editor.
 * Uses vis-network loaded via CDN (window.vis).
 * Settings (node images, edge names, etc.) are persisted to the backend.
 */
export default function GraphView({ toast }) {
  const containerRef = useRef(null);
  const networkRef   = useRef(null);

  const [graphText, setGraphText]   = useState('');
  const [layout, setLayout]         = useState('physics');
  const [startNodes, setStartNodes] = useState('');
  const [endNodes, setEndNodes]     = useState('');

  // Global graph data state (synced to backend settings)
  const [nodeImages, setNodeImages]         = useState({});
  const [nodeCounts, setNodeCounts]         = useState({});
  const [edgeNames, setEdgeNames]           = useState({});
  const [subNodeNames, setSubNodeNames]     = useState({});
  const [nodePositions, setNodePositions]   = useState({});
  const [nodeFixed, setNodeFixed]           = useState({});

  // DB Project/Graph state
  const [projects, setProjects]             = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedGraphId, setSelectedGraphId]     = useState('');
  const [isSaving, setIsSaving]             = useState(false);

  // UI state
  const [selectedNode, setSelectedNode]     = useState(null);
  const [hiddenNodes, setHiddenNodes]       = useState(new Set());
  const [floatingPos, setFloatingPos]       = useState(null);

  // Node image modal
  const [nodeModalId, setNodeModalId]       = useState(null);
  const [edgeModalId, setEdgeModalId]       = useState(null);
  const [edgeName, setEdgeName]             = useState('');

  // Load settings and projects on mount
  useEffect(() => {
    Promise.all([
      settingApi.getAll(),
      projectApi.getAll()
    ]).then(([s, pData]) => {
      setNodeImages(s.graphNodeImages || {});
      setNodeCounts(s.graphNodeChildCounts || {});
      setEdgeNames(s.graphEdgeNames || {});
      setSubNodeNames(s.graphSubNodeNames || {});
      setProjects(pData);
    }).catch(e => {
      console.error('Failed to load graphs/settings', e);
    });
  }, []);

  // Save settings to backend (debounced via useEffect dependencies)
  const saveSettings = useCallback(
    async (images, counts, edges, subNames) => {
      try {
        await settingApi.update({
          graphNodeImages:      images,
          graphNodeChildCounts: counts,
          graphEdgeNames:       edges,
          graphSubNodeNames:    subNames,
        });
      } catch { /* silent */ }
    },
    []
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const graphs = selectedProject?.graphs || [];

  function loadGraphData(g) {
    setGraphText(g.text || '');
    setLayout(g.layout || 'physics');
    setStartNodes(g.startNodes || '');
    setEndNodes(g.endNodes || '');
    if (g.images) setNodeImages(g.images);
    if (g.childCounts) setNodeCounts(g.childCounts);
    if (g.edgeNames) setEdgeNames(g.edgeNames);
    if (g.subNodeNames) setSubNodeNames(g.subNodeNames);
    if (g.positions) setNodePositions(g.positions);
    if (g.fixed) setNodeFixed(g.fixed);
  }

  async function handleCreateGraph() {
    if (!selectedProjectId) return toast('Vui lòng chọn Dự án trước', 'error');
    const name = prompt('Nhập tên sơ đồ mới:');
    if (!name) return;
    try {
      const g = await graphApi.create(selectedProjectId, { name, text: '' });
      setProjects(prev => prev.map(p => 
        p.id === selectedProjectId ? { ...p, graphs: [...p.graphs, g] } : p
      ));
      setSelectedGraphId(g.id);
      loadGraphData(g);
      toast('Đã tạo sơ đồ mới');
    } catch (e) {
      toast('Lỗi tạo sơ đồ: ' + e.message, 'error');
    }
  }

  async function handleDeleteGraph() {
    if (!selectedProjectId || !selectedGraphId) return;
    if (!confirm('Xóa sơ đồ này?')) return;
    try {
      await graphApi.remove(selectedProjectId, selectedGraphId);
      setProjects(prev => prev.map(p => 
        p.id === selectedProjectId ? { ...p, graphs: p.graphs.filter(g => g.id !== selectedGraphId) } : p
      ));
      setSelectedGraphId('');
      setGraphText('');
      toast('Đã xóa sơ đồ');
    } catch (e) {
      toast('Lỗi xóa sơ đồ: ' + e.message, 'error');
    }
  }

  function handleSelectGraph(e) {
    const id = e.target.value;
    setSelectedGraphId(id);
    if (!id) {
       setGraphText('');
       return;
    }
    const g = graphs.find(x => x.id === id);
    if (g) loadGraphData(g);
  }

  // Auto save Graph
  useEffect(() => {
    if (!selectedProjectId || !selectedGraphId) return;
    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        let positions = nodePositions;
        if (networkRef.current) {
           const p = networkRef.current.getPositions();
           positions = { ...positions, ...p };
        }
        await graphApi.update(selectedProjectId, selectedGraphId, {
           text: graphText,
           layout,
           startNodes,
           endNodes,
           images: nodeImages,
           childCounts: nodeCounts,
           edgeNames,
           subNodeNames,
           positions,
           fixed: nodeFixed
        });
        
        setProjects(prev => prev.map(p => {
          if (p.id !== selectedProjectId) return p;
          return {
             ...p,
             graphs: p.graphs.map(g => g.id === selectedGraphId ? {
                ...g, text: graphText, layout, startNodes, endNodes, images: nodeImages, childCounts: nodeCounts, edgeNames, subNodeNames, positions, fixed: nodeFixed
             } : g)
          };
        }));
      } catch (e) {
        console.error('Auto save graph failed', e);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [graphText, layout, startNodes, endNodes, nodeImages, nodeCounts, edgeNames, subNodeNames, nodeFixed, selectedProjectId, selectedGraphId]);

  /**
   * Parse the input text into nodes/edges.
   * Supports: A -> B, A <-> B, A -- B
   */
  function parseGraph(text) {
    const nodesSet = new Set();
    const edgesMap = new Map();
    const hiddenSet = new Set(stateRef.current?.hiddenNodes || []);

    (text || '').split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      let from, to, bothWays = false;
      if (line.includes('<->')) {
        [from, to] = line.split('<->').map(s => s.trim());
        bothWays = true;
      } else if (line.includes('->')) {
        [from, to] = line.split('->').map(s => s.trim());
      } else if (line.includes('--')) {
        [from, to] = line.split('--').map(s => s.trim());
        bothWays = true;
      }
      if (!from || !to) return;

      nodesSet.add(from); nodesSet.add(to);
      edgesMap.set(`${from}->${to}`, { from, to, arrows: { to: { enabled: true } } });
      if (bothWays) {
        edgesMap.set(`${to}->${from}`, { from: to, to: from, arrows: { to: { enabled: true } } });
      }
    });

    // Add sub-nodes
    const extraNodes = new Set();
    const currentCounts = stateRef.current?.nodeCounts || {};
    for (const [nodeId, count] of Object.entries(currentCounts)) {
      if (!nodesSet.has(nodeId)) continue;
      for (let i = 1; i <= count; i++) {
        const subId = `${nodeId}.${i}`;
        extraNodes.add(subId);
        edgesMap.set(`${nodeId}->${subId}`, {
          from: nodeId, to: subId, dashes: true,
          arrows: { to: { enabled: true, scaleFactor: 0.5 } }
        });
      }
    }

    const allNodes = [...nodesSet, ...extraNodes].filter(id => !hiddenSet.has(id));
    const allEdges = [...edgesMap.values()].filter(e => !hiddenSet.has(e.from) && !hiddenSet.has(e.to));
    return { allNodes, allEdges };
  }

  // We keep a ref to state for event handlers inside vis
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { 
      graphText, layout, startNodes, endNodes,
      nodeImages, nodeCounts, edgeNames, subNodeNames, nodePositions, nodeFixed, hiddenNodes 
    };
  });

  useEffect(() => {
    if (selectedGraphId) {
      const timer = setTimeout(drawGraph, 100);
      return () => clearTimeout(timer);
    } else {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    }
  }, [selectedGraphId]);

  function drawGraph() {
    try {
      if (!containerRef.current || !window.vis) return;
      const vis = window.vis;

      const { 
        graphText: text = '', layout: l = 'physics', startNodes: sn = '', endNodes: en = '', 
        nodeImages: imgs = {}, edgeNames: eNames = {}, nodePositions: pos = {}, nodeFixed: fixed = {} 
      } = stateRef.current || {};

      const { allNodes, allEdges } = parseGraph(text);

      const highlights = {
        start: new Set(sn.split(',').map(s => s.trim()).filter(Boolean)),
        end:   new Set(en.split(',').map(s => s.trim()).filter(Boolean)),
      };

    const nodes = allNodes.map(id => {
      const cfg = { id, label: id };
      if (pos[id]) { cfg.x = pos[id].x; cfg.y = pos[id].y; }
      if (fixed[id]) cfg.fixed = true;
      if (imgs[id]?.length > 0) {
        cfg.shape = 'image';
        cfg.image = imgs[id][0];
        cfg.shapeProperties = { useBorderWithImage: true, useImageSize: false };
        cfg.size = 30;
        if (imgs[id].length > 1) cfg.label += ` (+${imgs[id].length - 1} ảnh)`;
      }
      if (highlights.start.has(id)) cfg.color = { background: '#10b981', border: '#34d399' };
      if (highlights.end.has(id))   cfg.color = { background: '#ef4444', border: '#f87171' };
      return cfg;
    });

    const edges = allEdges.map(e => {
      const cfg = { ...e, id: `${e.from}->${e.to}` };
      if (eNames[cfg.id]) {
        cfg.label = eNames[cfg.id];
        cfg.font  = { color: '#e2f1ff', size: 14, background: 'rgba(11,15,25,0.8)', strokeWidth: 0 };
      }
      // Curve bidirectional edges
      const hasReverse = allEdges.some(r => r.from === e.to && r.to === e.from);
      if (hasReverse) cfg.smooth = { enabled: true, type: 'curvedCW', roundness: 0.15 };
      return cfg;
    });

    const isHierarchical = l.startsWith('hierarchical');
    const hasPos = Object.keys(pos).length > 0;

    const options = {
      layout: isHierarchical && !hasPos
        ? { hierarchical: { enabled: true, direction: l === 'hierarchical-lr' ? 'LR' : 'UD', sortMethod: 'directed', nodeSpacing: 350, levelSeparation: 400 } }
        : {},
      physics: isHierarchical && !hasPos ? { enabled: false } : {
        barnesHut: { gravitationalConstant: -5000, springLength: 250, springConstant: 0.04 },
        stabilization: { iterations: 150 }
      },
      nodes: {
        shape: 'box', borderWidth: 2,
        color: { border: '#00f0ff', background: 'rgba(11,15,25,0.8)', highlight: { border: '#ff0055' } },
        font: { color: '#e2f1ff', size: 14, face: 'Inter' },
        margin: { top: 12, bottom: 12, left: 16, right: 16 },
        shadow: { enabled: true, color: 'rgba(0,240,255,0.4)', size: 10 },
      },
      edges: {
        color: { color: 'rgba(0,240,255,0.4)', highlight: '#00f0ff' }, width: 2,
        smooth: { enabled: false },
        shadow: { enabled: true, color: 'rgba(0,240,255,0.3)', size: 5 },
      },
      interaction: { hover: true },
    };

    if (networkRef.current) networkRef.current.destroy();
    networkRef.current = new vis.Network(
      containerRef.current,
      { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) },
      options
    );

    const net = networkRef.current;

    net.on('click', params => {
      if (params.nodes.length > 0) {
        const id = params.nodes[0];
        setSelectedNode(id);
        setFloatingPos(params.pointer.DOM);
      } else {
        setSelectedNode(null);
        setFloatingPos(null);
      }
    });

    net.on('doubleClick', params => {
      if (params.nodes.length > 0) { setNodeModalId(params.nodes[0]); }
      else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        setEdgeModalId(edgeId);
        setEdgeName(stateRef.current.edgeNames[edgeId] || '');
      }
    });

    net.on('oncontext', params => {
      params.event.preventDefault();
      const nodeId = net.getNodeAt(params.pointer.DOM);
      if (nodeId) {
        setNodeFixed(prev => {
          const next = { ...prev, [nodeId]: !prev[nodeId] };
          const p = net.getPositions([nodeId])[nodeId];
          if (p) {
            setNodePositions(pp => ({ ...pp, [nodeId]: p }));
            net.body.data.nodes.update({ id: nodeId, fixed: next[nodeId], x: p.x, y: p.y });
          }
          toast(next[nodeId] ? `Đã ghim node: ${nodeId}` : `Đã bỏ ghim node: ${nodeId}`);
          return next;
        });
      }
    });

    net.on('dragEnd', params => {
      if (params.nodes?.length > 0) {
        const posMap = net.getPositions(params.nodes);
        setNodePositions(prev => ({ ...prev, ...posMap }));
      }
    });

    net.on('zoom',     () => updateFloatBtn(net));
    net.on('dragView', () => updateFloatBtn(net));
    net.on('dragNode', () => updateFloatBtn(net));

    function updateFloatBtn(n) {
      const sel = stateRef.current.selectedNode;
      if (!sel) return;
      const p = n.canvasToDOM(n.getPositions([sel])[sel]);
      setFloatingPos(p);
    }
    } catch (err) {
      console.error('Graph draw error:', err);
      toast('Lỗi vẽ đồ thị: ' + err.message, 'error');
    }
  }
  function handleSaveEdgeName() {
    if (!edgeModalId) return;
    setEdgeNames(prev => {
      const next = { ...prev };
      if (edgeName.trim()) next[edgeModalId] = edgeName.trim();
      else delete next[edgeModalId];
      saveSettings(nodeImages, nodeCounts, next, subNodeNames);
      return next;
    });
    setEdgeModalId(null);
    if (graphText.trim()) drawGraph();
  }

  function handleExportPng() {
    if (!networkRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `So_Do_${selectedGraphId || 'export'}.png`;
    a.click();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Graph Toolbar ── */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', marginBottom: '0.5rem', flexShrink: 0 }}>
        <div style={{ fontWeight: 'bold' }}>Quản lý Sơ đồ:</div>
        <select 
          value={selectedProjectId} 
          onChange={e => { setSelectedProjectId(e.target.value); setSelectedGraphId(''); setGraphText(''); }} 
          className="sheet-select" 
          style={{ minWidth: 200, padding: '0.3rem' }}
        >
          <option value="">-- Chọn Dự án --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {selectedProjectId && (
          <select 
            value={selectedGraphId} 
            onChange={handleSelectGraph} 
            className="sheet-select" 
            style={{ minWidth: 200, padding: '0.3rem' }}
          >
            <option value="">-- Chọn Sơ đồ --</option>
            {graphs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {selectedProjectId && (
          <button className="btn-primary" onClick={handleCreateGraph}>
            <i className="fa-solid fa-plus" /> Tạo mới
          </button>
        )}

        {selectedGraphId && (
          <>
            <button className="btn-danger" onClick={handleDeleteGraph} style={{ padding: '0.3rem 0.6rem' }}>
              <i className="fa-solid fa-trash" /> Xóa
            </button>
            <div style={{ flex: 1 }} />
            {isSaving && <span style={{ opacity: 0.6, fontSize: '0.85rem' }}><i className="fa-solid fa-spinner fa-spin" /> Đang lưu...</span>}
            <button className="btn-primary" onClick={handleExportPng}>
              <i className="fa-solid fa-image" /> Lưu ảnh (PNG)
            </button>
          </>
        )}
      </div>

      <div className="graph-container" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Sidebar ── */}
        <div className="graph-sidebar glass-panel" style={{ opacity: selectedGraphId ? 1 : 0.5, pointerEvents: selectedGraphId ? 'auto' : 'none' }}>
          <div className="graph-sidebar-header">
            <i className="fa-solid fa-code" /> Code Đồ Thị
          </div>
          <div className="graph-sidebar-content">
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label>Nhập liên kết đồ thị</label>
              <textarea
                value={graphText}
                onChange={e => setGraphText(e.target.value)}
                placeholder={'Ví dụ:\n1 -> 2\n2 -> 3\n3 -> 1'}
                style={{ flex: 1, resize: 'none', fontFamily: 'monospace' }}
                spellCheck={false}
              />
            </div>
            <div className="form-group">
              <label>Layout</label>
              <select value={layout} onChange={e => setLayout(e.target.value)}>
                <option value="physics">Tự do (Lực đẩy)</option>
                <option value="hierarchical-lr">Phân cấp (Trái → Phải)</option>
                <option value="hierarchical-ud">Phân cấp (Trên → Dưới)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Node bắt đầu</label>
              <input value={startNodes} onChange={e => setStartNodes(e.target.value)} placeholder="VD: 1, 2" />
            </div>
            <div className="form-group">
              <label>Node kết thúc</label>
              <input value={endNodes} onChange={e => setEndNodes(e.target.value)} placeholder="VD: 5" />
            </div>
            <button className="btn-primary" onClick={drawGraph} style={{ width: '100%' }}>
              <i className="fa-solid fa-play" /> Vẽ đồ thị
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!selectedGraphId && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <h2>Vui lòng chọn hoặc tạo Sơ đồ để bắt đầu</h2>
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'var(--bg-color)' }} />

          {/* Floating edit button */}
          {selectedNode && floatingPos && selectedGraphId && (
            <button
              style={{ position: 'absolute', left: floatingPos.x + 10, top: floatingPos.y + 10, zIndex: 10 }}
              className="icon-btn"
              onClick={() => setNodeModalId(selectedNode)}
            >
              <i className="fa-solid fa-pen" />
            </button>
          )}
        </div>
      </div>

      {/* Edge name modal */}
      {edgeModalId && (
        <div className="modal-overlay" onClick={() => setEdgeModalId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tên cạnh: {edgeModalId.replace('->', ' ➔ ')}</h3>
              <button className="close-btn" onClick={() => setEdgeModalId(null)}>×</button>
            </div>
            <div className="modal-body">
              <input
                autoFocus
                value={edgeName}
                onChange={e => setEdgeName(e.target.value)}
                placeholder="Nhập tên cạnh..."
                onKeyDown={e => e.key === 'Enter' && handleSaveEdgeName()}
              />
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setEdgeModalId(null)}>Hủy</button>
                <button className="btn-primary" onClick={handleSaveEdgeName}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node image modal */}
      {nodeModalId && (
        <div className="modal-overlay" onClick={() => setNodeModalId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tùy chỉnh Node: {nodeModalId}</h3>
              <button className="close-btn" onClick={() => setNodeModalId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ opacity: 0.6 }}>Ảnh đính kèm node:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {(nodeImages[nodeModalId] || []).map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                    <button
                      className="icon-btn delete"
                      style={{ position: 'absolute', top: -4, right: -4, padding: '2px 5px' }}
                      onClick={() => {
                        setNodeImages(prev => {
                          const next = { ...prev, [nodeModalId]: prev[nodeModalId].filter((_, j) => j !== i) };
                          if (!next[nodeModalId].length) delete next[nodeModalId];
                          return next;
                        });
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setNodeModalId(null)}>Đóng</button>
                <button className="btn-primary" onClick={() => { setNodeModalId(null); drawGraph(); }}>
                  Áp dụng & Vẽ lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

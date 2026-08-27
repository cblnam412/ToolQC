import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * CSV / XLSX editor tab.
 * This is a direct port of the original app.js CSV logic into React.
 * No backend needed — files are handled entirely client-side.
 */
export default function CsvTool({ toast }) {
  const [csvData, setCsvData]   = useState([]);
  const [filename, setFilename] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  
  const [contextMenu, setContextMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const fileInputRef = useRef(null);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const displayRows = useMemo(() => {
    if (csvData.length <= 1) return [];
    let rows = csvData.slice(1).map((row, idx) => ({ row, originalIndex: idx + 1 }));
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(item => item.row.some(cell => String(cell || '').toLowerCase().includes(q)));
    }
    
    if (sortConfig.key !== null) {
      const { key, direction } = sortConfig;
      rows.sort((a, b) => {
        const valA = String(a.row[key] || '');
        const valB = String(b.row[key] || '');
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return direction === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [csvData, searchQuery, sortConfig]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    setWorkbook(null);
    setSheetNames([]);

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const wb = window.XLSX.read(data, { type: 'array' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          setActiveSheet(wb.SheetNames[0]);
          loadSheet(wb, wb.SheetNames[0]);
          toast('Đã mở file Excel');
        } catch {
          toast('Lỗi khi đọc file Excel', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      window.Papa.parse(file, {
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data?.length > 0) {
            setCsvData(results.data);
            toast('Đã mở file CSV');
          } else {
            toast('File CSV trống', 'error');
          }
        },
      });
    }
  }

  function loadSheet(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    const data = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (data?.length > 0) setCsvData(data);
  }

  function handleSheetChange(e) {
    setActiveSheet(e.target.value);
    if (workbook) loadSheet(workbook, e.target.value);
  }

  function updateCell(row, col, value) {
    setCsvData(prev => {
      const next = [...prev];
      next[row] = [...next[row]];
      next[row][col] = value;
      return next;
    });
  }

  function addRow() {
    if (csvData.length === 0) return;
    setCsvData(prev => [...prev, Array(prev[0].length).fill('')]);
  }

  function addCol() {
    if (csvData.length === 0) return;
    setCsvData(prev => prev.map(r => [...r, '']));
  }

  function handleContextMenu(e, rowIndex, colIndex) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowIndex, colIndex });
  }

  function handleMenuAction(action) {
    if (!contextMenu) return;
    const { rowIndex, colIndex } = contextMenu;
    
    setCsvData(prev => {
      if (action === 'insert-row-above') {
        const next = [...prev];
        next.splice(rowIndex, 0, Array(prev[0].length).fill(''));
        return next;
      } else if (action === 'insert-row-below') {
        const next = [...prev];
        next.splice(rowIndex + 1, 0, Array(prev[0].length).fill(''));
        return next;
      } else if (action === 'duplicate-row') {
        const next = [...prev];
        next.splice(rowIndex + 1, 0, [...prev[rowIndex]]);
        return next;
      } else if (action === 'delete-row') {
        if (rowIndex === 0 || prev.length <= 1) return prev;
        const next = [...prev];
        next.splice(rowIndex, 1);
        return next;
      } else if (action === 'insert-col-left') {
        return prev.map(row => {
          const newRow = [...row];
          newRow.splice(colIndex, 0, '');
          return newRow;
        });
      } else if (action === 'insert-col-right') {
        return prev.map(row => {
          const newRow = [...row];
          newRow.splice(colIndex + 1, 0, '');
          return newRow;
        });
      } else if (action === 'delete-col') {
        if (prev[0].length <= 1) return prev;
        return prev.map(row => {
          const newRow = [...row];
          newRow.splice(colIndex, 1);
          return newRow;
        });
      }
      return prev;
    });
    setContextMenu(null);
  }

  function handleHeaderClick(colIndex) {
    setSortConfig(prev => {
      if (prev.key === colIndex) {
        if (prev.direction === 'asc') return { key: colIndex, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key: colIndex, direction: 'asc' };
    });
  }

  function clearTable() {
    if (confirm('Xóa toàn bộ bảng?')) {
      setCsvData([]);
      setFilename('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function downloadCsv() {
    const csv = window.Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasData = csvData.length > 0;

  // ── Virtualization ──
  const rowVirtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <div id="csv-view" style={{ position: 'relative' }}>
      <div className="csv-toolbar glass-panel">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label className="btn-primary" style={{ cursor: 'pointer' }}>
            <i className="fa-solid fa-upload" /> Chọn file CSV / XLSX
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
          <span className="csv-filename">{filename || 'Chưa chọn file nào'}</span>
          {sheetNames.length > 1 && (
            <select value={activeSheet} onChange={handleSheetChange} className="sheet-select">
              {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          
          {hasData && (
            <>
              <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 0.5rem' }} />
              <input 
                type="text" 
                className="csv-search" 
                placeholder="Tìm kiếm..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </>
          )}
        </div>
        <div className="toolbar-right">
          <button onClick={addRow}><i className="fa-solid fa-plus" /> Thêm dòng</button>
          <button onClick={addCol}><i className="fa-solid fa-plus" /> Thêm cột</button>
          <button className="btn-danger" onClick={clearTable}><i className="fa-solid fa-trash" /> Xoá bảng</button>
          <button onClick={downloadCsv}><i className="fa-solid fa-download" /> Tải về CSV</button>
        </div>
      </div>

      <div className="csv-container" ref={tableContainerRef}>
        {!hasData ? (
          <div className="empty-state">
            <i className="fa-solid fa-file-csv" />
            <p>Chọn hoặc kéo thả file CSV / Excel vào đây để xem</p>
          </div>
        ) : (
          <div style={{ position: 'relative', height: `${rowVirtualizer.getTotalSize()}px`, minWidth: '100%' }}>
            <table className="csv-table">
              <thead>
                <tr>
                  {csvData[0].map((header, c) => (
                    <th 
                      key={c} 
                      onContextMenu={(e) => handleContextMenu(e, 0, c)}
                      onClick={() => handleHeaderClick(c)}
                      title="Chuột phải để xem thêm. Click trái để Sắp xếp."
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onClick={e => e.stopPropagation()} // prevent sorting when editing
                          onBlur={e => updateCell(0, c, e.target.innerText)}
                          dangerouslySetInnerHTML={{ __html: header }}
                          style={{ outline: 'none', flex: 1 }}
                        />
                        {sortConfig.key === c && (
                          <i className={`fa-solid fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} sort-icon active`} />
                        )}
                        {sortConfig.key !== c && <i className="fa-solid fa-sort sort-icon" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paddingTop > 0 && <tr><td colSpan={csvData[0].length} style={{ height: paddingTop, padding: 0, border: 'none' }}></td></tr>}
                
                {virtualItems.map(vRow => {
                  const item = displayRows[vRow.index];
                  const originalIndex = item.originalIndex;
                  return (
                    <tr key={originalIndex}>
                      {item.row.map((cell, c) => (
                        <td key={c} onContextMenu={(e) => handleContextMenu(e, originalIndex, c)}>
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => updateCell(originalIndex, c, e.target.innerText)}
                            dangerouslySetInnerHTML={{ __html: cell }}
                            style={{ outline: 'none' }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {paddingBottom > 0 && <tr><td colSpan={csvData[0].length} style={{ height: paddingBottom, padding: 0, border: 'none' }}></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {contextMenu && (
        <div 
          className="csv-context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.rowIndex > 0 && (
            <>
              <div className="csv-context-menu-item" onClick={() => handleMenuAction('insert-row-above')}>
                <i className="fa-solid fa-arrow-up" /> Chèn dòng lên trên
              </div>
              <div className="csv-context-menu-item" onClick={() => handleMenuAction('insert-row-below')}>
                <i className="fa-solid fa-arrow-down" /> Chèn dòng xuống dưới
              </div>
              <div className="csv-context-menu-item" onClick={() => handleMenuAction('duplicate-row')}>
                <i className="fa-solid fa-copy" /> Nhân bản dòng
              </div>
              <div className="csv-context-divider"></div>
              <div className="csv-context-menu-item danger" onClick={() => handleMenuAction('delete-row')}>
                <i className="fa-solid fa-trash" /> Xoá dòng
              </div>
              <div className="csv-context-divider"></div>
            </>
          )}
          <div className="csv-context-menu-item" onClick={() => handleMenuAction('insert-col-left')}>
            <i className="fa-solid fa-arrow-left" /> Chèn cột bên trái
          </div>
          <div className="csv-context-menu-item" onClick={() => handleMenuAction('insert-col-right')}>
            <i className="fa-solid fa-arrow-right" /> Chèn cột bên phải
          </div>
          <div className="csv-context-divider"></div>
          <div className="csv-context-menu-item danger" onClick={() => handleMenuAction('delete-col')}>
            <i className="fa-solid fa-trash" /> Xoá cột
          </div>
        </div>
      )}
    </div>
  );
}

import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'PRESENT', label: 'Có mặt' },
  { value: 'LATE', label: 'Muộn' },
  { value: 'ABSENT', label: 'Vắng' },
  { value: 'EXCUSED', label: 'Có phép' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendlyError(err) {
  const code = err?.response?.data?.code ?? '';
  const msg = err?.response?.data?.message ?? err?.message ?? '';
  const map = {
    NO_PERMISSION_ON_SESSION: 'Bạn không có quyền xem buổi học này.',
    CLASS_SESSION_NOT_FOUND: 'Không tìm thấy buổi học.',
  };
  return map[code] || msg || 'Có lỗi xảy ra, vui lòng thử lại.';
}

function Skeleton({ h = 14, w = '100%', radius = 5 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: 'var(--bg3)',
      animation: 'att-pulse 1.4s ease-in-out infinite',
    }} />
  );
}

// Stat pill trong header
function StatPill({ color, label, value }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 14px', borderRadius: 10,
      background: 'var(--bg3)', border: '1px solid var(--bd)',
      minWidth: 62,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--mo)', lineHeight: 1.1 }}>
        {value ?? 0}
      </span>
      <span style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}


// Inline status dropdown khi giảng viên sửa
function StatusSelect({ value, onChange, loading }) {
  const bgMap = {
    PRESENT: 'rgba(34,197,94,.1)',
    LATE: 'rgba(245,158,11,.15)',
    ABSENT: 'rgba(239,68,68,.1)',
    EXCUSED: 'rgba(59,130,246,.1)'
  };
  const colorMap = {
    PRESENT: 'var(--gr)',
    LATE: 'var(--am)',
    ABSENT: 'var(--rd)',
    EXCUSED: 'var(--bl)'
  };
  const bg = bgMap[value] || 'var(--bg3)';
  const color = colorMap[value] || 'var(--tx)';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ 
         position: 'absolute', left: 10, width: 6, height: 6, borderRadius: '50%', 
         background: color, pointerEvents: 'none' 
      }} />
      <select
        style={{ 
          width: '100%', minWidth: 105, padding: '5px 22px 5px 22px', fontSize: 12, fontWeight: 600,
          opacity: loading ? 0.5 : 1, borderRadius: 20, cursor: 'pointer',
          background: bg, color: color, border: `1px solid transparent`, transition: 'all 0.2s',
          appearance: 'none', outline: 'none', fontFamily: 'inherit'
        }}
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="PRESENT" style={{ color: 'var(--tx)', background: '#fff' }}>Có mặt</option>
        <option value="LATE" style={{ color: 'var(--tx)', background: '#fff' }}>Muộn</option>
        <option value="ABSENT" style={{ color: 'var(--tx)', background: '#fff' }}>Vắng</option>
        <option value="EXCUSED" style={{ color: 'var(--tx)', background: '#fff' }}>Có phép</option>
      </select>
      <span style={{ position: 'absolute', right: 10, fontSize: 9, color: color, pointerEvents: 'none' }}>▼</span>
    </div>
  );
}



// Pagination controls
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const lo = Math.max(0, page - 2);
  const hi = Math.min(totalPages - 1, page + 2);
  for (let i = lo; i <= hi; i++) pages.push(i);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', paddingTop: 14 }}>
      <PgBtn disabled={page === 0} onClick={() => onChange(page - 1)} label="‹" />
      {lo > 0 && <><PgBtn label="1" onClick={() => onChange(0)} /><span style={{ color: 'var(--tx3)', fontSize: 12 }}>…</span></>}
      {pages.map((p) => (
        <PgBtn key={p} label={p + 1} active={p === page} onClick={() => onChange(p)} />
      ))}
      {hi < totalPages - 1 && <><span style={{ color: 'var(--tx3)', fontSize: 12 }}>…</span><PgBtn label={totalPages} onClick={() => onChange(totalPages - 1)} /></>}
      <PgBtn disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} label="›" />
    </div>
  );
}

function PgBtn({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 30, padding: '0 8px',
        borderRadius: 7, border: '1px solid',
        borderColor: active ? 'var(--bl)' : 'var(--bd)',
        background: active ? 'var(--bl)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--tx3)' : 'var(--tx)',
        fontSize: 12, cursor: disabled ? 'default' : 'pointer',
        fontWeight: active ? 600 : 400,
        transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

// Component cho một dòng sinh viên
function StudentRow({ row, idx, pendingData, onUpdate, isSelected, onToggleSelect }) {
  const data = { ...row, ...pendingData };
  const isEdited = !!pendingData;
  const isLate = data.uiStatus === 'LATE';
  
  const [note, setNote] = useState(data.note || '');
  const [lateMins, setLateMins] = useState(data.lateMinutes || '');

  useEffect(() => { Promise.resolve().then(() => setNote(data.note || '')); }, [data.note]);
  useEffect(() => { Promise.resolve().then(() => setLateMins(data.lateMinutes || '')); }, [data.lateMinutes]);

  const handleBlurNote = () => {
    if (note !== (data.note || '')) onUpdate({ note });
  };
  
  const handleBlurLateMins = () => {
    const val = lateMins ? parseInt(lateMins, 10) : null;
    const oldVal = data.lateMinutes ? parseInt(data.lateMinutes, 10) : null;
    if (val !== oldVal) onUpdate({ lateMinutes: val });
  };

  return (
    <tr
      className={`att-table-row${isEdited ? ' edit-pending' : ''}`}
      style={{ animationDelay: `${Math.min(idx, 15) * 18}ms` }}
    >
      {/* 0. Checkbox chọn */}
      <td data-label="Chọn" style={{ width: 40, textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={onToggleSelect}
          style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--bl)' }}
        />
      </td>

      {/* 1. Mã SV */}
      <td data-label="Mã SV" style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {row.studentCode}
      </td>

      {/* 2. Họ và tên */}
      <td data-label="Họ và tên" style={{ whiteSpace: 'nowrap' }} title={row.fullName}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--bl), var(--pu))', 
              color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {row.fullName ? row.fullName.trim().split(' ').pop()[0].toUpperCase() : 'S'}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx)' }}>{row.fullName}</span>
        </div>
      </td>

      {/* 3. Đi học */}
      <td data-label="Đi học" style={{ textAlign: 'center', fontSize: 13, fontFamily: 'var(--mo)', color: 'var(--gr)', fontWeight: 600 }}>
        {(row.presentCount ?? 0) + (row.lateCount ?? 0)}
      </td>

      {/* 4. Nghỉ */}
      <td data-label="Nghỉ" style={{ textAlign: 'center', fontSize: 13, fontFamily: 'var(--mo)', color: (row.absentCount >= 3 ? 'var(--am)' : 'var(--rd)'), fontWeight: 600 }}>
        {row.absentCount ?? 0} {row.absentCount >= 3 && '⚠️'}
      </td>

      {/* 5. Muộn */}
      <td data-label="Muộn" style={{ textAlign: 'center', fontSize: 13, fontFamily: 'var(--mo)', color: 'var(--am)', fontWeight: 600 }}>
        {row.lateCount ?? 0}
      </td>

      {/* 6. Trạng thái (Hôm nay) */}
      <td data-label="Trạng thái (Hôm nay)">
        <StatusSelect
          value={data.uiStatus}
          loading={false}
          onChange={(v) => onUpdate({ uiStatus: v })}
        />
      </td>

      {/* 7. Số phút muộn */}
      <td data-label="Số phút muộn" style={{ textAlign: 'center' }}>
        <input 
          type="number" 
          value={lateMins}
          onChange={(e) => setLateMins(e.target.value)}
          onBlur={handleBlurLateMins}
          disabled={!isLate} 
          placeholder={isLate ? '0' : '🔒 -'}
          style={{ 
            width: 50, textAlign: 'center', background: isLate ? '#fff' : 'transparent', 
            border: isLate ? '1px solid var(--bd2)' : '1px dashed transparent', 
            padding: '5px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mo)',
            color: isLate ? 'var(--am)' : 'var(--tx3)'
          }}
        />
      </td>

      {/* 8. Về sớm */}
      <td data-label="Về sớm" style={{ textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={data.leftEarly || false} 
          onChange={(e) => onUpdate({ leftEarly: e.target.checked })}
          style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--rd)' }}
        />
      </td>

      {/* 9. Ghi chú */}
      <td data-label="Ghi chú">
        <input 
          type="text" 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleBlurNote}
          placeholder="📝 Thêm..." 
          style={{ 
            width: '100%', minWidth: 100, background: 'transparent', 
            border: '1px solid var(--bd)', padding: '5px 10px', 
            borderRadius: 6, fontSize: 12, color: 'var(--tx)'
          }}
        />
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Attendance() {
  const { showError } = useError();

  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [uiStatus, setUiStatus] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 40;

  // Data
  const [pageData, setPageData] = useState(null); // Page<AttendanceListDto>
  const [sessionInfo, setSessionInfo] = useState(null); // ClassSessionDetailDto
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Batch edit: { attendanceId → { uiStatus, lateMinutes, leftEarly, note } }
  const [pendingChanges, setPendingChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Bulk actions: Mảng các attendanceId được tick
  const [selectedIds, setSelectedIds] = useState([]);

  // Debounce search
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = (v) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(0);
    }, 380);
  };

  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, excused: 0 });

  // Fetch session info (once)
  useEffect(() => {
    if (!sessionId) return;
    api.get(`/api/v1/sessions/${sessionId}`)
      .then(({ data }) => setSessionInfo(data.result ?? data))
      .catch(() => { });
  }, [sessionId]);

  // Fetch attendance list
  const fetchList = useCallback(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    const params = { page, size: pageSize };
    if (debouncedSearch) params.search = debouncedSearch;
    if (uiStatus) params.uiStatus = uiStatus;

    api.get(`/api/v1/sessions/${sessionId}/attendances`, { params })
      .then(({ data }) => {
        const res = data.result ?? data;
        setPageData(res);
        setSelectedIds([]); // Reset chọn hàng loạt mỗi khi load lại danh sách
        
        // Cập nhật thống kê nếu đang lấy toàn bộ danh sách (không có bộ lọc)
        if (!debouncedSearch && !uiStatus && res.content) {
          setStats({
            present: res.content.filter(i => i.uiStatus === 'PRESENT').length,
            late: res.content.filter(i => i.uiStatus === 'LATE').length,
            absent: res.content.filter(i => i.uiStatus === 'ABSENT').length,
            excused: res.content.filter(i => i.uiStatus === 'EXCUSED').length,
          });
        }
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [sessionId, page, debouncedSearch, uiStatus]);

  useEffect(() => { Promise.resolve().then(() => fetchList()); }, [fetchList, retryCount]);

  // Reset page khi đổi filter/search
  const handleTabChange = (v) => { setUiStatus(v); setPage(0); };

  // Cập nhật nháp cục bộ
  const handleUpdate = (attendanceId, updates) => {
    setPendingChanges((prev) => {
      const currentPending = prev[attendanceId] || {};
      const newPending = { ...currentPending, ...updates };

      // Lấy dữ liệu gốc để kiểm tra xem đã quay về y như cũ chưa
      const originalRow = pageData.content.find(i => i.attendanceId === attendanceId) || {};
      
      // Nếu trạng thái đổi khác LATE thì tự động reset số phút muộn
      if (updates.uiStatus && updates.uiStatus !== 'LATE') {
         newPending.lateMinutes = null;
      }

      // Xóa các trường giống hệt dữ liệu gốc
      let hasRealChange = false;
      const cleanPending = {};
      
      for (const key of ['uiStatus', 'lateMinutes', 'leftEarly', 'note']) {
        const val = newPending[key] !== undefined ? newPending[key] : originalRow[key];
        if (val !== originalRow[key]) {
           hasRealChange = true;
           cleanPending[key] = val;
        }
      }

      const nextState = { ...prev };
      if (hasRealChange) {
        nextState[attendanceId] = cleanPending;
      } else {
        delete nextState[attendanceId]; // Quay về như cũ thì xóa khỏi danh sách chờ lưu
      }
      return nextState;
    });
  };

  // Áp dụng trạng thái cho nhiều sinh viên được chọn
  const handleBulkUpdate = (status) => {
    if (selectedIds.length === 0) return;
    
    setPendingChanges(prev => {
      const nextState = { ...prev };
      selectedIds.forEach(id => {
        const originalRow = pageData.content.find(i => i.attendanceId === id) || {};
        const currentPending = nextState[id] || {};
        const newPending = { ...currentPending, uiStatus: status };
        
        if (status !== 'LATE') newPending.lateMinutes = null;
        
        let hasRealChange = false;
        const cleanPending = {};
        for (const key of ['uiStatus', 'lateMinutes', 'leftEarly', 'note']) {
          const val = newPending[key] !== undefined ? newPending[key] : originalRow[key];
          if (val !== originalRow[key]) {
             hasRealChange = true;
             cleanPending[key] = val;
          }
        }
        
        if (hasRealChange) {
          nextState[id] = cleanPending;
        } else {
          delete nextState[id];
        }
      });
      return nextState;
    });
    setSelectedIds([]); // Bỏ chọn sau khi áp dụng xong
  };

  // Lưu tất cả lên server
  const handleBatchSave = async () => {
    const changesCount = Object.keys(pendingChanges).length;
    if (changesCount === 0) return;
    
    setIsSaving(true);
    try {
      const items = Object.entries(pendingChanges).map(([id, changes]) => {
         const originalRow = pageData.content.find(i => i.attendanceId === Number(id)) || {};
         return {
            attendanceId: Number(id),
            uiStatus: changes.uiStatus !== undefined ? changes.uiStatus : originalRow.uiStatus,
            lateMinutes: changes.lateMinutes !== undefined ? changes.lateMinutes : originalRow.lateMinutes,
            leftEarly: changes.leftEarly !== undefined ? changes.leftEarly : originalRow.leftEarly,
            note: changes.note !== undefined ? changes.note : originalRow.note
         };
      });

      await api.put(`/api/v1/sessions/${sessionId}/attendances`, { items });
      
      // Thành công -> cập nhật lại pageData và reset nháp
      setPageData(prev => {
        if (!prev) return prev;
        const newContent = prev.content.map(row => {
           if (pendingChanges[row.attendanceId]) {
              return { ...row, ...pendingChanges[row.attendanceId] };
           }
           return row;
        });
        return { ...prev, content: newContent };
      });
      
      // Cập nhật thống kê cục bộ lại luôn
      setStats(() => {
         let p = 0, l = 0, a = 0, e = 0;
         pageData.content.forEach(row => {
            const finalStatus = pendingChanges[row.attendanceId]?.uiStatus || row.uiStatus;
            if (finalStatus === 'PRESENT') p++;
            if (finalStatus === 'LATE') l++;
            if (finalStatus === 'ABSENT') a++;
            if (finalStatus === 'EXCUSED') e++;
         });
         return { present: p, late: l, absent: a, excused: e };
      });

      setPendingChanges({});
      toast.success('Lưu thành công!'); // Có thể thay bằng Toast UI nếu có
    } catch (err) {
      showError("Lỗi khi lưu: " + friendlyError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Derived
  const items = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalItems = pageData?.totalElements ?? 0;
  const si = sessionInfo;

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(items.map(i => i.attendanceId));
    else setSelectedIds([]);
  };
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const bulkBtnStyle = (color) => ({
    padding: '5px 12px', borderRadius: 14, border: 'none',
    background: '#fff', color: color, fontSize: 12, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  });

  return (
    <>
      <style>{`
        @keyframes att-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes att-fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .att-badge {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 20px;
          font-size: 11px; font-weight: 500; white-space: nowrap;
        }
        .s-present { background: rgba(34,197,94,.1);  color: var(--gr); }
        .s-late    { background: rgba(245,158,11,.12); color: var(--am); }
        .s-absent  { background: rgba(239,68,68,.1);  color: var(--rd); }
        .s-excused { background: rgba(59,130,246,.1);  color: var(--bl); }
        .att-table-row { animation: att-fadeIn .2s ease both; }
        .att-table-row:hover td { background: var(--bg3) !important; }
        .filter-tab {
          padding: 5px 13px; border-radius: 20px; font-size: 12px; font-weight: 500;
          border: 1px solid var(--bd); background: transparent;
          color: var(--tx3); cursor: pointer; transition: all .15s; white-space: nowrap;
        }
        .filter-tab.active {
          background: var(--bl); color: #fff; border-color: var(--bl);
        }
        .filter-tab:not(.active):hover {
          background: var(--bg3); color: var(--tx);
        }
        .edit-pending td { background: rgba(245,158,11,.06) !important; }
        .edit-done td { background: rgba(34,197,94,.05) !important; }
        .edit-error td { background: rgba(239,68,68,.05) !important; }
        .tbl th { padding: 12px 14px; font-size: 11px; letter-spacing: 0.04em; }
        .tbl td { padding: 12px 14px; }
        
        .floating-save-bar {
           position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
           background: var(--bg); border: 1px solid var(--bd);
           box-shadow: 0 10px 30px rgba(0,0,0,0.15);
           padding: 12px 20px; border-radius: 100px;
           display: flex; align-items: center; gap: 16px;
           z-index: 999; animation: att-fadeIn 0.3s ease;
        }
      `}</style>

      <div className="page active" style={{ animation: 'att-fadeIn .25s ease' }}>

        {/* ── Back button ── */}
        <button
          className="btn btn-s btn-sm"
          style={{ marginBottom: 16, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => navigate(-1)}
        >
          ← Quay lại
        </button>

        {/* ── Session header card ── */}
        <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
          {si ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
                  {si.subjectName ?? '—'}
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 500,
                    color: 'var(--tx3)', verticalAlign: 'middle',
                  }}>
                    Buổi {si.sessionNumber ?? '?'}/{si.totalSessions ?? '?'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {si.className && <span>🏫 {si.className}</span>}
                  {si.sessionDate && (
                    <span>📅 {new Date(si.sessionDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  )}
                  {si.periodStart && <span>⏰ Tiết {si.periodStart}–{si.periodEnd}</span>}
                  {si.roomCode && <span>📍 {si.roomCode}</span>}
                </div>
              </div>

              {/* Stat pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatPill color="var(--gr)" label="Có mặt" value={stats.present} />
                <StatPill color="var(--am)" label="Muộn" value={stats.late} />
                <StatPill color="var(--rd)" label="Vắng" value={stats.absent} />
                <StatPill color="var(--bl)" label="Có phép" value={stats.excused} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton h={16} w="40%" />
              <Skeleton h={12} w="60%" />
            </div>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div className="srch" style={{ flex: '1 1 220px', minWidth: 180 }}>
            <span className="srch-ic">🔍</span>
            <input
              placeholder="Tìm theo tên, MSSV..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(0); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', padding: '0 6px', fontSize: 14 }}
              >×</button>
            )}
          </div>

          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTER_TABS.map((t) => (
              <button
                key={t.value}
                className={`filter-tab${uiStatus === t.value ? ' active' : ''}`}
                onClick={() => handleTabChange(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Total info */}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap' }}>
            {loading ? '...' : `${totalItems} kết quả`}
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            fontSize: 13, color: 'var(--rd)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠️ {error}</span>
            <button
              style={{ fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline' }}
              onClick={() => setRetryCount((c) => c + 1)}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            padding: '12px 18px', background: 'var(--bl)', borderRadius: 10, color: '#fff',
            animation: 'att-fadeIn 0.2s ease', boxShadow: '0 4px 15px rgba(59,130,246,0.3)'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Đã chọn {selectedIds.length}</span>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.4)', margin: '0 4px' }} />
            <button onClick={() => handleBulkUpdate('PRESENT')} style={bulkBtnStyle('#22C55E')}>Có mặt</button>
            <button onClick={() => handleBulkUpdate('LATE')} style={bulkBtnStyle('#F59E0B')}>Muộn</button>
            <button onClick={() => handleBulkUpdate('ABSENT')} style={bulkBtnStyle('#EF4444')}>Vắng</button>
            <button onClick={() => handleBulkUpdate('EXCUSED')} style={bulkBtnStyle('#3B82F6')}>Có phép</button>
            <button 
              onClick={() => setSelectedIds([])} 
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
            >
              Hủy chọn
            </button>
          </div>
        )}

        {/* ── Main table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Skeleton h={12} w={80} />
                  <Skeleton h={12} w={140} />
                  <Skeleton h={12} w={60} />
                  <Skeleton h={12} w={60} />
                  <Skeleton h={12} w={90} />
                  <Skeleton h={22} w={80} radius={20} />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--tx3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13 }}>
                {debouncedSearch || uiStatus
                  ? 'Không tìm thấy sinh viên nào phù hợp.'
                  : 'Chưa có dữ liệu điểm danh cho buổi học này.'}
              </div>
              {(debouncedSearch || uiStatus) && (
                <button
                  className="btn btn-s btn-sm"
                  style={{ marginTop: 12, fontSize: 12 }}
                  onClick={() => { setSearch(''); setDebouncedSearch(''); setUiStatus(''); setPage(0); }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="ast-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="ast-responsive-table tbl" style={{ minWidth: 780, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--bl)' }}
                      />
                    </th>
                    <th style={{ width: 85, whiteSpace: 'nowrap' }}>Mã SV</th>
                    <th>Họ và tên</th>
                    <th style={{ width: 60, textAlign: 'center', whiteSpace: 'nowrap' }}>Đi học</th>
                    <th style={{ width: 60, textAlign: 'center', whiteSpace: 'nowrap' }}>Nghỉ</th>
                    <th style={{ width: 60, textAlign: 'center', whiteSpace: 'nowrap' }}>Muộn</th>
                    <th style={{ width: 140, whiteSpace: 'nowrap' }}>Trạng thái (Hôm nay)</th>
                    <th style={{ width: 110, textAlign: 'center', whiteSpace: 'nowrap' }}>Số phút muộn</th>
                    <th style={{ width: 70, textAlign: 'center', whiteSpace: 'nowrap' }}>Về sớm</th>
                    <th style={{ width: 160, whiteSpace: 'nowrap' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                   {items.map((row, idx) => (
                    <StudentRow 
                       key={row.attendanceId} 
                       row={row} 
                       idx={idx} 
                       pendingData={pendingChanges[row.attendanceId]} 
                       isSelected={selectedIds.includes(row.attendanceId)}
                       onToggleSelect={() => {
                          setSelectedIds(prev => 
                             prev.includes(row.attendanceId) 
                                ? prev.filter(id => id !== row.attendanceId)
                                : [...prev, row.attendanceId]
                          );
                       }}
                       onUpdate={(updates) => handleUpdate(row.attendanceId, updates)} 
                    />
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: '12px 18px 16px', borderTop: '1px solid var(--bd)' }}>
                  <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo(0, 0); }} />
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>
                    Trang {page + 1}/{totalPages} · {totalItems} sinh viên
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thanh lưu (Batch Save Bar) */}
        {Object.keys(pendingChanges).length > 0 && (
          <div className="floating-save-bar">
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>
              Đang có <b style={{ color: 'var(--bl)' }}>{Object.keys(pendingChanges).length}</b> thay đổi chưa lưu
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
               <button 
                  className="btn btn-s" style={{ borderRadius: 20 }}
                  onClick={() => setPendingChanges({})}
                  disabled={isSaving}
               >
                 Hủy bỏ
               </button>
               <button 
                  className="btn btn-p" style={{ borderRadius: 20, minWidth: 100 }}
                  onClick={handleBatchSave}
                  disabled={isSaving}
               >
                 {isSaving ? 'Đang lưu...' : 'Lưu tất cả'}
               </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

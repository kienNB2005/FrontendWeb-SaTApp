import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

// Map error codes từ server sang tiếng Việt
function friendlyError(err) {
  const code = err?.response?.data?.code ?? '';
  const msg = err?.response?.data?.message ?? err?.message ?? '';
  const map = {
    CLASS_SESSION_NOT_FOUND: 'Không tìm thấy buổi học.',
    SESSION_ALREADY_OPEN: 'Buổi học đã được mở trước đó.',
    INVALID_SESSION_STATUS: 'Trạng thái buổi học không hợp lệ.',
    NO_PERMISSION_ON_SESSION: 'Bạn không có quyền thao tác trên buổi học này.',
    MAKEUP_DATE_BEFORE_ORIGINAL: 'Ngày dạy bù phải từ ngày có buổi học gốc trở đi.',
    MAKEUP_DATE_AFTER_SEMESTER: 'Ngày dạy bù phải trước ngày kết thúc học kỳ.',
    CANCEL_TOO_LATE: 'Chỉ được gửi yêu cầu hủy buổi học trước giờ học tối thiểu 15 phút.',
  };
  return map[code] || map[msg] || msg || 'Có lỗi xảy ra, vui lòng thử lại.';
}

// Component hiển thị Badge trạng thái chuẩn hóa
function StatusBadge({ status }) {
  const s = (status ?? "").toLowerCase();
  const map = {
    closed: { label: 'Đã xong', cls: 'bdg b-cl' },
    open: { label: 'Đang mở', cls: 'bdg b-op' },
    scheduled: { label: 'Sắp tới', cls: 'bdg b-sc' },
    cancelled: { label: 'Đã hủy', cls: 'bdg b-ca' },
  };
  const { label, cls } = map[s] ?? { label: status, cls: 'bdg' };
  return <span className={cls}>{label}</span>;
}

// Component tính toán tỉ lệ chuyên cần: Present / Total (Present đã bao gồm Late)
function AttendanceCell({ present, late, total }) {
  if (total == null || total === 0) return <span style={{ color: 'var(--tx3)' }}>0/0</span>;

  const attended = present || 0;
  const pct = Math.round((attended / total) * 100);
  const color = pct >= 80 ? 'var(--gr)' : pct >= 60 ? 'var(--am)' : '#ef4444';

  return (
    <>
      <span style={{ color: 'var(--gr)', fontWeight: 600 }}>{attended}/{total}</span>{' '}
      <span style={{ color, fontSize: '11px' }}>({pct}%)</span>
    </>
  );
}

export default function Sessions() {
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initClassName = searchParams.get('className');
  const initSubjectName = searchParams.get('subjectName');

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // States cho Hủy buổi
  const [cancelModalSessionId, setCancelModalSessionId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // States cho Lên lịch dạy bù
  const [makeupModalSessionId, setMakeupModalSessionId] = useState(null);
  const [makeupForm, setMakeupForm] = useState({
    sessionDate: "",
    periodStart: 1,
    periodEnd: 3,
    roomId: ""
  });
  const [availableRooms, setAvailableRooms] = useState([]);

  // States cho gợi ý lịch dạy bù
  // const [showSuggestions, setShowSuggestions] = useState(false);
  // const [suggestions, setSuggestions] = useState([]);
  // const [loadingSuggestions, setLoadingSuggestions] = useState(false);


  // Fetch phòng học trống khi thông tin thời gian hợp lệ
  useEffect(() => {
    if (makeupModalSessionId && makeupForm.sessionDate && makeupForm.periodStart && makeupForm.periodEnd && makeupForm.periodEnd >= makeupForm.periodStart) {
      api.get("/api/v1/rooms/available", {
        params: {
          sessionDate: makeupForm.sessionDate,
          periodStart: makeupForm.periodStart,
          periodEnd: makeupForm.periodEnd
        }
      }).then(res => {
        const list = res.data?.result ?? res.data?.data ?? res.data ?? [];
        setAvailableRooms(list);
        if (list.length > 0 && !list.find(r => String(r.id) === String(makeupForm.roomId))) {
          setMakeupForm(prev => ({ ...prev, roomId: list[0].id }));
        }
      }).catch(err => {
        setAvailableRooms([]);
      });
    } else {
      setAvailableRooms([]);
    }
  }, [makeupModalSessionId, makeupForm.sessionDate, makeupForm.periodStart, makeupForm.periodEnd]);

  // Load danh sách lớp hành chính
  useEffect(() => {
    api.get('/api/v1/administrative-classes/filter-by-session')
      .then(({ data }) => {
        const list = data.result ?? data.data ?? data;
        setClasses(list);
        if (list.length > 0) {
          let found = null;
          if (initClassName) {
            found = list.find(c => c.code === initClassName || c.name === initClassName);
          }
          setSelectedClass(found || list[0]);
        }
      })
      .catch(() => setError('Không thể tải danh sách lớp.'));
  }, [initClassName]);

  // Load môn học khi đổi lớp
  useEffect(() => {
    if (!selectedClass) return;
    setSubjects([]);
    setSelectedSubject(null);
    api.get('/api/v1/subjects/filter-by-session', { params: { adminClassId: selectedClass.id } })
      .then(({ data }) => {
        const list = data.result ?? data.data ?? data;
        setSubjects(list);
        if (list.length > 0) {
          let found = null;
          if (initSubjectName && (selectedClass.code === initClassName || selectedClass.name === initClassName)) {
            found = list.find(s => s.name === initSubjectName || s.code === initSubjectName);
          }
          setSelectedSubject(found || list[0]);
        }
      })
      .catch(() => setError('Không thể tải danh sách môn học.'));
  }, [selectedClass, initClassName, initSubjectName]);

  // Load danh sách buổi học
  const loadSessions = useCallback(() => {
    if (!selectedClass || !selectedSubject) return;
    setLoading(true);
    setError(null);
    api.get('/api/v1/sessions', {
      params: { adminClassId: selectedClass.id, subjectId: selectedSubject.id }
    })
      .then(({ data }) => {
        const list = data.result ?? data.data ?? data;
        setSessions(list);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject, retryCount]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Thống kê tiến độ
  const totalSessions = sessions[0]?.totalSessions ?? sessions.length;
  const doneSessions = sessions.filter((s) => {
    const st = s.status?.toLowerCase();
    return st === 'closed' ;
  }).length;

  // Xử lý Mở buổi học
  async function handleOpen(sessionId) {
    setActionLoading(sessionId);
    try {
      await api.patch(`/api/v1/sessions/${sessionId}/status`, { status: "OPEN" });
      await loadSessions();
      navigate(`/qr?sessionId=${sessionId}`);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setActionLoading(null);
    }
  }

  // Xử lý Đóng buổi học
  async function handleClose(sessionId) {
    if (!(await confirm('Bạn có chắc muốn kết thúc buổi học này?'))) return;
    setActionLoading(sessionId);
    try {
      await api.patch(`/api/v1/sessions/${sessionId}/status`, { status: "CLOSED" });
      loadSessions();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function submitCancel() {
    if (cancelReason.trim().length < 5) return toast.error("Lý do hủy buổi học quá ngắn.");
    try {
      await api.post(`/api/v1/session-requests/${cancelModalSessionId}/cancel`, { cancelReason: cancelReason });
      setCancelModalSessionId(null);
      setCancelReason("");
      toast.success("Đã gửi yêu cầu hủy buổi, vui lòng chờ Admin duyệt.");
      loadSessions();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  // const fetchSuggestions = useCallback(async (sessionId) => {
  //   setLoadingSuggestions(true);
  //   try {
  //     const res = await api.get(`/api/v1/sessions/${sessionId}/suggested-slots`);
  //     const list = res.data?.result ?? res.data?.data ?? res.data ?? [];
  //     setSuggestions(list);
  //   } catch (err) {
  //     console.error("Lỗi lấy danh sách gợi ý:", err);
  //     setSuggestions([]);
  //   } finally {
  //     setLoadingSuggestions(false);
  //   }
  // }, []);

  async function submitMakeup() {
    if (!makeupForm.sessionDate) return toast.error("Vui lòng chọn ngày dạy bù.");
    if (selectedSessionForMakeup) {
      const selectedDate = makeupForm.sessionDate;
      const originalDate = selectedSessionForMakeup.sessionDate;
      const endDate = selectedSessionForMakeup.semesterEndDate;
      
      if (selectedDate < originalDate) {
        return toast.error("Ngày dạy bù phải từ ngày có buổi học gốc trở đi.");
      }
      if (endDate && selectedDate >= endDate) {
        return toast.error("Ngày dạy bù phải diễn ra trước ngày kết thúc học kỳ.");
      }
    }
    if (!makeupForm.roomId) return toast.error("Vui lòng chọn phòng học trống.");
    try {
      await api.post(`/api/v1/session-requests/${makeupModalSessionId}/makeup`, makeupForm);
      setMakeupModalSessionId(null);
      toast.success("Đã gửi yêu cầu tạo lịch dạy bù, vui lòng chờ Admin duyệt.");
      loadSessions();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  function renderActions(session) {
    const sId = session.id || session.classSessionId;
    const status = session.status?.toLowerCase();
    const busy = actionLoading === sId;
    const hasOpen = sessions.some((s) => s.status?.toLowerCase() === 'open');
    const hasMakeup = session.activeMakeupCount > 0;

    const btnStyle = { width: '100px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '4px' };
    const fullBtnStyle = { width: '208px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '4px' };

    switch (status) {
      case 'closed':
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-s btn-sm" 
              style={fullBtnStyle}
              onClick={() => navigate(`/sessions/${sId}/attendances`)}
            >
              📋 Chi tiết điểm danh
            </button>
          </div>
        );
      case 'cancelled':
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            {!hasMakeup && !session.makeupForId ? (
              <button 
                className="btn btn-a btn-sm" 
                style={btnStyle}
                onClick={() => {
                  setMakeupModalSessionId(sId);
                  setMakeupForm({
                    sessionDate: session.sessionDate || "",
                    periodStart: session.periodStart || 1,
                    periodEnd: session.periodEnd || 3,
                    roomId: ""
                  });
                }}
              >
                📅 Dạy bù
              </button>
            ) : (
              <span style={{ color: 'var(--tx3)', fontSize: '11px', fontStyle: 'italic', lineHeight: '24px', paddingLeft: '4px' }}>
                {hasMakeup ? 'Đã lên lịch bù' : 'Buổi dạy bù'}
              </span>
            )}
          </div>
        );
      case 'open':
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-p btn-sm" 
              style={btnStyle}
              onClick={() => navigate(`/qr?sessionId=${sId}`)}
            >
              📱 Xem QR
            </button>
            <button
              className="btn btn-d btn-sm"
              style={btnStyle}
              disabled={busy}
              onClick={() => handleClose(sId)}
            >
              {busy ? '...' : '⏹️ Kết thúc'}
            </button>
          </div>
        );
      case 'scheduled':
      default:
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-p btn-sm"
              disabled={busy || hasOpen}
              style={{
                ...btnStyle,
                ...(hasOpen ? { opacity: 0.5, cursor: 'not-allowed' } : {})
              }}
              onClick={() => {
                if (hasOpen) {
                  toast.error('Vui lòng kết thúc buổi học đang mở trước khi thao tác!');
                } else {
                  handleOpen(sId);
                }
              }}
            >
              {busy ? '...' : '▶ Mã QR'}
            </button>
            <button
              className="btn btn-d btn-sm"
              style={btnStyle}
              disabled={busy || hasOpen}
              onClick={() => setCancelModalSessionId(sId)}
            >
              ❌ Hủy
            </button>
          </div>
        );
    }
  }

  const selectedSessionForMakeup = sessions.find(s => String(s.id || s.classSessionId) === String(makeupModalSessionId));
  
  let maxDate = "";
  if (selectedSessionForMakeup?.semesterEndDate) {
    // Tách chuỗi YYYY-MM-DD để tránh lệch múi giờ khi parse Date mặc định
    const parts = selectedSessionForMakeup.semesterEndDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const end = new Date(year, month - 1, day); // Tạo date local
      end.setDate(end.getDate() - 1); // Trừ đi 1 ngày (nhỏ hơn ngày kết thúc học kỳ)
      
      const y = end.getFullYear();
      const m = String(end.getMonth() + 1).padStart(2, '0');
      const d = String(end.getDate()).padStart(2, '0');
      maxDate = `${y}-${m}-${d}`;
    }
  }

  return (
    <div className="page active">
      {/* Filters & Stats */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--tx3)', fontWeight: '600' }}>Lớp hành chính</label>
          <select
            className="fi" style={{ width: '160px' }}
            value={selectedClass?.id ?? ''}
            onChange={(e) => setSelectedClass(classes.find(c => String(c.id) === e.target.value))}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--tx3)', fontWeight: '600' }}>Môn học</label>
          <select
            className="fi" style={{ width: '200px' }}
            value={selectedSubject?.id ?? ''}
            onChange={(e) => setSelectedSubject(subjects.find(s => String(s.id) === e.target.value))}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ color: 'var(--tx3)', fontSize: '12px' }}>Tiến độ học phần</div>
          <div style={{ fontWeight: '600', fontSize: '13px' }}>
            {totalSessions} buổi · <span style={{ color: 'var(--gr)' }}>{doneSessions} đã xong</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="err-banner" style={{ color: '#ef4444', marginBottom: 16 }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setRetryCount(c => c + 1)}>Thử lại</button>
        </div>
      )}

      {/* Main Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state">Đang tải...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">Không có buổi học nào được tìm thấy.</div>
        ) : (
          <div className="ast-table-wrap">
            <table className="ast-responsive-table">
              <thead>
                <tr>
                  <th>Buổi</th>
                  <th>Ngày</th>
                  <th>Tiết</th>
                  <th>Phòng</th>
                  <th>Sĩ số</th>
                  <th>Muộn</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const status = s.status?.toLowerCase();
                  const isUpcoming = status === 'scheduled';
                  const isOpen = status === 'open';
                  const isMakeup = s.makeupForId != null;

                  return (
                    <tr key={s.id || s.classSessionId} style={isOpen ? { background: 'rgba(34,197,94,.03)' } : {}}>
                      <td data-label="Buổi" style={{ fontWeight: 600, color: isOpen ? 'var(--gr)' : undefined, opacity: status === 'cancelled' && !isMakeup ? 0.5 : 1 }}>
                        {isMakeup ? `Bù buổi ${s.sessionNumber}` : `${s.sessionNumber}/${totalSessions}`}
                      </td>
                      <td data-label="Ngày">
                        {s.sessionDate ? new Date(s.sessionDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td data-label="Tiết">{s.periodStart}–{s.periodEnd}</td>
                      <td data-label="Phòng">{s.roomCode}</td>
                      <td data-label="Sĩ số">
                        {isUpcoming ? '—' : (
                          <AttendanceCell
                            present={s.presentCount}
                            late={s.lateCount}
                            total={s.totalCount || s.totalStudents}
                          />
                        )}
                      </td>
                      <td data-label="Muộn" style={{ color: s.lateCount > 0 ? 'var(--am)' : 'var(--tx3)' }}>
                        {isUpcoming ? '—' : (s.lateCount ?? 0)}
                      </td>
                      <td data-label="Trạng thái"><StatusBadge status={s.status} /></td>
                      <td className="ast-action-cell" style={{ width: '210px', minWidth: '210px' }}>{renderActions(s)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Hủy Buổi Học */}
      {cancelModalSessionId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Hủy buổi học</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Lý do hủy (bắt buộc)</label>
              <textarea 
                className="fi" 
                style={{ width: '100%', minHeight: '80px', padding: '10px' }} 
                placeholder="Nhập lý do hủy buổi..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-s" onClick={() => setCancelModalSessionId(null)}>Đóng</button>
              <button className="btn btn-p" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={submitCancel}>Xác nhận Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dạy Bù */}
      {makeupModalSessionId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ 
            background: 'var(--bg2)', 
            padding: '24px', 
            borderRadius: '12px', 
            width: '400px', 
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transition: 'width 0.3s ease, max-width 0.3s ease',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Lên lịch dạy bù</h3>
              {/* <button 
                className="btn btn-s btn-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--bd2)' }}
                onClick={() => {
                  setShowSuggestions(!showSuggestions);
                  if (!showSuggestions && suggestions.length === 0) {
                    fetchSuggestions(makeupModalSessionId);
                  }
                }}
              >
                {showSuggestions ? 'Ẩn gợi ý' : '💡 Gợi ý lịch rảnh'}
              </button> */}
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
              {/* Cột trái: Form nhập tay */}
              <div style={{ width: '352px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Ngày dạy bù</label>
                  <input 
                    type="date" 
                    className="fi" 
                    style={{ width: '100%' }} 
                    min={selectedSessionForMakeup?.sessionDate || ""}
                    max={maxDate}
                    value={makeupForm.sessionDate} 
                    onChange={e => setMakeupForm(p => ({...p, sessionDate: e.target.value}))} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Từ tiết</label>
                    <select className="fi" style={{ width: '100%' }} value={makeupForm.periodStart} onChange={e => setMakeupForm(p => ({...p, periodStart: Number(e.target.value)}))}>
                      {Array.from({length: 15}, (_, i) => i + 1).map(i => <option key={i} value={i}>Tiết {i}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Đến tiết</label>
                    <select className="fi" style={{ width: '100%' }} value={makeupForm.periodEnd} onChange={e => setMakeupForm(p => ({...p, periodEnd: Number(e.target.value)}))}>
                      {Array.from({length: 15}, (_, i) => i + 1).map(i => <option key={i} value={i}>Tiết {i}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>Phòng học</label>
                  <select 
                    className="fi" 
                    style={{ width: '100%' }} 
                    value={makeupForm.roomId} 
                    onChange={e => setMakeupForm(p => ({...p, roomId: e.target.value}))}
                    disabled={availableRooms.length === 0}
                  >
                    {availableRooms.length === 0 
                      ? <option value="">(Chọn ngày & giờ hợp lệ để tìm phòng)</option>
                      : availableRooms.map(r => <option key={r.id || r.value} value={r.id || r.value}>{r.name || (r.code + (r.building ? " - " + r.building : "")) || r.label}</option>)
                    }
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '16px' }}>
                  <button className="btn btn-s" onClick={() => setMakeupModalSessionId(null)}>Đóng</button>
                  <button className="btn btn-p" onClick={submitMakeup}>Xác nhận Lên lịch</button>
                </div>
              </div>

              {/* Đường chia giữa */}
              {/* {showSuggestions && <div style={{ width: '1px', background: 'var(--bd)', alignSelf: 'stretch' }} />} */}

              {/* Cột phải: Danh sách gợi ý */}
              {/* {showSuggestions && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--tx)', fontWeight: 600 }}>
                    💡 Lịch rảnh gợi ý (14 ngày tới)
                  </h4>
                  
                  <div className="suggest-list">
                    {loadingSuggestions ? (
                      <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--tx3)' }}>
                        Đang phân tích lịch rảnh...
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--tx3)', fontSize: '13px' }}>
                        Không có lịch rảnh nào phù hợp trong 14 ngày tới.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {suggestions.map((sug, idx) => {
                          const isSelected = makeupForm.sessionDate === sug.sessionDate && 
                                             makeupForm.periodStart === sug.periodStart && 
                                             makeupForm.periodEnd === sug.periodEnd;
                          return (
                            <div 
                              key={idx} 
                              className={`suggest-card ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                setMakeupForm({
                                  sessionDate: sug.sessionDate,
                                  periodStart: sug.periodStart,
                                  periodEnd: sug.periodEnd,
                                  roomId: sug.availableRooms.length > 0 ? sug.availableRooms[0].id : ""
                                });
                                if (sug.availableRooms.length > 0) {
                                  setAvailableRooms(sug.availableRooms);
                                }
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--tx)', fontSize: '13px' }}>
                                  {sug.dayOfWeek}, {sug.sessionDate ? new Date(sug.sessionDate).toLocaleDateString('vi-VN') : ''}
                                </span>
                                <span style={{ fontSize: '11px', background: 'var(--blL)', color: 'var(--bl)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  Tiết {sug.periodStart}–{sug.periodEnd}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>
                                Gợi ý phòng: <span style={{ color: 'var(--gr)', fontWeight: 500 }}>
                                  {sug.availableRooms.map(r => r.code).slice(0, 3).join(', ')}
                                  {sug.availableRooms.length > 3 ? '...' : ''}
                                </span> ({sug.availableRooms.length} phòng trống)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

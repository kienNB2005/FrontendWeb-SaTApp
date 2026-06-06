import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Loader2 } from 'lucide-react';

export default function Tkb() {
  const [viewMode, setViewMode] = useState('week'); // 'today' | 'week'
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [maxWeek, setMaxWeek] = useState(15);
  
  const [allSemesterData, setAllSemesterData] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [semesterStartDate, setSemesterStartDate] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [activeSemesterStartWeek, setActiveSemesterStartWeek] = useState(1);

  const allDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  
  const currentDayNum = new Date().getDay(); 
  const todayStr = currentDayNum === 0 ? 'Chủ Nhật' : `Thứ ${currentDayNum + 1}`;
  
  const displayDays = viewMode === 'today' ? [todayStr] : allDays;

  const periods = [
    { label: 'Sáng (T.1-3)', key: '1-3' },
    { label: 'Sáng (T.4-6)', key: '4-6' },
    { label: 'Chiều (T.7-9)', key: '7-9' },
    { label: 'Chiều (T.10-12)', key: '10-12' },
    { label: 'Tối (T.13-15)', key: '13-15' },
  ];

  const colors = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899'];
  const getSubjectColor = (subjectName) => {
    if (!subjectName) return colors[0];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  // 1. Initial Load: Get Semester config and Full schedule
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch active semester to calculate current week
        const semRes = await api.get('/api/v1/semesters');
        const activeSem = semRes.data.result.find(s => s.isActive);
        let calcCurrentWeek = 1;
        
        if (activeSem && activeSem.startDate) {
          setActiveSemesterId(activeSem.id);
          setSemesterStartDate(activeSem.startDate);
          setActiveSemesterStartWeek(activeSem.startWeek || 1);
          const start = new Date(activeSem.startDate);
          // Đưa về đầu ngày để tính khoảng cách chính xác
          start.setHours(0,0,0,0);
          const now = new Date();
          now.setHours(0,0,0,0);
          
          const diffTime = now - start;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          // Tính toán tuần hiện tại theo lịch thực tế (có thể <= 0 nếu chưa bắt đầu)
          const actualWeek = Math.floor(diffDays / 7) + (activeSem.startWeek || 1);
          calcCurrentWeek = actualWeek;
        }
        
        setCurrentWeek(calcCurrentWeek);
        
        // Mặc định hiển thị tuần học:
        // - Nếu đã bắt đầu học kỳ: hiển thị tuần hiện tại.
        // - Nếu chưa bắt đầu học kỳ: hiển thị tuần đầu tiên (startWeek).
        const startW = activeSem?.startWeek || 1;
        if (calcCurrentWeek >= startW) {
          setSelectedWeek(calcCurrentWeek);
        } else {
          setSelectedWeek(startW);
        }

        // Fetch full semester schedule to determine maxWeek and cache data
        const schedRes = await api.get('/api/v1/schedules/me?size=1000');
        const schedules = schedRes.data.result.content || [];
        setAllSemesterData(schedules); console.log('ALL SCHEDULES:', schedules);
        
        let mWeek = 15;
        schedules.forEach(s => {
          if (s.weekEnd > mWeek) mWeek = s.weekEnd;
        });
        setMaxWeek(mWeek);
        
      } catch (err) {
        console.error("Lỗi khởi tạo TKB:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Fetch specific data when viewMode or selectedWeek changes
  useEffect(() => {
    if (allSemesterData.length === 0 && loading) return; // wait for init
    
    const fetchModeData = async () => {
      setLoading(true);
      setScheduleData({});
      try {
        if (viewMode === 'today') {
          // Dashboard today
          const res = await api.get('/api/v1/lecturers/me/dashboard');
          transformSchedule(res.data.todaySessions, 'today');
        } 
        else if (viewMode === 'week') {
          if (selectedWeek === currentWeek) {
            // Real-time current week sessions (with status, makeup)
            const res = await api.get('/api/v1/lecturers/me/dashboard');
            transformSchedule(res.data.weekSessions, 'week_realtime');
          } else {
            // Fetch actual database sessions for the selected week
            if (activeSemesterId) {
              const res = await api.get(`/api/v1/sessions/weekly?semesterId=${activeSemesterId}&weekNumber=${selectedWeek}`);
              transformSchedule(res.data.result, 'week_realtime');
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải lịch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchModeData();
  }, [viewMode, selectedWeek, currentWeek, allSemesterData, activeSemesterId]);

  const transformSchedule = (data, mode) => {
    const newSchedule = {};
    if (!data) return;
    
    data.forEach(item => {
      let dayOfW = item.dayOfWeek;
      if (!dayOfW && item.sessionDate) {
        const d = new Date(item.sessionDate);
        dayOfW = d.getDay() === 0 ? 8 : d.getDay() + 1;
      }
      const dayStr = dayOfW === 8 ? 'Chủ Nhật' : `Thứ ${dayOfW}`;
      
      let pKey = null;
      if (item.periodStart >= 1 && item.periodStart <= 3) pKey = '1-3';
      else if (item.periodStart >= 4 && item.periodStart <= 6) pKey = '4-6';
      else if (item.periodStart >= 7 && item.periodStart <= 9) pKey = '7-9';
      else if (item.periodStart >= 10 && item.periodStart <= 12) pKey = '10-12';
      else if (item.periodStart >= 13 && item.periodStart <= 15) pKey = '13-15';
      else pKey = `${item.periodStart}-${item.periodEnd}`; 
      
      const key = `${dayStr}_${pKey}`;
      if (!newSchedule[key]) newSchedule[key] = [];
      
      let startW = item.weekStart;
      let endW = item.weekEnd;
      
      // Fallback: Nếu data từ Dashboard (VLecturerWeek) không có weekStart, tìm trong lịch gốc
      if (!startW && allSemesterData.length > 0) {
        const match = allSemesterData.find(s => 
          s.subjectName === item.subjectName && 
          s.dayOfWeek === item.dayOfWeek &&
          s.periodStart === item.periodStart
        );
        if (match) {
          startW = match.weekStart;
          endW = match.weekEnd;
        }
      }
      
      newSchedule[key].push({
        id: item.id || item.classSessionId || Math.random(),
        subject: item.subjectName,
        class: item.adminClassName || item.className,
        room: item.roomCode,
        color: getSubjectColor(item.subjectName),
        startWeek: startW,
        endWeek: endW,
        sessionDate: item.sessionDate,
        status: item.status,
        sessionNumber: item.sessionNumber,
        makeupForId: item.makeupForId,
        originalSessionDate: item.originalSessionDate,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        dayOfWeek: dayOfW,
        isTheoretical: mode === 'week_theoretical'
      });
    });
    setScheduleData(newSchedule);
  };

  // Generate week options
  const weekOptions = [];
  const sWeek = activeSemesterStartWeek || 1;
  const mWeek = maxWeek >= sWeek ? maxWeek : sWeek;
  for (let i = sWeek; i <= mWeek; i++) {
    weekOptions.push(
      <option key={i} value={i}>
        {i === currentWeek ? `Tuần hiện tại ( ${i} )` : `Tuần ${i}`}
      </option>
    );
  }

  return (
    <div className="page active">
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--tx3)', fontWeight: '600' }}>Học kỳ hiện tại</label>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--tx)' }}>
            Thời Khóa Biểu Giảng Viên
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
          {viewMode === 'week' && (
            <select 
              value={selectedWeek} 
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
            >
              {weekOptions}
            </select>
          )}

          <div style={{ display: 'flex', background: 'var(--bg3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--bd)' }}>
            <button style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: viewMode === 'today' ? 'var(--bg)' : 'transparent', color: viewMode === 'today' ? 'var(--tx)' : 'var(--tx3)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: viewMode === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: '0.2s' }} onClick={() => setViewMode('today')}>Hôm nay</button>
            <button style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: viewMode === 'week' ? 'var(--bg)' : 'transparent', color: viewMode === 'week' ? 'var(--tx)' : 'var(--tx3)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: '0.2s' }} onClick={() => setViewMode('week')}>Lịch theo tuần</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflowX: 'auto', borderRadius: '12px', minHeight: '400px', position: 'relative' }}>
        {loading ? (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', zIndex: 10 }}>
            <Loader2 className="spinner" size={24} color="var(--bl)" />
            <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--tx3)', fontWeight: '500' }}>Đang tải thời khóa biểu...</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: viewMode !== 'today' ? '900px' : 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th style={{ padding: '16px 12px', borderBottom: '1px solid var(--bd)', textAlign: 'left', width: '100px', color: 'var(--tx3)', fontSize: '12px', fontWeight: '600' }}>Ca học</th>
                {displayDays.map(d => (
                  <th key={d} style={{ padding: '16px 12px', borderBottom: '1px solid var(--bd)', borderLeft: '1px solid var(--bd)', textAlign: 'center', width: viewMode !== 'today' ? '15%' : 'auto', color: 'var(--tx3)', fontSize: '12px', fontWeight: '600' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, idx) => (
                <React.Fragment key={p.key}>
                  <tr>
                    <td style={{ padding: '15px 10px', borderBottom: '1px solid var(--bd)', fontWeight: '600', fontSize: '12px', color: 'var(--tx3)', verticalAlign: 'top', background: 'var(--bg3)' }}>
                      {p.label}
                    </td>
                    {displayDays.map(d => {
                      const classes = scheduleData[`${d}_${p.key}`] || [];
                      return (
                        <td key={`${d}_${p.key}`} style={{ padding: '8px', borderBottom: '1px solid var(--bd)', borderLeft: '1px solid var(--bd)', verticalAlign: 'top', height: '120px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                            {classes.map(cls => (
                              <div 
                                key={cls.id}
                                onMouseEnter={() => setHoveredId(cls.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{ position: 'relative', zIndex: hoveredId === cls.id ? 50 : 1, background: `${cls.color}15`, borderLeft: `4px solid ${cls.color}`, padding: '12px', borderRadius: '6px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', transform: hoveredId === cls.id ? 'translateY(-2px)' : 'none', boxShadow: hoveredId === cls.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}
                              >
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--tx)' }}>{cls.subject}</div>
                                <div style={{ fontSize: '11px', color: 'var(--tx3)', marginTop: '4px' }}>{cls.class}</div>
                                {viewMode === 'week' && cls.startWeek && cls.endWeek && (
                                  <div style={{ fontSize: '11px', color: 'var(--tx3)', marginTop: '4px', fontWeight: '500' }}>Tuần {cls.startWeek} - {cls.endWeek}</div>
                                )}
                                
                                {hoveredId === cls.id && (
                                  <div style={{
                                    position: 'absolute',
                                    ...(idx >= 2 ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
                                    left: '50%', transform: 'translateX(-50%)',
                                    background: 'var(--bg)', border: '1px solid var(--bd)',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    padding: '16px', borderRadius: '10px',
                                    width: 'max-content', minWidth: '220px',
                                    display: 'flex', flexDirection: 'column', gap: '8px',
                                    pointerEvents: 'none'
                                  }}>
                                    <div style={{ fontWeight: '700', color: 'var(--tx)', borderBottom: '1px solid var(--bd)', paddingBottom: '8px', marginBottom: '4px', fontSize: '14px' }}>
                                      Thông tin chi tiết
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Môn: <strong style={{color: 'var(--tx)'}}>{cls.subject}</strong></div>
                                    <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Lớp: <strong style={{color: 'var(--tx)'}}>{cls.class}</strong></div>
                                    <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Phòng học: <strong style={{color: 'var(--tx)'}}>{cls.room}</strong></div>
                                    
                                    {cls.startWeek && cls.endWeek && (
                                      <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Tuần học: <strong style={{color: 'var(--tx)'}}>Tuần {cls.startWeek} – {cls.endWeek}</strong></div>
                                    )}
                                    
                                    {!cls.isTheoretical && (
                                      <>
                                        <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Ngày học: <strong style={{color: 'var(--tx)'}}>{formatDate(cls.sessionDate)}</strong></div>
                                        <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Tiết học: <strong style={{color: 'var(--tx)'}}>{cls.periodStart} – {cls.periodEnd}</strong></div>
                                        <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Trạng thái: <strong style={{color: cls.status === 'scheduled' ? 'var(--tx)' : cls.status === 'open' ? '#22C55E' : cls.status === 'closed' ? '#3B82F6' : cls.status === 'cancelled' ? '#EF4444' : '#EF4444'}}>{cls.status === 'scheduled' ? 'Sắp học' : cls.status === 'open' ? 'Đang mở' : cls.status === 'closed' ? 'Đã hoàn thành' : 'Đã hủy'}</strong></div>
                                      </>
                                    )}

                                    {cls.isTheoretical && (
                                      <>
                                        {semesterStartDate && (
                                          <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Ngày học: <strong style={{color: 'var(--tx)'}}>{
                                            formatDate(new Date(new Date(semesterStartDate).setHours(0,0,0,0) + ((selectedWeek - (activeSemesterStartWeek || 1)) * 7 + (cls.dayOfWeek === 8 ? 6 : cls.dayOfWeek - 2)) * 24 * 60 * 60 * 1000))
                                          }</strong></div>
                                        )}
                                        <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Tiết học: <strong style={{color: 'var(--tx)'}}>{cls.periodStart} – {cls.periodEnd}</strong></div>
                                        <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>Trạng thái: <strong style={{color: 'var(--tx)'}}>Theo kế hoạch</strong></div>
                                      </>
                                    )}

                                    {cls.makeupForId && (
                                      <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#D97706', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }}></div>
                                        Buổi học bù cho ngày {formatDate(cls.originalSessionDate)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {idx === 1 && (
                    <tr>
                      <td colSpan={displayDays.length + 1} style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--bd)', textAlign: 'center', fontSize: '11px', color: 'var(--tx3)', fontWeight: '600', letterSpacing: '6px' }}>
                        NGHỈ TRƯA
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

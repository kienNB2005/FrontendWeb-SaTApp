import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import api from '../utils/api';
import '../css/Dashboard.css';

function dayLabel(dow) {
  const map = {
    1: 'CN',
    2: 'T2',
    3: 'T3',
    4: 'T4',
    5: 'T5',
    6: 'T6',
    7: 'T7',
    8: 'CN',
  };

  return map[dow] ?? '?';
}

function statusBadge(status) {
  const config = {
    open: { label: 'Đang mở', cls: 'bdg b-op' },
    closed: { label: 'Xong', cls: 'bdg b-cl' },
    scheduled: { label: 'Sắp tới', cls: 'bdg b-sc' },
    cancelled: { label: 'Huỷ', cls: 'bdg b-ca' },
  };

  const key = (status ?? '').toLowerCase();
  const { label, cls } = config[key] ?? { label: status, cls: 'bdg' };

  return <span className={cls}>{label}</span>;
}

function friendlyError(err) {
  const message = err?.response?.data?.message || err?.message || '';
  const code = err?.response?.data?.code || '';

  const map = {
    CLASS_SESSION_NOT_FOUND: 'Không tìm thấy buổi học.',
    SESSION_ALREADY_OPEN: 'Buổi học đã được mở trước đó.',
    INVALID_SESSION_STATUS:
      'Trạng thái buổi học không hợp lệ để thực hiện thao tác này.',
    NO_PERMISSION_ON_SESSION: 'Bạn không có quyền thao tác trên buổi học này.',
    CHECKOUT_ALREADY_ACTIVE: 'Check-out đã được kích hoạt rồi.',
  };

  return map[code] || map[message] || message || 'Có lỗi xảy ra, vui lòng thử lại.';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      setLoading(true);
      setError(null);
    });

    const params = selectedSemesterId ? { semesterId: selectedSemesterId } : {};

    api
      .get('/api/v1/lecturers/me/dashboard', {
        params,
        signal: controller.signal,
      })
      .then((res) => {
        const json = res.data;

        setData(json);

        if (semesters.length === 0 && json.semesterSummary?.semesterId) {
          setSemesters([
            {
              id: json.semesterSummary.semesterId,
              name: json.semesterSummary.semesterName ?? 'Học kỳ hiện tại',
            },
          ]);
        }

        // Tự động chuyển hướng sang trang QR nếu có BẤT KỲ buổi học nào đang mở và không phải click từ Sidebar
        if (!location.state?.fromSidebar) {
          const allSessions = [...(json.todaySessions || []), ...(json.weekSessions || [])];
          const openSession = allSessions.find(s => s.status?.toLowerCase() === 'open');
          if (openSession) {
            navigate(`/qr?sessionId=${openSession.classSessionId}`, { replace: true });
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError' || err.name === 'CanceledError') return;

        setError(
          friendlyError(err) ||
            err.response?.data?.message ||
            err.message ||
            'Không thể tải dữ liệu.'
        );
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedSemesterId, retryCount, semesters.length]);

  const summary = data?.semesterSummary ?? null;
  const todaySessions = data?.todaySessions ?? [];
  const weekSessions = data?.weekSessions ?? [];
  const progress = data?.progress ?? [];

  return (
    <div className="page active">
      <DashboardHeader
        semesters={semesters}
        selectedSemesterId={selectedSemesterId}
        setSelectedSemesterId={setSelectedSemesterId}
      />

      {error && (
        <ErrorBanner
          error={error}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      )}

      <SummaryCards summary={summary} loading={loading} />

      <div className="g2">
        <div>
          <TodaySessions
            sessions={todaySessions}
            loading={loading}
            navigate={navigate}
          />

          <SemesterProgress
            progress={progress}
            loading={loading}
            navigate={navigate}
          />
        </div>

        <div>
          <WeekSchedule sessions={weekSessions} loading={loading} />
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({ semesters, selectedSemesterId, setSelectedSemesterId }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
      <div>
        <div className="tb-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          Tổng quan Giảng dạy
        </div>
        <div className="tb-sub">
          Theo dõi tiến độ và các buổi học trong ngày
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ error, onRetry }) {
  return (
    <div className="db-error-banner">
      <span>⚠️ Không thể tải dữ liệu: {error}</span>

      <button onClick={onRetry}>Thử lại</button>
    </div>
  );
}

function SummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="sg">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="sc db-summary-loading">
            <Skeleton h={20} w={40} />
            <Skeleton h={32} w={60} />
            <Skeleton h={12} w={100} />
          </div>
        ))}
      </div>
    );
  }

  const data = summary ?? {};

  return (
    <div className="sg">
      <div className="sc gr">
        <div className="sc-ic">📅</div>
        <div className="sc-lb">Buổi hôm nay</div>
        <div className="sc-vl gr">{data.sessionsToday ?? 0}</div>
        <div className="sc-su">
          {data.openCount ?? 0} đang mở · {data.upcomingCount ?? 0} sắp tới
        </div>
      </div>

      <div className="sc bl">
        <div className="sc-ic">📚</div>
        <div className="sc-lb">Tuần này</div>
        <div className="sc-vl bl">{data.sessionsThisWeek ?? 0}</div>
        <div className="sc-su">{data.subjectsThisWeek ?? 0} môn khác nhau</div>
      </div>

      <div className="sc am">
        <div className="sc-ic">📊</div>
        <div className="sc-lb">Học kỳ này</div>
        <div className="sc-vl am">{data.totalSessions ?? 0}</div>
        <div className="sc-su">
          {data.closedSessions ?? 0} xong · {data.remainingSessions ?? 0} còn lại
        </div>
      </div>

      <div className="sc pu">
        <div className="sc-ic">🎯</div>
        <div className="sc-lb">Chuyên cần TB</div>
        <div className="sc-vl pu">
          {data.avgAttendanceRate != null
            ? `${Math.round(data.avgAttendanceRate)}%`
            : '—'}
        </div>
        <div className="sc-su">Toàn bộ lớp</div>
      </div>
    </div>
  );
}

function TodaySessions({ sessions, loading, navigate }) {
  const today = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const weekday = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
  });

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Buổi học hôm nay</div>
          <div className="card-su">
            {today} · {weekday}
          </div>
        </div>
      </div>

      <div className="db-today-list">
        {loading && <TodaySessionsSkeleton />}

        {!loading && sessions.length === 0 && (
          <div className="db-empty-message">Không có buổi học hôm nay 🎉</div>
        )}

        {!loading &&
          sessions.length > 0 &&
          sessions.map((session) => (
            <TodaySessionItem
              key={session.classSessionId}
              session={session}
              navigate={navigate}
            />
          ))}
      </div>
    </div>
  );
}

function TodaySessionItem({ session, navigate }) {
  const isOpen = session.status?.toLowerCase() === 'open';
  const isClosed = session.status?.toLowerCase() === 'closed';
  const isCancelled = session.status?.toLowerCase() === 'cancelled';

  const present = session.presentCount ?? 0;
  const total = session.totalStudents ?? 0;
  const attended = present;

  return (
    <div className={isOpen ? 'db-today-item db-today-item-open' : 'db-today-item'}>
      <div className="db-today-item-head">
        <div>
          <div className="db-session-title">{session.subjectName}</div>

          <div className="db-session-meta">
            {session.className} · Tiết {session.periodStart}–{session.periodEnd} ·{' '}
            {session.roomCode}
            {session.building ? ` · ${session.building}` : ''} · Buổi{' '}
            {session.sessionNumber ?? '?'}/{session.totalSessions ?? '?'}

            {session.makeupForId && (
              <span className="db-makeup-text">(Học bù)</span>
            )}
          </div>
        </div>

        {statusBadge(session.status)}
      </div>

      {isCancelled && (
        <div className="db-cancelled-box">Đã hủy buổi học</div>
      )}

      {isOpen && (
        <div className="db-open-actions">
          <ProgressBar value={attended} max={total} />

          <span className="db-attended-count">
            {attended}/{total}
          </span>

          <button
            className="btn btn-s btn-sm"
            onClick={() => navigate(`/qr?sessionId=${session.classSessionId}`)}
          >
            Xem QR
          </button>

          <button
            className="btn btn-s btn-sm db-edit-attendance-btn"
            onClick={() =>
              navigate(`/sessions/${session.classSessionId}/attendances`)
            }
            title="Sổ điểm danh (Sửa thủ công)"
          >
            📋 Sửa
          </button>
        </div>
      )}

      {isClosed && (
        <button
          className="btn btn-p db-closed-btn"
          onClick={() =>
            navigate(`/sessions/${session.classSessionId}/attendances`)
          }
        >
          📋 Xem điểm danh
        </button>
      )}

      {!isCancelled && !isOpen && !isClosed && (
        <button
          className="btn btn-p db-create-qr-btn"
          onClick={() => navigate(`/qr?sessionId=${session.classSessionId}`)}
        >
          ▶ Tạo mã QR
        </button>
      )}
    </div>
  );
}

function TodaySessionsSkeleton() {
  return (
    <>
      {[0, 1].map((item) => (
        <div key={item} className="db-today-skeleton">
          <Skeleton h={14} w="60%" />
          <Skeleton h={11} w="80%" />
          <Skeleton h={8} />
        </div>
      ))}
    </>
  );
}

function SemesterProgress({ progress, loading, navigate }) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">Tiến độ học kỳ</div>
        <div className="card-su">Nhấn vào môn để xem sổ điểm danh</div>
      </div>

      <div className="db-progress-list">
        {loading && <SemesterProgressSkeleton />}

        {!loading && progress.length === 0 && (
          <div className="db-progress-empty">Chưa có dữ liệu tiến độ.</div>
        )}

        {!loading &&
          progress.length > 0 &&
          progress.map((item) => (
            <SemesterProgressItem
              key={item.scheduleId}
              item={item}
              navigate={navigate}
            />
          ))}
      </div>
    </div>
  );
}

function SemesterProgressItem({ item, navigate }) {
  const closed = item.closedSessions ?? 0;
  const total = item.totalSessions ?? 0;

  const handleClick = () => {
    navigate(
      `/sessions?className=${encodeURIComponent(
        item.className
      )}&subjectName=${encodeURIComponent(item.subjectName)}`
    );
  };

  return (
    <div
      className="db-progress-item"
      onClick={handleClick}
      title="Xem chi tiết sổ điểm danh"
    >
      <div className="db-progress-head">
        <span>
          {item.subjectName}{' '}
          <span>
            · {item.className}
          </span>
        </span>

        <span>{closed}/{total}</span>
      </div>

      <ProgressBar value={closed} max={total} />
    </div>
  );
}

function SemesterProgressSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="db-progress-skeleton">
          <Skeleton h={12} w="70%" />
          <Skeleton h={8} />
        </div>
      ))}
    </>
  );
}

function WeekSchedule({ sessions, loading }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">Lịch tuần này</div>
        <div className="card-su">Nhấn vào buổi để xem chi tiết</div>
      </div>

      <table className="tbl">
        <tbody>
          {loading && <WeekScheduleSkeleton />}

          {!loading && sessions.length === 0 && (
            <tr>
              <td colSpan={3} className="db-week-empty">
                Không có buổi học tuần này.
              </td>
            </tr>
          )}

          {!loading &&
            sessions.length > 0 &&
            sessions.map((session) => (
              <WeekScheduleRow
                key={session.classSessionId}
                session={session}
                onClick={() => setSelected(session)}
              />
            ))}
        </tbody>
      </table>

      {selected && (
        <SessionDetailPopover
          session={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function WeekScheduleRow({ session, onClick }) {
  const isToday = (() => {
    if (!session.sessionDate) return false;

    const date = new Date(session.sessionDate);
    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  })();

  const dow =
    session.dayOfWeek ??
    (session.sessionDate ? new Date(session.sessionDate).getDay() + 1 : 0);

  return (
    <tr className="db-week-row" onClick={onClick}>
      <td className={isToday ? 'db-week-day db-week-day-today' : 'db-week-day'}>
        {dayLabel(dow)}
      </td>

      <td className={isToday ? 'db-week-main db-week-main-today' : 'db-week-main'}>
        {session.subjectName} · {session.className} · {session.roomCode} · T.
        {session.periodStart}–{session.periodEnd}

        {session.makeupForId && <span className="db-week-makeup">Bù</span>}
      </td>

      <td>
        {isToday && session.status?.toLowerCase() === 'open' ? (
          <span className="bdg b-op">Hôm nay</span>
        ) : (
          statusBadge(session.status)
        )}
      </td>
    </tr>
  );
}

function WeekScheduleSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <tr key={item}>
          <td>
            <Skeleton h={11} w={20} />
          </td>
          <td>
            <Skeleton h={11} />
          </td>
          <td>
            <Skeleton h={20} w={50} />
          </td>
        </tr>
      ))}
    </>
  );
}

function SessionDetailPopover({ session, onClose }) {
  const formatTime = (time) => (time ? String(time).slice(0, 5) : '—');

  const dateStr = session.sessionDate
    ? new Date(session.sessionDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const detailRows = [
    ['🏫', 'Lớp', session.className],
    [
      '📍',
      'Phòng',
      session.roomCode
        ? `${session.roomCode}${session.building ? ` · ${session.building}` : ''}`
        : '—',
    ],
    [
      '⏰',
      'Tiết',
      `${session.periodStart}–${session.periodEnd} (${formatTime(
        session.periodStartTime
      )} – ${formatTime(session.periodEndTime)})`,
    ],
    [
      '📋',
      'Buổi thứ',
      session.sessionNumber != null && session.totalSessions != null
        ? `${session.sessionNumber} / ${session.totalSessions}`
        : '—',
    ],
  ];

  return (
    <div className="db-popover-overlay" onClick={onClose}>
      <div className="db-popover-card" onClick={(e) => e.stopPropagation()}>
        <div className="db-popover-header">
          <div>
            <div className="db-popover-title">{session.subjectName}</div>
            <div className="db-popover-date">{dateStr}</div>
          </div>

          <div className="db-popover-actions">
            {statusBadge(session.status)}

            <button onClick={onClose}>×</button>
          </div>
        </div>

        {detailRows.map(([icon, label, value]) => (
          <div key={label} className="db-popover-row">
            <span>{icon}</span>
            <span>{label}</span>
            <span>{value || '—'}</span>
          </div>
        ))}

        {session.makeupForId && (
          <div className="db-popover-makeup">
            <span>⚠️</span>
            <span>
              Học bù cho ngày{' '}
              {session.originalSessionDate
                ? new Date(session.originalSessionDate).toLocaleDateString(
                    'vi-VN',
                    {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }
                  )
                : '—'}
            </span>
          </div>
        )}

        <div className="db-popover-note">Nhấn ra ngoài để đóng</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color = 'var(--gr)' }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="pb">
      <div
        className="pf db-progress-fill"
        style={{
          width: `${percent}%`,
          background: color,
        }}
      />
    </div>
  );
}

function Skeleton({ h = 14, w = '100%', radius = 6 }) {
  return (
    <div
      className="db-skeleton"
      style={{
        height: h,
        width: w,
        borderRadius: radius,
      }}
    />
  );
}
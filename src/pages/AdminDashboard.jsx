// AdminDashboard.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../css/AdminDashboard.css';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/dashboard');
      setData(res.data?.result || res.data);
      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu dashboard:", err);
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRequestAction = async (id, type, action) => {
    try {
      const typeParam = type.toLowerCase();
      if (action === 'approve') {
        await api.post(`/api/v1/session-requests/admin/${id}/approve?type=${typeParam}`);
      } else {
        await api.post(`/api/v1/session-requests/admin/${id}/reject?type=${typeParam}`, {
          rejectReason: "Từ chối phê duyệt từ Dashboard"
        });
      }
      // Tải lại dữ liệu sau khi duyệt thành công
      fetchDashboard();
    } catch (err) {
      console.error("Lỗi xử lý yêu cầu:", err);
      toast.error(err.response?.data?.message || "Không thể thực hiện phê duyệt.");
    }
  };

  if (loading && !data) {
    return (
      <div className="page active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--tx3)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="pulse" style={{ width: '16px', height: '16px', background: 'var(--primary)' }}></div>
          Đang tải dữ liệu dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page active" style={{ padding: '24px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '32px', border: '1px solid rgba(220,38,38,.2)', background: 'var(--rdL)' }}>
          <span style={{ fontSize: '32px' }}>⚠️</span>
          <div style={{ color: 'var(--rd)', fontWeight: '700', fontSize: '15px', marginTop: '12px' }}>{error}</div>
          <button className="btn btn-p" onClick={fetchDashboard} style={{ marginTop: '16px' }}>Thử lại</button>
        </div>
      </div>
    );
  }

  const dashboardData = data || {
    stats: { activeSemesterName: "---", totalClasses: 0, totalStudents: 0, totalLecturers: 0 },
    todayOverview: { totalSessions: 0, activeSessions: 0, completedSessions: 0 },
    activeSessions: [],
    pendingRequests: []
  };

  return (
    <div className="page active">
      <AdminHeader stats={dashboardData.stats} />

      <StatisticCards stats={dashboardData.stats} />

      <div className="g2">
        <ActiveSessions 
          sessions={dashboardData.activeSessions} 
          overview={dashboardData.todayOverview}
        />
        <PendingRequests 
          requests={dashboardData.pendingRequests} 
          onAction={handleRequestAction}
        />
      </div>
    </div>
  );
}

function AdminHeader({ stats }) {
  return (
    <div className="adm-bar">
      <div className="adm-ic">🛡️</div>

      <div>
        <div className="adm-title">Quản trị hệ thống</div>
        <div className="adm-subtitle">
          {stats.activeSemesterName} · {stats.totalClasses} lớp · {stats.totalStudents.toLocaleString()} sinh viên · {stats.totalLecturers} giảng viên
        </div>
      </div>
    </div>
  );
}

function StatisticCards({ stats }) {
  return (
    <div className="sg admin-stats-grid">
      <div className="sc-premium">
        <div className="sc-info">
          <span className="sc-label">Sinh viên</span>
          <span className="sc-value">{stats.totalStudents.toLocaleString()}</span>
        </div>
        <div className="sc-icon-wrapper">👥</div>
      </div>

      <div className="sc-premium">
        <div className="sc-info">
          <span className="sc-label">Giảng viên</span>
          <span className="sc-value">{stats.totalLecturers}</span>
        </div>
        <div className="sc-icon-wrapper">👨‍🏫</div>
      </div>

      <div className="sc-premium">
        <div className="sc-info">
          <span className="sc-label">Lớp HC</span>
          <span className="sc-value">{stats.totalClasses}</span>
        </div>
        <div className="sc-icon-wrapper">🏫</div>
      </div>
    </div>
  );
}

function ActiveSessions({ sessions, overview }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Lớp học đang diễn ra</div>
          <div className="card-su" style={{ marginTop: '4px' }}>
            Tổng số ca hôm nay: <strong>{overview.totalSessions}</strong> ca · Đã hoàn thành: <strong>{overview.completedSessions}</strong> ca
          </div>
        </div>
        <span className="bdg b-op" style={{ padding: '4px 10px' }}>
          Live: {overview.activeSessions} ca
        </span>
      </div>

      <div className="ast-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th>Giảng viên</th>
              <th>Môn học & Lớp</th>
              <th>Phòng</th>
              <th>Thời gian</th>
              <th>Bắt đầu</th>
            </tr>
          </thead>

          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--tx3)' }}>
                  Hiện tại không có ca học nào đang điểm danh.
                </td>
              </tr>
            ) : (
              sessions.map((cls) => (
                <tr key={cls.id} className="class-list-row">
                  <td data-label="Giảng viên">
                    <div className="lecturer-profile">
                      <div className="lecturer-avatar">{cls.lecturerInitial}</div>
                      <span>{cls.lecturerName}</span>
                    </div>
                  </td>
                  <td data-label="Môn học & Lớp">
                    <div className="class-subject-info">
                      <span className="subject-name">{cls.subjectName}</span>
                      <span className="class-name-sub">Lớp hành chính: {cls.className}</span>
                    </div>
                  </td>
                  <td data-label="Phòng" className="room-text" style={{ fontWeight: 600 }}>{cls.roomCode}</td>
                  <td data-label="Thời gian">
                    <span className="period-pill">{cls.periodText}</span>
                  </td>
                  <td data-label="Bắt đầu">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--mo)', fontSize: '11px', color: 'var(--gr)' }}>
                      <span className="pulse"></span>
                      {cls.openedAt}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PendingRequests({ requests, onAction }) {
  return (
    <div className="card timeline-card">
      <div className="card-h" style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)' }}>
        <div className="card-t">Yêu cầu cần phê duyệt</div>
        <span className="bdg b-sc">
          Chờ duyệt: {requests.filter(r => r.status === 'pending').length}
        </span>
      </div>

      <div className="tl-list" style={{ padding: 0 }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--tx3)', fontSize: '12px' }}>
            🎉 Đã xử lý hết các yêu cầu phê duyệt!
          </div>
        ) : (
          requests.map((req) => (
            <div className="activity-item" key={req.requestId}>
              <div className={`activity-icon-box ${req.type === 'MAKEUP' ? 'bg-blue' : 'bg-orange'}`}>
                {req.type === 'MAKEUP' ? '📅' : '⚠️'}
              </div>

              <div className="activity-content">
                <div className="activity-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="activity-title" style={{ fontWeight: 700 }}>{req.lecturerName}</span>
                    <span className={`bdg ${req.type === 'MAKEUP' ? 'b-sc' : 'b-ex'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                      {req.typeName}
                    </span>
                  </div>
                  <span className="activity-time">{req.time}</span>
                </div>
                
                <div className="activity-desc" style={{ marginTop: '4px' }}>
                  <strong>{req.subjectName}</strong> ({req.className})
                  <div style={{ color: 'var(--tx3)', fontSize: '11px', marginTop: '2px' }}>{req.details}</div>
                </div>

                {req.status === 'pending' && (
                  <div className="activity-actions" style={{ marginTop: '8px' }}>
                    <button 
                      className="action-btn-sm action-btn-approve"
                      onClick={() => onAction(req.requestId, req.type, 'approve')}
                    >
                      Phê duyệt
                    </button>
                    <button 
                      className="action-btn-sm action-btn-reject"
                      onClick={() => onAction(req.requestId, req.type, 'reject')}
                    >
                      Từ chối
                    </button>
                  </div>
                )}

                {req.status === 'approved' && (
                  <div className="status-badge-inline" style={{ marginTop: '6px' }}>
                    Đã phê duyệt yêu cầu
                  </div>
                )}

                {req.status === 'rejected' && (
                  <div className="status-badge-inline rejected" style={{ marginTop: '6px', color: 'var(--rd)' }}>
                    Đã từ chối yêu cầu
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
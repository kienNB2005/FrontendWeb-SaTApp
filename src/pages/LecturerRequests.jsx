import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const map = {
    pending: { label: 'Đang chờ', cls: 'bdg b-am' },
    approved: { label: 'Đã duyệt', cls: 'bdg b-gr' },
    rejected: { label: 'Từ chối', cls: 'bdg b-ca' },
  };
  const { label, cls } = map[s] || { label: status, cls: 'bdg' };
  return <span className={cls}>{label}</span>;
}

export default function LecturerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRequests = () => {
    setLoading(true);
    api.get('/api/v1/session-requests/my-requests')
      .then(res => {
        const list = res.data?.result || res.data?.data || res.data || [];
        // Sort descending by ID or createdAt
        list.sort((a, b) => b.id - a.id);
        setRequests(list);
      })
      .catch(err => setError(err?.response?.data?.message || err.message || 'Lỗi tải danh sách yêu cầu.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="page active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Yêu cầu giảng dạy của tôi</h2>
        <button className="btn btn-s btn-sm" onClick={loadRequests}>🔄 Làm mới</button>
      </div>

      {error && (
        <div className="err-banner" style={{ color: '#ef4444', marginBottom: 16 }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Đang tải...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">Chưa có yêu cầu nào được gửi.</div>
        ) : (
          <div className="ast-table-wrap">
            <table className="ast-responsive-table">
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Môn học / Lớp</th>
                  <th>Buổi học gốc</th>
                  <th>Loại Y/C</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết / Lý do</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const subjectName = req.classSession?.schedule?.subject?.name || 'Không rõ';
                  const className = req.classSession?.schedule?.adminClass?.code || 'Không rõ';
                  const origDate = req.classSession?.sessionDate 
                    ? new Date(req.classSession.sessionDate).toLocaleDateString('vi-VN') 
                    : '—';
                  const origPeriod = `Tiết ${req.classSession?.actualPeriodStart}-${req.classSession?.actualPeriodEnd}`;

                  const hasMakeup = req.makeupStatus != null;
                  const cellStyle = hasMakeup ? { borderBottom: 'none', paddingBottom: '8px' } : {};

                  return (
                    <React.Fragment key={req.id}>
                      <tr>
                        <td data-label="Mã YC" style={{ fontWeight: 600, ...cellStyle }}>#{req.id}</td>
                        <td data-label="Môn học / Lớp" style={{ ...cellStyle }}>
                          <div style={{ fontWeight: 600 }}>{subjectName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>{className}</div>
                        </td>
                        <td data-label="Buổi học gốc" style={{ ...cellStyle }}>
                          <div style={{ fontWeight: 600 }}>{origDate}</div>
                          <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>{origPeriod}</div>
                        </td>
                        <td data-label="Loại Y/C" style={{ fontWeight: 600, color: 'var(--tx3)', ...cellStyle }}>
                          Hủy buổi
                        </td>
                        <td data-label="Trạng thái" style={{ ...cellStyle }}>
                          <StatusBadge status={req.cancelStatus} />
                        </td>
                        <td data-label="Chi tiết / Lý do" style={{ ...cellStyle }}>
                          <div style={{ fontSize: '13px', color: 'var(--tx)' }}>
                            <span style={{color: 'var(--tx3)'}}>Lý do: </span>{req.cancelReason || '—'}
                          </div>
                          {req.rejectReason && req.cancelStatus === 'rejected' && !hasMakeup && (
                            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                              Từ chối: {req.rejectReason}
                            </div>
                          )}
                        </td>
                      </tr>
                      
                      {hasMakeup && (
                        <tr style={{ background: 'var(--bg3)' }}>
                          <td style={{ paddingTop: '8px', borderTop: 'none' }} className="hide-on-mobile"></td>
                          <td style={{ paddingTop: '8px', borderTop: 'none' }} className="hide-on-mobile"></td>
                          <td style={{ paddingTop: '8px', borderTop: 'none' }} className="hide-on-mobile"></td>
                          <td data-label="Loại Y/C" style={{ paddingTop: '8px', fontWeight: 600, color: '#F59E0B', borderTop: '1px dashed var(--bd)' }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                              Dạy bù
                            </div>
                          </td>
                          <td data-label="Trạng thái" style={{ paddingTop: '8px', borderTop: '1px dashed var(--bd)' }}>
                            <StatusBadge status={req.makeupStatus} />
                          </td>
                          <td data-label="Chi tiết / Lý do" style={{ paddingTop: '8px', borderTop: '1px dashed var(--bd)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--tx)' }}>
                              <span style={{color: 'var(--tx3)'}}>Thời gian: </span> 
                              {req.makeupDate ? new Date(req.makeupDate).toLocaleDateString('vi-VN') : '—'} (Tiết {req.makeupPeriodStart}-{req.makeupPeriodEnd})
                            </div>
                            {req.rejectReason && req.makeupStatus === 'rejected' && (
                              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                                Từ chối bù: {req.rejectReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

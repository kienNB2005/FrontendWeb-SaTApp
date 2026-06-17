import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import api from '../utils/api';
import { ButtonSpinner, TableSkeleton } from '../components/LoadingStates';

export default function AdminRequests() {
  const { showError } = useError();

  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('cancel'); // 'cancel' or 'makeup'
  const [cancels, setCancels] = useState([]);
  const [makeups, setMakeups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // Reject Modal State
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    const endpoint = activeTab === 'cancel' 
      ? '/api/v1/session-requests/admin/pending-cancels' 
      : '/api/v1/session-requests/admin/pending-makeups';

    api.get(endpoint)
      .then(res => {
        const list = res.data?.result || res.data?.data || res.data || [];
        if (activeTab === 'cancel') setCancels(list);
        else setMakeups(list);
      })
      .catch(err => setError(err?.response?.data?.message || err.message || 'Lỗi tải danh sách yêu cầu.'))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id) => {
    if (!(await confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu này? Lịch học sẽ chính thức được cập nhật.'))) return;
    setProcessingRequestId(id);
    try {
      await api.post(`/api/v1/session-requests/admin/${id}/approve?type=${activeTab}`);
      toast.success('Đã phê duyệt thành công.');
      loadData();
    } catch (err) {
      showError(err?.response?.data?.message || err.message || 'Có lỗi xảy ra.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const submitReject = async () => {
    if (rejectReason.trim().length < 5) return showError("Lý do từ chối quá ngắn.");
    setRejectLoading(true);
    try {
      await api.post(`/api/v1/session-requests/admin/${rejectModalId}/reject?type=${activeTab}`, {
        rejectReason: rejectReason
      });
      toast.success('Đã từ chối yêu cầu.');
      setRejectModalId(null);
      setRejectReason("");
      loadData();
    } catch (err) {
      showError(err?.response?.data?.message || err.message || 'Có lỗi xảy ra.');
    } finally {
      setRejectLoading(false);
    }
  };

  const requests = activeTab === 'cancel' ? cancels : makeups;

  return (
    <div className="page active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Phê duyệt yêu cầu giảng dạy</h2>
        <button className="btn btn-s btn-sm" onClick={loadData}>🔄 Làm mới</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--bd2)', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeTab === 'cancel' ? 'btn-p' : 'btn-s'}`}
          onClick={() => setActiveTab('cancel')}
        >
          Yêu cầu Hủy buổi
        </button>
        <button 
          className={`btn ${activeTab === 'makeup' ? 'btn-p' : 'btn-s'}`}
          onClick={() => setActiveTab('makeup')}
        >
          Yêu cầu Dạy bù
        </button>
      </div>

      {error && (
        <div className="err-banner" style={{ color: '#ef4444', marginBottom: 16 }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="card">
        {loading ? (
          <TableSkeleton rows={7} columns={6} />
        ) : requests.length === 0 ? (
          <div className="empty-state">Không có yêu cầu nào đang chờ duyệt.</div>
        ) : (
          <table className="ast-responsive-table">
            <thead>
              <tr>
                <th>Mã YC</th>
                <th>Giảng viên</th>
                <th>Môn học / Lớp</th>
                <th>Buổi học gốc</th>
                <th>Chi tiết đề xuất</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const lecturerName = req.lecturer?.user?.fullName || req.lecturer?.lecturerCode || 'Không rõ';
                const subjectName = req.classSession?.schedule?.subject?.name || 'Không rõ';
                const className = req.classSession?.schedule?.adminClass?.code || 'Không rõ';
                const origDate = req.classSession?.sessionDate 
                  ? new Date(req.classSession.sessionDate).toLocaleDateString('vi-VN') 
                  : '—';
                const origPeriod = `Tiết ${req.classSession?.actualPeriodStart}-${req.classSession?.actualPeriodEnd}`;

                return (
                  <tr key={req.id}>
                    <td data-label="Mã YC" style={{ fontWeight: 600 }}>#{req.id}</td>
                    <td data-label="Giảng viên" style={{ fontWeight: 600, color: 'var(--tx)' }}>{lecturerName}</td>
                    <td data-label="Môn học / Lớp">
                      <div style={{ fontWeight: 600 }}>{subjectName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>{className}</div>
                    </td>
                    <td data-label="Buổi học gốc">
                      <div style={{ fontWeight: 600 }}>{origDate}</div>
                      <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>{origPeriod}</div>
                    </td>
                    <td data-label="Chi tiết đề xuất">
                      {activeTab === 'cancel' ? (
                        <div style={{ fontSize: '13px' }}>
                          <span style={{ fontWeight: 600 }}>Lý do hủy:</span> {req.cancelReason}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--bl)' }}>
                            Bù ngày: {req.makeupDate ? new Date(req.makeupDate).toLocaleDateString('vi-VN') : ''} 
                            (Tiết {req.makeupPeriodStart}-{req.makeupPeriodEnd})
                          </div>
                          <div style={{ color: 'var(--tx3)', fontSize: '12px' }}>
                            Phòng: {req.makeupRoom?.code}
                          </div>
                        </div>
                      )}
                    </td>
                    <td data-label="Thao tác">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-p btn-sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={processingRequestId === req.id}
                        >
                          {processingRequestId === req.id ? <ButtonSpinner size={12} /> : '✅'} Duyệt
                        </button>
                        <button
                          className="btn btn-d btn-sm"
                          onClick={() => setRejectModalId(req.id)}
                          disabled={processingRequestId === req.id}
                        >
                          ❌ Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Từ chối */}
      {rejectModalId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Từ chối yêu cầu</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Lý do từ chối (bắt buộc)</label>
              <textarea 
                className="fi" 
                style={{ width: '100%', minHeight: '80px', padding: '10px' }} 
                placeholder="Nhập lý do để giảng viên biết..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-s" onClick={() => setRejectModalId(null)} disabled={rejectLoading}>Đóng</button>
              <button className="btn btn-p" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={submitReject} disabled={rejectLoading}>
                {rejectLoading ? <ButtonSpinner size={14} /> : null}
                Xác nhận Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import api from '../utils/api';
import '../css/QR.css';

const TOAST_BG = {
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

function fmtTime(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
}

function friendlyError(err) {
  const code = err?.response?.data?.code || '';
  const msg = err?.response?.data?.message || err?.message || '';

  const map = {
    CLASS_SESSION_NOT_FOUND: 'Không tìm thấy buổi học.',
    SESSION_ALREADY_OPEN: 'Buổi học đã được mở trước đó.',
    INVALID_SESSION_STATUS: 'Trạng thái buổi học không hợp lệ.',
    NO_PERMISSION_ON_SESSION: 'Bạn không có quyền thao tác trên buổi học này.',
    CHECKOUT_ALREADY_ACTIVE: 'Check-out đã được kích hoạt rồi.',
    QR_TOKEN_EXPIRED: 'Mã QR đã hết hạn, đang làm mới…',
    SESSION_NOT_OPEN: 'Buổi học chưa được mở.',
  };

  return map[code] || map[msg] || msg || 'Có lỗi xảy ra, vui lòng thử lại.';
}

export default function QR() {
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [qrType, setQrType] = useState('CHECK_IN');
  const [timerVal, setTimerVal] = useState(60);
  const [qrLoading, setQrLoading] = useState(false);
  const [attendances, setAttendances] = useState([]);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutMins, setCheckoutMins] = useState(5);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutActive, setCheckoutActive] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [openError, setOpenError] = useState(null);
  const [qrMaximized, setQrMaximized] = useState(false);

  const sseRef = useRef(null);
  const timerRef = useRef(null);

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, msg, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const startTimer = useCallback((expiresAt) => {
    clearInterval(timerRef.current);

    if (!expiresAt) return;

    const tick = () => {
      setTimerVal(
        Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000))
      );
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  const applyQrResponse = useCallback(
    (res) => {
      setQrData(res.qrCodeData);
      setQrType(res.type);

      if (res.type === 'CHECK_IN') {
        setCheckoutActive(false);
      } else if (res.type === 'CHECK_OUT') {
        setCheckoutActive(true);
      }

      startTimer(res.qrExpiresAt);
    },
    [startTimer]
  );

  const fetchDetail = useCallback(async () => {
    try {
      setSessionLoading(true);

      const res = await api.get(`/api/v1/sessions/${sessionId}`);
      const detail = res.data.result;

      setSession(detail);

      if (detail.status === 'closed') {
        setSessionClosed(true);
      }

      if (detail.status === 'open' && detail.qrCodeData) {
        setQrData(detail.qrCodeData);
        setQrType(detail.qrType ?? 'CHECK_IN');
        startTimer(detail.qrExpiresAt);

        if (detail.qrType === 'CHECK_OUT') {
          setCheckoutActive(true);
        }
      }
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSessionLoading(false);
    }
  }, [sessionId, startTimer, toast]);

  const handleRefreshQr = useCallback(async () => {
    try {
      setQrLoading(true);

      const res = await api.post(`/api/v1/sessions/${sessionId}/qr/refresh`);
      applyQrResponse(res.data.result);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setQrLoading(false);
    }
  }, [sessionId, applyQrResponse, toast]);

  useEffect(() => {
    if (timerVal === 0 && !sessionClosed && qrData && !isLocked) {
      Promise.resolve().then(() => handleRefreshQr());
    }
  }, [timerVal, sessionClosed, qrData, isLocked, handleRefreshQr]);

  const connectSse = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const baseUrl = api.defaults.baseURL || '';

    const sseUrl = `${baseUrl}/api/v1/sessions/${sessionId}/attendances/stream${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;

    const sse = new EventSource(sseUrl);
    sseRef.current = sse;

    sse.addEventListener('snapshot', (event) => {
      setAttendances(JSON.parse(event.data));
    });

    sse.addEventListener('attendance-update', (event) => {
      const updated = JSON.parse(event.data);

      setAttendances((prev) => {
        const index = prev.findIndex(
          (item) => item.attendanceId === updated.attendanceId
        );

        if (index >= 0) {
          const next = [...prev];
          next[index] = updated;
          return next;
        }

        return [updated, ...prev];
      });
    });

    sse.addEventListener('left-early-update', (event) => {
      setAttendances(JSON.parse(event.data));
      toast('Đã đóng Check-out. Hệ thống tự động khóa Check-in!', 'warning');
      setCheckoutActive(false);
      setIsLocked(true);
      clearInterval(timerRef.current);
    });

    sse.addEventListener('session-closed', () => {
      setSessionClosed(true);
      sse.close();
    });
  }, [sessionId, toast]);

  useEffect(() => {
    if (!sessionId) return undefined;

    Promise.resolve().then(() => {
      fetchDetail();

      setQrLoading(true);

      api
        .patch(`/api/v1/sessions/${sessionId}/status`, { status: 'OPEN' })
        .then((res) => {
          applyQrResponse(res.data.result);
          fetchDetail();
          connectSse();
        })
        .catch((err) => {
          const msg = friendlyError(err);

          if (err?.response?.data?.code === 'SESSION_ALREADY_OPEN') {
            fetchDetail();
            connectSse();
          } else {
            setOpenError(msg);
          }
        })
        .finally(() => {
          setQrLoading(false);

        });
    });

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }

      clearInterval(timerRef.current);
    };
  }, [sessionId, fetchDetail, applyQrResponse, connectSse]);



  const handleStartCheckout = async () => {
    try {
      setCheckoutLoading(true);

      const res = await api.patch(`/api/v1/sessions/${sessionId}/status`, {
        status: 'CHECKING_OUT',
        checkoutMinutes: checkoutMins,
      });

      applyQrResponse(res.data.result);
      setCheckoutActive(true);
      setModalOpen(false);
      setIsLocked(false);
      toast('Đã kích hoạt Check-out!', 'success');
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!(await confirm('Bạn có chắc chắn muốn kết thúc buổi học này không?'))) {
      return;
    }

    try {
      await api.patch(`/api/v1/sessions/${sessionId}/status`, {
        status: 'CLOSED',
      });

      toast('Đã kết thúc buổi học!', 'success');

      setTimeout(() => {
        navigate(`/sessions/${sessionId}/attendances`);
      }, 1200);
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };

  const handleToggleLock = () => {
    const willLock = !isLocked;

    setIsLocked(willLock);

    if (willLock) {
      clearInterval(timerRef.current);
      toast('Đã khóa QR điểm danh.', 'warning');
    } else {
      handleRefreshQr();
      toast('Đã mở lại điểm danh!', 'success');
    }
  };

  const present = attendances.filter((item) => item.status === 'present');
  const onTime = present.filter((item) => !item.isLate).length;
  const lateCount = present.filter((item) => item.isLate).length;
  const absent = attendances.filter((item) => item.status === 'absent').length;
  const total = attendances.length;

  const pct = Math.min(timerVal / 60, 1);
  const circ = 2 * Math.PI * 26;
  const offset = circ * (1 - pct);
  const timerColor =
    pct > 0.4 ? '#10B981' : pct > 0.2 ? '#F59E0B' : '#EF4444';
  const isCheckout = qrType === 'CHECK_OUT';

  return (
    <>
      <ToastList toasts={toasts} />

      <div className="qr-root">
        <QrHeader
          session={session}
          sessionLoading={sessionLoading}
          sessionClosed={sessionClosed}
        />

        <div className="qr-body">
          <QrPanel
            qrData={qrData}
            qrLoading={qrLoading}
            isLocked={isLocked}
            isCheckout={isCheckout}
            sessionClosed={sessionClosed}
            checkoutActive={checkoutActive}
            timerVal={timerVal}
            timerColor={timerColor}
            circ={circ}
            offset={offset}
            onRefreshQr={handleRefreshQr}
            onToggleLock={handleToggleLock}
            onOpenCheckout={() => setModalOpen(true)}
            onCloseSession={handleCloseSession}
            onMaximize={() => setQrMaximized(true)}
          />

          <AttendancePanel
            attendances={attendances}
            presentCount={present.length}
            onTime={onTime}
            lateCount={lateCount}
            absent={absent}
            total={total}
            sessionId={sessionId}
            navigate={navigate}
          />
        </div>
      </div>

      {openError && (
        <OpenErrorModal openError={openError} onBack={() => navigate(-1)} />
      )}

      {qrMaximized && qrData && (
        <div className="qr-fullscreen-overlay" onClick={() => setQrMaximized(false)}>
          <div className="qr-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={qrData} size={600} level="M" className="qr-fullscreen-svg" />
            <div className="qr-fullscreen-close" onClick={() => setQrMaximized(false)}>Đóng (Click ra ngoài)</div>
          </div>
        </div>
      )}

      <CheckoutModal
        modalOpen={modalOpen}
        checkoutMins={checkoutMins}
        checkoutLoading={checkoutLoading}
        presentCount={present.length}
        setCheckoutMins={setCheckoutMins}
        onClose={() => setModalOpen(false)}
        onConfirm={handleStartCheckout}
      />
    </>
  );
}

function ToastList({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((item) => (
        <div
          key={item.id}
          className="toast"
          style={{ background: TOAST_BG[item.type] || TOAST_BG.info }}
        >
          {item.msg}
        </div>
      ))}
    </div>
  );
}

function QrHeader({ session, sessionLoading, sessionClosed }) {
  if (sessionLoading) {
    return (
      <div className="qr-header">
        <div className="qr-header-loading">Đang tải thông tin buổi học…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="qr-header">
        <div className="qr-header-error">Không tìm thấy thông tin buổi học</div>
      </div>
    );
  }

  return (
    <div className="qr-header">
      <div className="qr-title-icon">📝</div>
      
      <div className="qr-header-content">
        <div className="qr-header-title-row">
          <div className="qr-title-main" title={`${session.subjectName} (${session.subjectCode})`}>
            {session.subjectName} <span className="qr-subject-code">({session.subjectCode})</span>
          </div>
          {sessionClosed && <div className="badge-closed">Đã kết thúc</div>}
        </div>

        <div className="qr-header-details">
          <div className="qr-detail-item">
            <span className="qr-detail-label">Buổi</span> {session.sessionNumber}/{session.totalSessions}
          </div>
          <div className="qr-detail-divider" />
          <div className="qr-detail-item">
            <span className="qr-detail-label">Lớp</span> {session.className}
          </div>
          <div className="qr-detail-divider" />
          <div className="qr-detail-item">
            <span className="qr-detail-label">Thời gian</span> Tiết {session.periodStart}–{session.periodEnd}
            {session.periodStartTime &&
              ` (${String(session.periodStartTime).slice(0, 5)}–${String(
                session.periodEndTime || ''
              ).slice(0, 5)})`}
          </div>
          <div className="qr-detail-divider" />
          <div className="qr-detail-item">
            <span className="qr-detail-label">Phòng</span> {session.roomCode}
            {session.building ? ` - ${session.building}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function QrPanel({
  qrData,
  qrLoading,
  isLocked,
  isCheckout,
  sessionClosed,
  checkoutActive,
  timerVal,
  timerColor,
  circ,
  offset,
  onRefreshQr,
  onToggleLock,
  onOpenCheckout,
  onCloseSession,
  onMaximize,
}) {
  return (
    <div className="qr-left">
      <div className={isCheckout ? 'mode-badge mode-checkout' : 'mode-badge mode-checkin'}>
        {isCheckout ? '⚡ Chế độ CHECK-OUT' : '✅ Chế độ CHECK-IN'}
      </div>

      <QrDisplay qrData={qrData} qrLoading={qrLoading} isLocked={isLocked} onMaximize={onMaximize} />

      <QrTimer
        isLocked={isLocked}
        timerVal={timerVal}
        timerColor={timerColor}
        circ={circ}
        offset={offset}
        onRefreshQr={onRefreshQr}
      />

      <QrStatus
        sessionClosed={sessionClosed}
        isLocked={isLocked}
        isCheckout={isCheckout}
      />

      <div className="qr-actions">
        <button
          className={isLocked ? 'btn-action btn-unlock' : 'btn-action btn-lock'}
          disabled={checkoutActive || sessionClosed}
          onClick={onToggleLock}
        >
          {isLocked ? '🔓 Mở lại Check-in' : '🔒 Khóa Check-in'}
        </button>

        <div className="btn-row">
          <button
            className="btn-action btn-checkout"
            disabled={checkoutActive || sessionClosed}
            onClick={onOpenCheckout}
          >
            ⚡ Mở Check-out
          </button>

          <button
            className="btn-action btn-close"
            disabled={sessionClosed}
            onClick={onCloseSession}
          >
            ⏹ Kết thúc buổi
          </button>
        </div>
      </div>
    </div>
  );
}

function QrDisplay({ qrData, qrLoading, isLocked, onMaximize }) {
  return (
    <div className="qr-area">
      {isLocked ? (
        <div className="qr-locked">
          <div className="qr-locked-icon">🔒</div>
          <div className="qr-locked-text">
            Điểm danh
            <br />
            đang tạm khóa
          </div>
        </div>
      ) : (
        <>
          {qrLoading && <div className="qr-overlay">Đang làm mới QR…</div>}

          <div 
            className="qr-inner" 
            onClick={qrData ? onMaximize : undefined}
            style={{ cursor: qrData ? 'zoom-in' : 'default' }}
            title={qrData ? "Phóng to mã QR" : ""}
          >
            {qrData ? (
              <>
                <QRCodeSVG value={qrData} size={212} level="M" />
                <div className="qr-zoom-hint">🔍 Nhấn để phóng to</div>
              </>
            ) : (
              <div className="qr-empty">Chưa có mã QR</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QrTimer({
  isLocked,
  timerVal,
  timerColor,
  circ,
  offset,
  onRefreshQr,
}) {
  return (
    <div className="timer-row">
      <div
        className={isLocked ? 'timer-ring timer-ring-locked' : 'timer-ring'}
        onClick={() => {
          if (!isLocked) onRefreshQr();
        }}
        title={isLocked ? 'Đang khóa' : 'Nhấn để làm mới ngay'}
      >
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="4"
          />

          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke={timerColor}
            strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="timer-progress"
          />
        </svg>

        <div className="timer-num" style={{ color: timerColor }}>
          {isLocked ? '—' : timerVal}
        </div>
      </div>

      <div>
        <div className="timer-info-label">
          {isLocked ? (
            'Tạm dừng'
          ) : (
            <>
              Làm mới sau <span style={{ color: timerColor }}>{timerVal}s</span>
            </>
          )}
        </div>

        <div className="timer-info-sub">
          {isLocked ? 'Mở khóa để tiếp tục' : 'Click vòng tròn để refresh ngay'}
        </div>
      </div>
    </div>
  );
}

function QrStatus({ sessionClosed, isLocked, isCheckout }) {
  const className = sessionClosed
    ? 'status-pill status-closed'
    : isLocked
      ? 'status-pill status-locked'
      : isCheckout
        ? 'status-pill status-checkout'
        : 'status-pill status-active';

  const dotColor = sessionClosed
    ? '#EF4444'
    : isLocked
      ? '#94A3B8'
      : isCheckout
        ? '#F59E0B'
        : '#10B981';

  const text = sessionClosed
    ? 'Buổi học đã kết thúc'
    : isLocked
      ? 'Điểm danh đang tạm khóa'
      : isCheckout
        ? 'Check-out đang mở'
        : 'Buổi học đang diễn ra';

  return (
    <div className={className}>
      <div
        className="status-dot pulse-dot"
        style={{
          background: dotColor,
          animationPlayState: sessionClosed || isLocked ? 'paused' : 'running',
        }}
      />

      {text}
    </div>
  );
}

function AttendancePanel({
  attendances,
  presentCount,
  onTime,
  lateCount,
  absent,
  total,
  sessionId,
  navigate,
}) {
  return (
    <div className="qr-right">
      <StatsBar
        presentCount={presentCount}
        onTime={onTime}
        lateCount={lateCount}
        absent={absent}
        total={total}
      />

      <div className="att-list-header">
        <span>Danh sách điểm danh</span>

        <button
          className="manual-edit-btn"
          onClick={() => navigate(`/sessions/${sessionId}/attendances`)}
          title="Sửa điểm danh thủ công"
        >
          🖊️ Sửa thủ công
        </button>
      </div>

      <div className="att-list">
        {attendances.length === 0 ? (
          <AttendanceEmpty />
        ) : (
          attendances.map((attendance) => (
            <AttendanceRow key={attendance.attendanceId} attendance={attendance} />
          ))
        )}
      </div>
    </div>
  );
}

function StatsBar({ presentCount, onTime, lateCount, absent, total }) {
  return (
    <div className="att-stats">
      <StatCell label="Có mặt" value={presentCount} sub={`/ ${total} sinh viên`} color="#10B981" />
      <StatCell label="Đúng giờ" value={onTime} sub="sinh viên" color="#0EA5E9" />
      <StatCell label="Muộn" value={lateCount} sub="sinh viên" color="#F59E0B" />
      <StatCell label="Vắng" value={absent} sub="sinh viên" color="#EF4444" />
    </div>
  );
}

function StatCell({ label, value, sub, color }) {
  return (
    <div className="stat-cell">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function AttendanceEmpty() {
  return (
    <div className="att-empty">
      <div className="att-empty-icon">📋</div>
      <div className="att-empty-text">
        Chưa có sinh viên nào điểm danh.
        <br />
        Danh sách cập nhật real-time khi SV quét mã.
      </div>
    </div>
  );
}

function AttendanceRow({ attendance }) {
  const avatarClass = attendance.status === 'absent'
    ? 'att-av att-av-absent'
    : attendance.isLate
      ? 'att-av att-av-late'
      : 'att-av att-av-present';

  return (
    <div className="att-row">
      <div className={avatarClass}>
        {attendance.fullName?.split(' ').pop()?.[0] ?? '?'}
      </div>

      <div className="att-info">
        <div className="att-name">{attendance.fullName}</div>

        <div className="att-code">
          {attendance.studentCode}
          {attendance.lateMinutes > 0 && (
            <span className="att-late-note"> · Muộn {attendance.lateMinutes}p</span>
          )}
        </div>
      </div>

      <div className="att-right">
        {attendance.scannedAt && (
          <span className="att-time">{fmtTime(attendance.scannedAt)}</span>
        )}

        {attendance.checkedOutAt && (
          <span className="att-time att-checkout-time">
            → {fmtTime(attendance.checkedOutAt)}
          </span>
        )}

        {attendance.gpsVerified === false && (
          <span title="GPS ngoài khu vực" className="att-gps-error">
            📍❌
          </span>
        )}

        <StatusBadge
          status={attendance.status}
          isLate={attendance.isLate}
          leftEarly={attendance.leftEarly}
          checkedOutAt={attendance.checkedOutAt}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status, isLate, leftEarly, checkedOutAt }) {
  if (status === 'absent') {
    return <Badge className="qr-badge qr-badge-absent" label="Vắng" />;
  }

  if (status === 'excused') {
    return <Badge className="qr-badge qr-badge-excused" label="Có phép" />;
  }

  if (leftEarly) {
    return <Badge className="qr-badge qr-badge-left-early" label="Về sớm" />;
  }

  if (checkedOutAt) {
    return <Badge className="qr-badge qr-badge-checkout" label="Check-out ✓" />;
  }

  if (isLate) {
    return <Badge className="qr-badge qr-badge-late" label="Muộn" />;
  }

  return <Badge className="qr-badge qr-badge-on-time" label="Đúng giờ" />;
}

function Badge({ className, label }) {
  return <span className={className}>{label}</span>;
}

function OpenErrorModal({ openError, onBack }) {
  return (
    <div className="open-error-overlay">
      <div className="open-error-card">
        <div className="open-error-icon">⚠️</div>

        <div className="open-error-title">Không thể mở buổi học</div>

        <div className="open-error-message">{openError}</div>

        <button className="open-error-btn" onClick={onBack}>
          ← Quay lại
        </button>
      </div>
    </div>
  );
}

function CheckoutModal({
  modalOpen,
  checkoutMins,
  checkoutLoading,
  presentCount,
  setCheckoutMins,
  onClose,
  onConfirm,
}) {
  return (
    <div
      className={modalOpen ? 'mo-overlay open' : 'mo-overlay'}
      onClick={(event) => {
        if (event.target.classList.contains('mo-overlay')) {
          onClose();
        }
      }}
    >
      <div className="mo" onClick={(event) => event.stopPropagation()}>
        <div className="mo-title">⚡ Kích hoạt Check-out</div>

        <div className="mo-sub">
          Sinh viên không quét trong thời gian cho phép sẽ bị đánh dấu{' '}
          <strong>về sớm</strong>. Buổi học vẫn tiếp tục bình thường sau khi cửa
          sổ check-out đóng.
        </div>

        <div className="mo-warn">
          ⚠️ SV không quét trong {checkoutMins} phút →{' '}
          <strong>left_early = true</strong>. Trạng thái vẫn là "Có mặt".
        </div>

        <div className="mo-field">
          <label>Thời gian cho SV quét (phút)</label>

          <input
            type="number"
            value={checkoutMins}
            onChange={(event) => setCheckoutMins(+event.target.value)}
            min="2"
            max="15"
          />
        </div>

        <div className="mo-info">
          {presentCount} SV đã check-in · Deadline:{' '}
          <strong>{checkoutMins} phút</strong> kể từ lúc kích hoạt
        </div>

        <div className="mo-actions">
          <button className="btn-mo btn-mo-cancel" onClick={onClose}>
            Huỷ
          </button>

          <button
            className="btn-mo btn-mo-confirm"
            disabled={checkoutLoading}
            onClick={onConfirm}
          >
            {checkoutLoading ? 'Đang kích hoạt…' : '⚡ Kích hoạt ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}
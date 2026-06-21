import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../css/Login.css';
import { useError } from '../contexts/ErrorContext';
import { SkeletonLine } from '../components/LoadingStates';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const { showError } = useError();
  const [email, setEmail] = useState('');
  const [gsiReady, setGsiReady] = useState(false);

  // Nếu user đã đăng nhập, tự redirect về trang phù hợp
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const decoded = jwtDecode(token);

      // Kiểm tra token hết hạn chưa
      if (decoded.exp && decoded.exp * 1000 < Date.now()) return;

      const userRoles = decoded.roles;
      const rolesArray = Array.isArray(userRoles)
        ? userRoles
        : userRoles
          ? [userRoles]
          : [];

      const isAdmin = rolesArray.some(
        (role) =>
          role &&
          (String(role).toUpperCase() === 'ADMIN' ||
            String(role).toUpperCase() === 'ROLE_ADMIN')
      );

      const isLecturer = rolesArray.some(
        (role) =>
          role &&
          (String(role).toUpperCase() === 'LECTURER' ||
            String(role).toUpperCase() === 'ROLE_LECTURER')
      );

      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isLecturer) {
        navigate('/', { replace: true });
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, [navigate]);

  const handleCredentialResponse = useCallback(
    async (response) => {
      try {
        let payload;
        try {
          payload = jwtDecode(response.credential);
          setEmail(payload.email || 'Google user');

          if (payload.name) {
            localStorage.setItem('userName', payload.name);
          }
          if (payload.picture) {
            localStorage.setItem('userAvatar', payload.picture);
          }
        } catch {
          setEmail('Google user');
          throw new Error('Tài khoản Google không hợp lệ.');
        }

        const res = await fetch(BASE_URL + '/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: response.credential,
          }),
        });

        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error('Phản hồi từ máy chủ không hợp lệ.');
        }

        if (!res.ok) {
          throw new Error(data.message || 'Lỗi xác thực không xác định từ máy chủ.');
        }

        const accessToken = data.result && data.result.accessToken;
        const refreshToken = data.result && data.result.refreshToken;

        if (!accessToken || !refreshToken) {
          throw new Error('Phản hồi không đầy đủ từ máy chủ.');
        }

        let isAdmin = false;
        let isLecturer = false;

        try {
          const decoded = jwtDecode(accessToken);
          const userRoles = decoded.roles;
          const rolesArray = Array.isArray(userRoles)
            ? userRoles
            : userRoles
              ? [userRoles]
              : [];

          isAdmin = rolesArray.some(
            (role) =>
              role &&
              (String(role).toUpperCase() === 'ADMIN' ||
                String(role).toUpperCase() === 'ROLE_ADMIN')
          );

          isLecturer = rolesArray.some(
            (role) =>
              role &&
              (String(role).toUpperCase() === 'LECTURER' ||
                String(role).toUpperCase() === 'ROLE_LECTURER')
          );
        } catch {
          throw new Error('Không thể kiểm tra quyền truy cập.');
        }

        if (!isAdmin && !isLecturer) {
          throw new Error('Tài khoản của bạn không có quyền truy cập hệ thống này.');
        }

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        navigate(isAdmin ? '/admin' : '/');
      } catch (error) {
        showError(error.message || "Lỗi kết nối tới máy chủ.");
      }
    },
    [navigate, showError]
  );

  useEffect(() => {
    const initializeGsi = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        {
          theme: 'outline',
          size: 'large',
          width: 300,
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left'
        }
      );
      setGsiReady(true);
    };

    if (window.google) {
      initializeGsi();
      return undefined;
    }

    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval);
        initializeGsi();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [handleCredentialResponse]);

  return (
    <div className="login-page-wrapper">
      <div className="page">
        {/* Ambient */}
        <div className="glow g1"></div>
        <div className="glow g2"></div>
        <div className="glow g3"></div>

        {/* ── MAIN ── */}
        <main className="main">
          {/* LEFT: Hero + Laptop + Stats */}
          <div className="hero">
            <div className="hero-tag">
              <span className="blink-dot"></span>
              Nền tảng điểm danh hiện đại
            </div>

            <h1 className="hero-title">
              Điểm danh<br/>thông minh<br/>bằng <span className="hl">mã QR</span>
            </h1>

            <p className="hero-desc">
              Quét – xác nhận – lưu trữ tức thì.<br/>
              Không giấy tờ, chính xác 100%.
            </p>

            <div className="phone-row">
              {/* Desktop Laptop Mockup */}
              <div className="laptop">
                <div className="lscreen">
                  <div className="lsidebar">
                    <div className="lsbar-item active"></div>
                    <div className="lsbar-item"></div>
                    <div className="lsbar-item"></div>
                  </div>
                  <div className="lmain">
                    <div className="ltopbar">
                      <div className="ltop-title">QRAttend Dashboard</div>
                      <div className="ltop-av"></div>
                    </div>
                    <div className="lcontent">
                      <div className="lcol-list">
                        <div className="lrow"></div>
                        <div className="lrow shorter"></div>
                        <div className="lrow"></div>
                        <div className="lrow"></div>
                        <div className="lrow shorter"></div>
                      </div>
                      <div className="lcol-qr">
                        <div className="lqr-box">
                          <svg className="lqr-svg" viewBox="0 0 62 62" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="#0a2540" strokeWidth="2.2"/>
                            <rect x="6" y="6" width="12" height="12" rx="1.5" fill="#2979ff"/>
                            <rect x="40" y="2" width="20" height="20" rx="3" fill="none" stroke="#0a2540" strokeWidth="2.2"/>
                            <rect x="44" y="6" width="12" height="12" rx="1.5" fill="#2979ff"/>
                            <rect x="2" y="40" width="20" height="20" rx="3" fill="none" stroke="#0a2540" strokeWidth="2.2"/>
                            <rect x="6" y="44" width="12" height="12" rx="1.5" fill="#2979ff"/>
                            <rect x="28" y="2" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="28" y="8" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="28" y="14" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="28" y="28" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="34" y="28" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="40" y="28" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="46" y="28" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="52" y="28" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="28" y="34" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="40" y="34" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="52" y="34" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="28" y="40" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="34" y="40" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="46" y="40" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="28" y="46" width="4" height="4" rx=".8" fill="#0a2540"/>
                            <rect x="40" y="46" width="4" height="4" rx=".8" fill="#2979ff"/>
                            <rect x="52" y="52" width="4" height="4" rx=".8" fill="#0a2540"/>
                          </svg>
                        </div>
                        <div className="lqr-hint">Quét mã để điểm danh</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: Form Card */}
          <div className="form-col">
            <div className="form-card">
              <div className="rc-eyebrow">Hệ thống nội bộ</div>
              <h2 className="rc-title">Chào mừng<br/>trở lại 👋</h2>
              <p className="rc-desc">
                Đăng nhập để truy cập bảng điều khiển<br/>điểm danh của tổ chức bạn.
              </p>

              <div className="divider">
                <span>Tiếp tục với tài khoản tổ chức</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', minHeight: '44px' }}>
                <div id="g_id_signin" style={{ display: gsiReady ? 'block' : 'none' }}></div>
                {!gsiReady && (
                  <div className="login-google-skeleton" style={{ width: 300, display: 'flex', alignItems: 'center' }}>
                    <SkeletonLine width="100%" height={42} radius={6} />
                  </div>
                )}
              </div>

              <div className="trust-row">
                <div className="tr-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="tr-text">
                  Chỉ <strong>tài khoản Google nội bộ</strong> được phép đăng nhập.
                </div>
              </div>

              <div className="ssl-badge">
                <div className="ssl-dot"></div>
                <span>Kết nối SSL · Dữ liệu nội bộ bảo mật</span>
              </div>

              <p className="terms">
                Bằng cách đăng nhập, bạn đồng ý với <br/>
                <a href="#">Chính sách bảo mật</a> và
                <a href="#"> Quy định sử dụng</a>.
              </p>
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="footer">
          © 2026 QRAttend · Hệ thống nội bộ
        </footer>
      </div>
    </div>
  );
}

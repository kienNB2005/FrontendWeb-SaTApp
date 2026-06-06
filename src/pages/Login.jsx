import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// const BASE_URL = 'https://backend-satapp.onrender.com';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  const padded = base64.padEnd(
    base64.length + (4 - (base64.length % 4)) % 4,
    '='
  );

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const json = new TextDecoder('utf-8').decode(bytes);

  return JSON.parse(json);
}

export default function Login() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('');
  const [title, setTitle] = useState('Đăng nhập với Google');
  const [titleColor, setTitleColor] = useState('var(--tx)');
  const [statusColor, setStatusColor] = useState('var(--tx3)');
  const [email, setEmail] = useState('');
  const [showResponse, setShowResponse] = useState(false);

  const handleCredentialResponse = useCallback(
    async (response) => {
      try {
        const payload = decodeJwtPayload(response.credential);

        setEmail(payload.email || 'Google user');

        // Lưu name và picture từ Google để hiển thị trên Sidebar
        if (payload.name) {
          localStorage.setItem('userName', payload.name);
        }

        if (payload.picture) {
          localStorage.setItem('userAvatar', payload.picture);
        }
      } catch {
        setEmail('Google user');
      }

      setShowResponse(true);
      setTitle('Đăng nhập với Google');
      setTitleColor('var(--tx)');
      setStatus('Đang xác thực với máy chủ...');
      setStatusColor('var(--tx3)');

      try {
        const res = await fetch(BASE_URL + '/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: response.credential,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setTitle('Đăng nhập thất bại');
          setTitleColor('var(--rd)');
          setStatus('Lỗi xác thực: ' + (data.message || 'Không xác định'));
          setStatusColor('var(--rd)');
          return;
        }

        const accessToken = data.result && data.result.accessToken;
        const refreshToken = data.result && data.result.refreshToken;

        if (!accessToken || !refreshToken) {
          setTitle('Đăng nhập thất bại');
          setTitleColor('var(--rd)');
          setStatus('Phản hồi không đầy đủ từ máy chủ.');
          setStatusColor('var(--rd)');
          return;
        }

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        setTitle('Đăng nhập thành công');
        setTitleColor('var(--gr)');
        setStatus('Xác thực thành công, đang chuyển tới Dashboard...');
        setStatusColor('var(--gr)');

        setTimeout(() => {
          try {
            const decoded = jwtDecode(accessToken);
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

            if (isAdmin) {
              navigate('/admin');
            } else {
              navigate('/');
            }
          } catch {
            navigate('/');
          }
        }, 700);
      } catch (error) {
        setTitle('Đăng nhập thất bại');
        setTitleColor('var(--rd)');
        setStatus('Lỗi kết nối tới máy chủ: ' + error.message);
        setStatusColor('var(--rd)');
      }
    },
    [navigate]
  );

  useEffect(() => {
    const initializeGsi = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id:
          '1053516508108-d32l6qi3ie8fk671bg2iv4cf7m9kve8l.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        {
          theme: 'outline',
          size: 'large',
        }
      );
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        width: '100%',
      }}
    >
      <div
        className="card"
        style={{
          padding: '40px 30px',
          width: '380px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎓</div>

        <h2 style={{ marginBottom: '8px', fontSize: '20px' }}>QRAttend</h2>

        <p
          style={{
            color: 'var(--tx3)',
            fontSize: '13px',
            marginBottom: '30px',
          }}
        >
          Đăng nhập hệ thống bằng Google
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
            minHeight: '40px',
          }}
        >
          <div id="g_id_signin"></div>
        </div>

        {showResponse && (
          <div
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--bd)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'left',
              marginTop: '20px',
            }}
          >
            <h3
              style={{
                color: titleColor,
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '600',
              }}
            >
              {title}
            </h3>

            <p style={{ fontSize: '12px', marginBottom: '6px' }}>
              <strong>Email:</strong> {email}
            </p>

            <p
              style={{
                fontSize: '11px',
                color: statusColor,
                lineHeight: '1.4',
              }}
            >
              {status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
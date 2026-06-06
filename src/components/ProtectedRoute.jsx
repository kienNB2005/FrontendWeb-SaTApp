import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu route có yêu cầu quyền cụ thể (ví dụ: allowedRoles = ['ADMIN'])
  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const decoded = jwtDecode(token);
      
      // Đọc quyền từ token. Backend đang claim("roles", user.getRole())
      const userRoles = decoded.roles; 
      
      // Đảm bảo userRoles là một mảng để dễ bề kiểm tra
      const rolesArray = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
      
      // Kiểm tra xem quyền của người dùng có nằm trong danh sách allowedRoles không (bỏ qua tiền tố ROLE_ nếu có)
      const hasRequiredRole = rolesArray.some(role => {
        if (!role) return false;
        const normalizedRole = String(role).replace('ROLE_', '').toUpperCase();
        return allowedRoles.some(ar => ar.toUpperCase() === normalizedRole);
      });
      
      if (!hasRequiredRole) {
        // Kiểm tra role của user để điều hướng về đúng trang mặc định
        let userRole = '';
        if (rolesArray && rolesArray.length > 0) {
          userRole = String(rolesArray[0]).replace('ROLE_', '').toUpperCase();
        }

        if (userRole === 'ADMIN') {
          return <Navigate to="/admin" replace />;
        } else if (userRole === 'LECTURER') {
          return <Navigate to="/" replace />;
        } else {
          // Sinh viên hoặc không có quyền hợp lệ thì văng ra login
          return <Navigate to="/login" replace />;
        }
      }
    } catch (error) {
      // Nếu token lỗi (giải mã thất bại), đá về trang đăng nhập
      console.error("Lỗi giải mã token:", error);
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}

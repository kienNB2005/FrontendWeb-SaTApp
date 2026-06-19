import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ButtonSpinner } from './LoadingStates';
import logo from "../assets/img/student-attendance-logo.png";
import { LayoutDashboard, GraduationCap, CalendarDays ,SquareCheckBig,
          BookOpen, Users, UserCog, DoorOpen, Library, Bookmark,
          ChartColumn, LogOut, ClipboardCheck, ListTodo, Contact, Menu, X} from "lucide-react";

export default function Sidebar({ role, isOpen, onClose, isCollapsed, toggleCollapse }) {
  const isAdmin = role === 'admin';
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const userName = localStorage.getItem('userName') || (isAdmin ? 'Quản trị viên' : 'Giảng viên');
  const userAvatar = localStorage.getItem('userAvatar');

  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Gọi API backend để xóa refresh token khỏi database
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Lỗi khi logout:', error);
    } finally {
      // Luôn dọn dẹp bộ nhớ nội bộ cho dù gọi API có lỗi hay không
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userAvatar');
      navigate('/login');
    }
  };

  return (
    <aside className={`sb ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sb-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sb-logo-ic">
            <img src={logo} alt="Logo" />
          </div>
          <div className="sb-logo-text-wrap">
            <div className="sb-logo-tx">QRAttend</div>
            <div className="sb-logo-su">Hệ thống điểm danh QR</div>
          </div>
        </div>
        <button className="desktop-toggle-btn" onClick={toggleCollapse}>
          <Menu size={20} />
        </button>
        <button className="mobile-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      {/* User info */}
      <div className="sb-user">
        {userAvatar ? (
          <img src={userAvatar} alt="Avatar" className="sb-av" style={{ border: 'none', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        ) : (
          <div 
            className="sb-av" 
            style={{ 
              background: isAdmin ? 'linear-gradient(135deg,#3B82F6,#A855F7)' : 'linear-gradient(135deg,#22C55E,#14B8A6)' 
            }}
          >
            {userName.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <div className="sb-un">{userName}</div>
          <div className="sb-ur">{isAdmin ? 'Admin · Hệ thống' : 'Giảng viên · Khoa CNTT'}</div>
        </div>
      </div>


      {/* Navigation */}
      {!isAdmin ? (
        <div id="nav-gv">
          <div className="sb-sec">Quản lý giảng dạy</div>
          <NavLink to="/" state={{ fromSidebar: true }} className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`} end>
            <LayoutDashboard size={16} className="sb-icon" />
            <span>Tổng quan</span>
          </NavLink>
          <NavLink to="/tkb" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <CalendarDays size={16} className="sb-icon" />
            <span>Thời khóa biểu</span>
          </NavLink>
          <NavLink to="/sessions" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <ClipboardCheck size={16} className="sb-icon" />
            <span>Sổ điểm danh</span>
          </NavLink>
          <NavLink to="/requests" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <ListTodo size={16} className="sb-icon" />
            <span>Yêu cầu của tôi</span>
          </NavLink>

          <div className="sb-sec">Báo cáo</div>
          <NavLink to="/report" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <ChartColumn size={16} className="sb-icon" />
            <span>Lớp giảng dạy</span>
          </NavLink>
          <NavLink to="/homeroom" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <Contact size={16} className="sb-icon" />
            <span>Lớp chủ nhiệm</span>
          </NavLink>
        </div>
      ) : (
        <div id="nav-admin">
          <div className="sb-sec">Tổng quan</div>

          <NavLink to="/admin" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`} end>
            <LayoutDashboard size={16} className="sb-icon" />
            <span>Dashboard Admin</span>
          </NavLink>

          <NavLink to="/admin/requests" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <SquareCheckBig size={16} className="sb-icon" />
            <span>Phê duyệt giảng dạy</span>
          </NavLink>

          <div className="sb-sec">Quản lý danh mục</div>

          <NavLink to="/admin/tkb" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <CalendarDays size={16} className="sb-icon" />
            <span>Thời khóa biểu</span>
          </NavLink>

          <NavLink to="/admin/faculties" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <GraduationCap size={16} className="sb-icon" />
            <span>Quản lý Khoa</span>
          </NavLink>

          <NavLink to="/admin/departments" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <BookOpen size={16} className="sb-icon" />
            <span>Quản lý Ngành</span>
          </NavLink>

          <NavLink to="/admin/administrative-classes" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <Users size={16} className="sb-icon" />
            <span>Lớp hành chính</span>
          </NavLink>

          <NavLink to="/admin/students" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <UserCog size={16} className="sb-icon" />
            <span>Sinh viên</span>
          </NavLink>

          <NavLink to="/admin/lecturers" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <UserCog size={16} className="sb-icon" />
            <span>Giảng viên</span>
          </NavLink>

          <NavLink to="/admin/rooms" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <DoorOpen size={16} className="sb-icon" />
            <span>Phòng học</span>
          </NavLink>

          <NavLink to="/admin/subjects" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <Library size={16} className="sb-icon" />
            <span>Môn học</span>
          </NavLink>

          <NavLink to="/admin/semesters" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <Bookmark size={16} className="sb-icon" />
            <span>Học kỳ</span>
          </NavLink>

          <div className="sb-sec">Báo cáo</div>

          <NavLink to="/admin/report" className={({ isActive }) => `sb-it ${isActive ? 'on' : ''}`}>
            <ChartColumn size={16} className="sb-icon" />
            <span>Báo cáo toàn trường</span>
          </NavLink>
        </div>
      )}
      <div className="sb-foot">
        <button className="sb-out" onClick={handleLogout} disabled={logoutLoading}>
          {logoutLoading ? (
            <ButtonSpinner size={16} className="sb-icon" />
          ) : (
            <LogOut size={16} className="sb-icon" />
          )}
          <span>{logoutLoading ? '\u0110ang \u0111\u0103ng xu\u1ea5t...' : '\u0110\u0103ng xu\u1ea5t'}</span>
        </button>
      </div>
    </aside>
  );
}

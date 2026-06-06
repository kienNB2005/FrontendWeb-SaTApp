import { useLocation } from 'react-router-dom';
import { Bell, Menu } from "lucide-react";

const PAGE_INFO = [
  { path: '/', section: 'Tổng quan', title: 'Dashboard', sub: 'Thứ 3, 02/09/2025 · HK1-2024-2025', exact: true },
  { path: '/tkb', section: 'Quản lý giảng dạy', title: 'Thời khóa biểu', sub: 'Lịch trình giảng dạy của bạn' },
  { path: '/sessions', section: 'Quản lý giảng dạy', title: 'Sổ điểm danh', sub: '15 buổi · HK1-2024-2025' },
  { path: '/sessions/', section: 'Quản lý giảng dạy', title: 'Chi tiết điểm danh', sub: 'Buổi học · CTDL · K22A' },
  { path: '/report', section: 'Báo cáo', title: 'Lớp giảng dạy', sub: 'CTDL · CNTT-K22A · HK1-2024-2025' },
  { path: '/homeroom', section: 'Báo cáo', title: 'Lớp chủ nhiệm', sub: 'CNTT-K22A · HK1-2024-2025' },
  { path: '/requests', section: 'Quản lý giảng dạy', title: 'Yêu cầu của tôi', sub: 'Theo dõi yêu cầu chấm công và điểm danh' },
  { path: '/qr', section: 'Quản lý giảng dạy', title: 'Điểm danh QR', sub: 'Quét mã và quản lý buổi học' },
  { path: '/admin', section: 'Tổng quan', title: 'Dashboard Admin', sub: 'HK1-2024-2025 · Toàn trường', exact: true },
  { path: '/admin/requests', section: 'Tổng quan', title: 'Phê duyệt giảng dạy', sub: 'Quản lý yêu cầu của giảng viên' },
  { path: '/admin/tkb', section: 'Quản lý danh mục', title: 'Thời khóa biểu', sub: 'Upload file TKB từ trường' },
  { path: '/admin/faculties', section: 'Quản lý danh mục', title: 'Quản lý Khoa', sub: 'Import & Quản lý danh sách Khoa' },
  { path: '/admin/departments', section: 'Quản lý danh mục', title: 'Quản lý Ngành', sub: 'Import & Quản lý danh sách Ngành' },
  { path: '/admin/administrative-classes', section: 'Quản lý danh mục', title: 'Lớp hành chính', sub: 'Quản lý danh sách lớp hành chính' },
  { path: '/admin/students', section: 'Quản lý danh mục', title: 'Sinh viên', sub: 'Import & quản lý danh sách Sinh viên' },
  { path: '/admin/lecturers', section: 'Quản lý danh mục', title: 'Giảng viên', sub: 'Import & quản lý danh sách Giảng viên' },
  { path: '/admin/rooms', section: 'Quản lý danh mục', title: 'Phòng học', sub: 'Quản lý thông tin phòng học' },
  { path: '/admin/subjects', section: 'Quản lý danh mục', title: 'Môn học', sub: 'Quản lý danh sách môn học' },
  { path: '/admin/semesters', section: 'Quản lý danh mục', title: 'Học kỳ', sub: 'Quản lý thông tin học kỳ' },
  { path: '/admin/report', section: 'Báo cáo', title: 'Báo cáo Toàn trường', sub: 'HK1-2024-2025' },
];

function getPageInfo(pathname) {
  const exactMatch = PAGE_INFO.find(item => item.exact && item.path === pathname);
  if (exactMatch) return exactMatch;
  const prefixMatch = PAGE_INFO.find(item => !item.exact && pathname.startsWith(item.path));
  return exactMatch || prefixMatch || { section: 'Tổng quan', title: 'Dashboard', sub: '' };
}

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const { section, title, sub } = getPageInfo(location.pathname);
  const displayTitle = section || 'Dashboard';
  const displaySub = title ? `${title} · ${sub}` : sub || '';

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="topbar-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div>
          <div className="tb-title" id="pgTitle">{displayTitle}</div>
          <div className="tb-sub" id="pgSub">{displaySub}</div>
        </div>
      </div>
      <div className="tb-acts">
        <div className="srch">
        </div>
      </div>
    </div>
  );
}

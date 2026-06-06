import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tkb from './pages/Tkb';
import QR from './pages/QR';
import Sessions from './pages/Sessions';
import Attendance from './pages/Attendance';
import Report from './pages/Report';
import Homeroom from './pages/Homeroom';
import AdminDashboard from './pages/AdminDashboard';
import AdminTkb from './pages/AdminTkb';

import AdminRooms from './pages/AdminRooms';
import AdminSubjects from './pages/AdminSubjects';
import AdminSemesters from './pages/AdminSemesters';
import AdminReport from './pages/AdminReport';
import AdminFaculties from './pages/AdminFaculties';
import AdminDepartments from './pages/AdminDepartments';
import AdminAdministrativeClasses from './pages/AdminAdministrativeClasses';
import AdminStudents from './pages/AdminStudents';
import AdminLecturers from './pages/AdminLecturers';
import LecturerRequests from './pages/LecturerRequests';
import AdminRequests from './pages/AdminRequests';

import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-center" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            {/* GV Routes */}
            <Route element={<ProtectedRoute allowedRoles={['LECTURER']} />}>
              <Route index element={<Dashboard />} />
              <Route path="tkb" element={<Tkb />} />
              <Route path="qr" element={<QR />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="sessions/:sessionId/attendances" element={<Attendance />} />
              <Route path="report" element={<Report />} />
              <Route path="homeroom" element={<Homeroom />} />
              <Route path="requests" element={<LecturerRequests />} />
            </Route>

            {/* Admin Routes - Yêu cầu quyền ADMIN */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/requests" element={<AdminRequests />} />
              <Route path="admin/tkb" element={<AdminTkb />} />
              <Route path="admin/faculties" element={<AdminFaculties />} />
              <Route path="admin/departments" element={<AdminDepartments />} />
              <Route path="admin/administrative-classes" element={<AdminAdministrativeClasses />} />
              <Route path="admin/students" element={<AdminStudents />} />
              <Route path="admin/lecturers" element={<AdminLecturers />} />
              <Route path="admin/rooms" element={<AdminRooms />} />
              <Route path="admin/subjects" element={<AdminSubjects />} />
              <Route path="admin/semesters" element={<AdminSemesters />} />
              <Route path="admin/report" element={<AdminReport />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

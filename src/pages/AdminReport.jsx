import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import '../css/AdminReport.css';

export default function AdminReport() {
  const [semesters, setSemesters] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [reportData, setReportData] = useState({ summary: {}, rows: [] });
  const [loading, setLoading] = useState(false);

  // Fetch initial data: Semesters and Faculties
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [semRes, facRes, depRes] = await Promise.all([
          api.get('/api/v1/semesters'),
          api.get('/api/v1/faculties'),
          api.get('/api/v1/departments')
        ]);
        
        const sems = semRes.data?.result || semRes.data || [];
        setSemesters(sems);
        
        // Auto-select active semester or first one
        const activeSem = sems.find(s => s.status === 'ACTIVE');
        if (activeSem) {
          setSelectedSemester(activeSem.id);
        } else if (sems.length > 0) {
          setSelectedSemester(sems[0].id);
        }

        setFaculties(facRes.data?.result || facRes.data || []);
        setDepartments(depRes.data?.result || depRes.data || []);
      } catch (err) {
        console.error('Failed to fetch filters', err);
      }
    };
    fetchFilters();
  }, []);

  // Reset department when faculty changes
  useEffect(() => {
    setSelectedDepartment('');
  }, [selectedFaculty]);

  // Fetch report data when filters change
  useEffect(() => {
    if (!selectedSemester) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = { semesterId: selectedSemester };
        if (selectedFaculty) params.facultyId = selectedFaculty;
        if (selectedDepartment) params.departmentId = selectedDepartment;
        if (searchTerm) params.search = searchTerm;
        
        const res = await api.get('/api/v1/reports/admin/school-wide', { params });
        setReportData(res.data?.result || res.data || { summary: {}, rows: [] });
      } catch (err) {
        console.error('Failed to fetch report data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedSemester, selectedFaculty, selectedDepartment, searchTerm]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setSearchTerm(searchInput);
    }
  };

  const reportStats = useMemo(() => [
    {
      color: 'bl',
      label: 'Tổng số lớp',
      value: reportData.summary?.totalClasses || 0,
    },
    {
      color: 'gr',
      label: 'Tỉ lệ đi học trung bình',
      value: `${reportData.summary?.avgAttendanceRate || 100}%`,
    },
    {
      color: 'am',
      label: 'Lớp dưới chuẩn (<75%)',
      value: reportData.summary?.underThresholdCount || 0,
    },
    {
      color: 'pu',
      label: 'Tổng số buổi đã dạy',
      value: reportData.summary?.totalSessionsTaught || 0,
    },
  ], [reportData.summary]);

  return (
    <div className="page active">
      <ReportHeader />

      <ReportToolbar 
        semesters={semesters}
        faculties={faculties}
        departments={departments}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        selectedFaculty={selectedFaculty}
        setSelectedFaculty={setSelectedFaculty}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
      />

      <ReportStats stats={reportStats} />

      <ReportTable 
        rows={reportData.rows || []} 
        loading={loading}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        handleSearch={handleSearch}
      />
    </div>
  );
}

function ReportHeader() {
  return (
    <div className="adm-bar">
      <div className="adm-ic">📊</div>
      <div>
        <div className="ar-title">Báo cáo Điểm danh Toàn trường</div>
        <div className="ar-subtitle">
          Tổng hợp tình hình điểm danh của tất cả các lớp trong học kỳ
        </div>
      </div>
    </div>
  );
}

function ReportToolbar({ 
  semesters, faculties, departments, 
  selectedSemester, setSelectedSemester, 
  selectedFaculty, setSelectedFaculty,
  selectedDepartment, setSelectedDepartment 
}) {
  const filteredDepartments = selectedFaculty 
    ? departments.filter(d => d.facultyId == selectedFaculty) 
    : departments;

  return (
    <div className="ar-toolbar">
      <select 
        className="fi ar-filter" 
        value={selectedSemester} 
        onChange={(e) => setSelectedSemester(e.target.value)}
      >
        {semesters.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select 
        className="fi ar-filter" 
        value={selectedFaculty} 
        onChange={(e) => setSelectedFaculty(e.target.value)}
      >
        <option value="">Tất cả Khoa</option>
        {faculties.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      <select 
        className="fi ar-filter" 
        value={selectedDepartment} 
        onChange={(e) => setSelectedDepartment(e.target.value)}
      >
        <option value="">Tất cả Ngành</option>
        {filteredDepartments.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      {/* Đã bỏ nút Xuất Excel và Xuất PDF */}
      <div className="ar-export-actions">
      </div>
    </div>
  );
}

function ReportStats({ stats }) {
  return (
    <div className="sg">
      {stats.map((item) => (
        <div key={item.label} className={`sc ${item.color}`}>
          <div className="sc-lb">{item.label}</div>
          <div className={`sc-vl ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function ReportTable({ rows, loading, searchInput, setSearchInput, handleSearch }) {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Danh sách Lớp học</div>
          <div className="card-su">Thống kê điểm danh theo từng lớp</div>
        </div>

        <div className="srch">
          <span className="srch-ic">🔍</span>
          <input 
            aria-label="Tìm lớp hoặc giảng viên" 
            placeholder="Tìm lớp, giảng viên... (Nhấn Enter)" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      <div className="tbl-wrapper">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th>Tên Lớp</th>
              <th>Môn học</th>
              <th>Giảng viên</th>
              <th>Sĩ số</th>
              <th>Buổi hoàn thành</th>
              <th>Tỉ lệ đi học</th>
              <th>Cảnh báo</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td data-label="Tên Lớp" colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td data-label="Tên Lớp" colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Không có dữ liệu</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.className}-${row.subject}`}
                  className={row.warning ? 'ar-warning-row' : ''}
                >
                  <td data-label="Tên Lớp" className="ar-code">{row.className}</td>
                  <td data-label="Môn học">{row.subject}</td>
                  <td data-label="Giảng viên">{row.lecturer}</td>
                  <td data-label="Sĩ số">{row.totalStudents}</td>
                  <td data-label="Buổi hoàn thành">{row.completedSessions}</td>
                  <td data-label="Tỉ lệ đi học">
                    <span
                      className={
                        row.warning
                          ? 'ar-attendance-rate ar-attendance-danger'
                          : 'ar-attendance-rate ar-attendance-good'
                      }
                    >
                      {row.attendanceRate}%
                    </span>
                  </td>
                  <td data-label="Cảnh báo">
                    {row.warning ? (
                      <span className="bdg b-ab">{row.status}</span>
                    ) : (
                      row.status
                    )}
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
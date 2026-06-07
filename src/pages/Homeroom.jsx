import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../css/Homeroom.css';
export default function Homeroom() {
  const { showError } = useError();

  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [absentLimitPct, setAbsentLimitPct] = useState(20);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hoisted fetch functions
  async function fetchClasses() {
    try {
      const res = await api.get('/api/v1/reports/homeroom/classes');
      if (res.data.code === 1000) {
        setClasses(res.data.result);
        if (res.data.result.length > 0) {
          setSelectedClass(res.data.result[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  }

  async function fetchSemesters(adminClassId) {
    try {
      const res = await api.get(`/api/v1/reports/homeroom/semesters?adminClassId=${adminClassId}`);
      if (res.data.code === 1000) {
        setSemesters(res.data.result);
        if (res.data.result.length > 0) {
          setSelectedSemester(res.data.result[0].id);
        } else {
          setSelectedSemester('');
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  }

  async function fetchSubjects(adminClassId, semesterId) {
    try {
      const res = await api.get(`/api/v1/reports/homeroom/subjects?adminClassId=${adminClassId}&semesterId=${semesterId}`);
      if (res.data.code === 1000) {
        setSubjects(res.data.result);
        setSelectedSubject(''); // Mặc định là "Tất cả các môn"
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  }

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        adminClassId: selectedClass,
        semesterId: selectedSemester,
        absentLimitPct: absentLimitPct
      };
      if (selectedSubject) {
        params.subjectId = selectedSubject;
      }
      
      const res = await api.get('/api/v1/reports/homeroom/data', { params });
      if (res.data.code === 1000) {
        setReportData(res.data.result);
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSemester, selectedSubject, absentLimitPct]);

  useEffect(() => {
    Promise.resolve().then(() => fetchClasses());
  }, []);

  useEffect(() => {
    if (selectedClass) {
      Promise.resolve().then(() => fetchSemesters(selectedClass));
    } else {
      Promise.resolve().then(() => setSemesters([]));
      Promise.resolve().then(() => setSelectedSemester(''));
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      Promise.resolve().then(() => fetchSubjects(selectedClass, selectedSemester));
    } else {
      Promise.resolve().then(() => setSubjects([]));
      Promise.resolve().then(() => setSelectedSubject(''));
    }
  }, [selectedClass, selectedSemester]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      Promise.resolve().then(() => fetchReportData());
    } else {
      Promise.resolve().then(() => setReportData(null));
    }
  }, [selectedClass, selectedSemester, selectedSubject, absentLimitPct, fetchReportData]);

  

  const handleExportExcel = async () => {
    try {
      const params = {
        adminClassId: selectedClass,
        semesterId: selectedSemester,
        absentLimitPct: absentLimitPct
      };
      if (selectedSubject) {
        params.subjectId = selectedSubject;
      }

      const response = await api.get('/api/v1/reports/homeroom/export/excel', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'BaoCaoChuNhiem.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Lỗi xuất excel", error);
      showError(error?.response?.data?.message || error?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
      showError("Không thể xuất file Excel.");
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="page active" id="homeroom-report-page">
      <style>
        {`
          @media print {
            @page {
              margin: 15mm;
              size: auto;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white;
            }
            body * {
              visibility: hidden;
            }
            #homeroom-report-page, #homeroom-report-page * {
              visibility: visible;
            }
            #homeroom-report-page {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            .hide-on-print {
              display: none !important;
            }
            .sg {
              display: none !important;
            }
            .card {
              box-shadow: none !important;
              border: none !important;
            }
            .print-header {
              display: block !important;
              margin-bottom: 20px;
            }
            .tbl th {
              background-color: var(--bg3) !important;
            }
          }
        `}
      </style>

      <div className="hide-on-print" style={{ display: 'flex', gap: '10px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select 
          className="fi" 
          style={{ width: '160px' }} 
          value={selectedClass} 
          onChange={e => setSelectedClass(e.target.value)}
        >
          {classes.length === 0 && <option value="">-- Lớp chủ nhiệm --</option>}
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="fi" 
          style={{ width: '180px' }} 
          value={selectedSemester} 
          onChange={e => setSelectedSemester(e.target.value)}
        >
          {semesters.length === 0 && <option value="">-- Học kỳ --</option>}
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        
        <select 
          className="fi" 
          style={{ width: '220px' }} 
          value={selectedSubject} 
          onChange={e => setSelectedSubject(e.target.value)}
        >
          <option value="">-- Tất cả môn học --</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--tx-2)' }}>Cảnh báo vắng ≥</label>
          <input 
            type="number" 
            className="fi" 
            style={{ width: '70px', textAlign: 'center' }} 
            value={absentLimitPct} 
            onChange={e => setAbsentLimitPct(e.target.value)} 
            min="0" 
            max="100" 
          />
          <span style={{ fontSize: '14px', color: 'var(--tx-2)' }}>%</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-s btn-sm" onClick={handleExportExcel} disabled={!reportData || loading}>📥 Excel</button>
          <button className="btn btn-s btn-sm" onClick={handlePrintPdf} disabled={!reportData || loading}>📄 PDF</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tx-2)' }}>Đang tải dữ liệu báo cáo...</div>
      ) : reportData ? (
        <>
          <div className="sg">
            <div className="sc gr">
              <div className="sc-lb">Tổng SV</div>
              <div className="sc-vl">{reportData.summary.totalStudents}</div>
            </div>
            <div className="sc gr">
              <div className="sc-lb">Tb có mặt</div>
              <div className="sc-vl gr">{reportData.summary.avgAttendanceRate.toFixed(1)}%</div>
            </div>
            <div className="sc am">
              <div className="sc-lb">Dưới ngưỡng</div>
              <div className="sc-vl am">{reportData.summary.underThresholdCount}</div>
              <div className="sc-su">Vắng ≥ {absentLimitPct}%</div>
            </div>
            <div className="sc bl">
              <div className="sc-lb">Buổi đã xong</div>
              <div className="sc-vl bl">{reportData.summary.finishedSessions}/{reportData.summary.totalSessions}</div>
            </div>
          </div>
          <div className="card">
            <div className="hide-on-print" style={{ padding: '16px', borderBottom: '1px solid var(--bd-1)', fontWeight: '600' }}>
              Danh sách điểm danh sinh viên
            </div>
            
            {/* Header dành riêng cho bản in */}
            <div style={{ display: 'none' }} className="print-header">
              <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '20px', textTransform: 'uppercase' }}>BÁO CÁO LỚP CHỦ NHIỆM</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                <div>
                  <div style={{ marginBottom: '6px' }}><strong>Lớp hành chính:</strong> {classes.find(c => c.id === parseInt(selectedClass))?.name || '...'}</div>
                  <div><strong>Học kỳ:</strong> {semesters.find(s => s.id === parseInt(selectedSemester))?.name || '...'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '6px' }}><strong>Môn học:</strong> {selectedSubject ? subjects.find(s => s.id === parseInt(selectedSubject))?.name : 'Tất cả các môn'}</div>
                  <div><strong>Ngưỡng cảnh báo:</strong> Vắng ≥ {absentLimitPct}%</div>
                </div>
              </div>
            </div>

            <div className="ast-table-wrap">
              <table className="ast-responsive-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>STT</th>
                    <th>MSSV</th>
                    <th>Họ tên</th>
                    <th style={{ textAlign: 'center' }}>Có mặt</th>
                    <th style={{ textAlign: 'center' }}>Vắng</th>
                    <th style={{ textAlign: 'center' }}>Có phép</th>
                    <th style={{ textAlign: 'center' }}>Muộn</th>
                    <th style={{ textAlign: 'center' }}>Về sớm</th>
                    <th style={{ textAlign: 'right' }}>Tỉ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.students.map((student, idx) => (
                    <tr key={student.studentCode} style={student.isDanger ? { background: 'rgba(239,68,68,.04)' } : {}}>
                      <td data-label="STT" style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td data-label="MSSV" style={{ fontFamily: 'var(--mo)' }}>{student.studentCode}</td>
                      <td data-label="Họ tên">{student.fullName}</td>
                      <td data-label="Có mặt" style={{ textAlign: 'center' }}>{student.presentCount}</td>
                      <td data-label="Vắng" style={{ textAlign: 'center' }}>{student.absentCount}</td>
                      <td data-label="Có phép" style={{ textAlign: 'center' }}>{student.excusedCount}</td>
                      <td data-label="Muộn" style={{ textAlign: 'center' }}>{student.lateCount}</td>
                      <td data-label="Về sớm" style={{ textAlign: 'center' }}>{student.leftEarlyCount}</td>
                      <td data-label="Tỉ lệ" style={{ textAlign: 'right' }}>
                        <span style={{ 
                          color: student.isDanger ? 'var(--rd)' : (student.attendanceRate >= 80 ? 'var(--gr)' : 'var(--am)'), 
                          fontWeight: '700', 
                          fontFamily: 'var(--mo)' 
                        }}>
                          {student.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.students.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Không có dữ liệu sinh viên</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tx-2)' }}>Vui lòng chọn Lớp và Học kỳ để xem báo cáo.</div>
      )}
    </div>
  );
}

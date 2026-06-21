import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { ButtonSpinner, ReportSkeleton } from '../components/LoadingStates';
import '../css/AdminReport.css';
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
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const filtersLoading = loadingClasses || loadingSemesters || loadingSubjects;

  // Hoisted fetch functions
  async function fetchClasses() {
    setLoadingClasses(true);
    try {
      const res = await api.get('/api/v1/reports/homeroom/classes');
      if (res.data.code === 1000) {
        const result = res.data.result || [];
        setClasses(result);
        if (result.length > 0) {
          setLoadingSemesters(true);
          setSelectedClass(result[0].id);
        } else {
          setSelectedClass('');
          setSelectedSemester('');
          setSelectedSubject('');
          setSubjects([]);
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoadingClasses(false);
    }
  }

  async function fetchSemesters(adminClassId) {
    setLoadingSemesters(true);
    setSelectedSemester('');
    setSelectedSubject('');
    setSubjects([]);
    try {
      const res = await api.get(`/api/v1/reports/homeroom/semesters?adminClassId=${adminClassId}`);
      if (res.data.code === 1000) {
        const result = res.data.result || [];
        setSemesters(result);
        if (result.length > 0) {
          setLoadingSubjects(true);
          setSelectedSemester(result[0].id);
        } else {
          setSelectedSemester('');
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoadingSemesters(false);
    }
  }

  async function fetchSubjects(adminClassId, semesterId) {
    setLoadingSubjects(true);
    try {
      const res = await api.get(`/api/v1/reports/homeroom/subjects?adminClassId=${adminClassId}&semesterId=${semesterId}`);
      if (res.data.code === 1000) {
        setSubjects(res.data.result || []);
        setSelectedSubject(''); // Mặc định là "Tất cả các môn"
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoadingSubjects(false);
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
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSemesters(selectedClass);
    } else {
      setSemesters([]);
      setSelectedSemester('');
      setLoadingSemesters(false);
      setLoadingSubjects(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      fetchSubjects(selectedClass, selectedSemester);
    } else {
      setSubjects([]);
      setSelectedSubject('');
      setLoadingSubjects(false);
    }
  }, [selectedClass, selectedSemester]);

  useLayoutEffect(() => {
    if (filtersLoading) return;

    if (selectedClass && selectedSemester) {
      fetchReportData();
    } else {
      setReportData(null);
    }
  }, [selectedClass, selectedSemester, selectedSubject, absentLimitPct, fetchReportData, filtersLoading]);
  const handleExportExcel = async () => {
    setExportLoading(true);
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
    setExportLoading(false);
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

      <div className="adm-bar hide-on-print" style={{ marginBottom: '20px' }}>
        <div className="adm-ic">👥</div>
        <div>
          <div className="ar-title">Lớp chủ nhiệm</div>
          <div className="ar-subtitle">
            Báo cáo điểm danh và theo dõi lớp chủ nhiệm
          </div>
        </div>
      </div>

      <div className="hide-on-print" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px' }}>
        <select 
          className="fi" 
          style={{ width: '160px' }} 
          value={selectedClass} 
          disabled={loadingClasses}
          onChange={e => {
            if (e.target.value) {
              setLoadingSemesters(true);
            }
            setSelectedClass(e.target.value);
            setSelectedSemester('');
            setSelectedSubject('');
          }}
        >
          {loadingClasses ? (
            <option value="">Đang tải lớp...</option>
          ) : (
            classes.length === 0 && <option value="">-- Lớp chủ nhiệm --</option>
          )}
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="fi" 
          style={{ width: '180px' }} 
          value={selectedSemester} 
          disabled={loadingSemesters || loadingClasses || !selectedClass}
          onChange={e => {
            if (e.target.value) {
              setLoadingSubjects(true);
            }
            setSelectedSemester(e.target.value);
            setSelectedSubject('');
          }}
        >
          {loadingSemesters ? (
            <option value="">Đang tải học kỳ...</option>
          ) : (
            semesters.length === 0 && <option value="">-- Học kỳ --</option>
          )}
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        
        <select 
          className="fi" 
          style={{ width: '220px' }} 
          value={selectedSubject} 
          disabled={loadingSubjects || loadingSemesters || !selectedSemester}
          onChange={e => setSelectedSubject(e.target.value)}
        >
          {loadingSubjects ? (
            <option value="">Đang tải môn học...</option>
          ) : (
            <option value="">-- Tất cả môn học --</option>
          )}
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
            disabled={filtersLoading}
            min="0" 
            max="100" 
          />
          <span style={{ fontSize: '14px', color: 'var(--tx-2)' }}>%</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-s btn-sm" onClick={handleExportExcel} disabled={!reportData || filtersLoading || loading || exportLoading}>
            {exportLoading ? <ButtonSpinner size={12} /> : '📥'} Excel
          </button>
          <button className="btn btn-s btn-sm" onClick={handlePrintPdf} disabled={!reportData || filtersLoading || loading}>📄 PDF</button>
        </div>
      </div>

      {filtersLoading || loading ? (
        <ReportSkeleton />
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
              <table className="ast-responsive-table mobile-data-table">
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

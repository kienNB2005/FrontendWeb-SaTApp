import React, { useState, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { ButtonSpinner, ReportSkeleton } from '../components/LoadingStates';

import { useError } from '../contexts/ErrorContext';
import '../css/AdminReport.css';
export default function Report() {
  const { showError } = useError();

  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [absentLimitPct, setAbsentLimitPct] = useState(20);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const filtersLoading = loadingSemesters || loadingClasses || loadingSubjects;

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchClasses(selectedSemester);
    } else {
      setClasses([]);
      setSelectedClass('');
    }
  }, [selectedSemester]);

  useEffect(() => {
    if (selectedSemester && selectedClass) {
      fetchSubjects(selectedSemester, selectedClass);
    } else {
      setSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedSemester, selectedClass]);

  useLayoutEffect(() => {
    if (filtersLoading) return;

    if (selectedSemester && selectedClass && selectedSubject) {
      fetchReportData();
    } else {
      setReportData(null);
    }
  }, [selectedSemester, selectedClass, selectedSubject, absentLimitPct, filtersLoading]);

  const fetchSemesters = async () => {
    setLoadingSemesters(true);
    try {
      const res = await api.get('/api/v1/reports/lecturer/semesters');
      if (res.data.code === 1000) {
        const result = res.data.result || [];
        setSemesters(result);
        if (result.length > 0) {
          setLoadingClasses(true);
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
  };

  const fetchClasses = async (semesterId) => {
    setLoadingClasses(true);
    setSelectedSubject('');
    setSubjects([]);
    try {
      const res = await api.get(`/api/v1/reports/lecturer/classes?semesterId=${semesterId}`);
      if (res.data.code === 1000) {
        const result = res.data.result || [];
        setClasses(result);
        if (result.length > 0) {
          setLoadingSubjects(true);
          setSelectedClass(result[0].id);
        } else {
          setSelectedClass('');
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchSubjects = async (semesterId, adminClassId) => {
    setLoadingSubjects(true);
    // Reset subject TRƯỚC khi fetch để tránh gọi /data với subjectId cũ
    setSelectedSubject('');
    setSubjects([]);
    try {
      const res = await api.get(`/api/v1/reports/lecturer/subjects?semesterId=${semesterId}&adminClassId=${adminClassId}`);
      if (res.data.code === 1000) {
        const result = res.data.result || [];
        setSubjects(result);
        if (result.length > 0) {
          setSelectedSubject(result[0].id);
        } else {
          setSelectedSubject('');
        }
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/reports/lecturer/data', {
        params: {
          semesterId: selectedSemester,
          adminClassId: selectedClass,
          subjectId: selectedSubject,
          absentLimitPct: absentLimitPct
        }
      });
      if (res.data.code === 1000) {
        setReportData(res.data.result);
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const response = await api.get('/api/v1/reports/lecturer/export/excel', {
        params: {
          semesterId: selectedSemester,
          adminClassId: selectedClass,
          subjectId: selectedSubject,
          absentLimitPct: absentLimitPct
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'BaoCaoDiemDanh.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Lỗi xuất excel", error);
      showError(error?.response?.data?.message || error?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
      showError("Không thể xuất file Excel.");
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="page active" id="report-page">
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
            #report-page, #report-page * {
              visibility: visible;
            }
            #report-page {
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
              display: none !important; /* Ẩn 4 thẻ thống kê trên bản in */
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
        <div className="adm-ic">📊</div>
        <div>
          <div className="ar-title">Báo cáo Lớp giảng dạy</div>
          <div className="ar-subtitle">
            Thống kê điểm danh và xuất file báo cáo
          </div>
        </div>
      </div>

      <div className="hide-on-print report-toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px' }}>
        <select 
          className="fi" 
          style={{ width: '180px' }} 
          value={selectedSemester} 
          disabled={loadingSemesters}
          onChange={e => {
            if (e.target.value) {
              setLoadingClasses(true);
            }
            setSelectedSemester(e.target.value);
            setSelectedClass('');
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
          style={{ width: '160px' }} 
          value={selectedClass} 
          disabled={loadingClasses || loadingSemesters || !selectedSemester}
          onChange={e => {
            if (e.target.value) {
              setLoadingSubjects(true);
            }
            setSelectedClass(e.target.value);
            setSelectedSubject('');
          }}
        >
          {loadingClasses ? (
            <option value="">Đang tải lớp...</option>
          ) : (
            classes.length === 0 && <option value="">-- Lớp --</option>
          )}
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="fi" 
          style={{ width: '220px' }} 
          value={selectedSubject} 
          disabled={loadingSubjects || loadingClasses || !selectedClass}
          onChange={e => setSelectedSubject(e.target.value)}
        >
          {loadingSubjects ? (
            <option value="">Đang tải môn học...</option>
          ) : (
            subjects.length === 0 && <option value="">-- Môn học --</option>
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

        <div className="report-export-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
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
              <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '20px', textTransform: 'uppercase' }}>BÁO CÁO ĐIỂM DANH SINH VIÊN</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                <div>
                  <div style={{ marginBottom: '6px' }}><strong>Học kỳ:</strong> {semesters.find(s => s.id === parseInt(selectedSemester))?.name || '...'}</div>
                  <div><strong>Lớp hành chính:</strong> {classes.find(c => c.id === parseInt(selectedClass))?.name || '...'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '6px' }}><strong>Môn học:</strong> {subjects.find(s => s.id === parseInt(selectedSubject))?.name || '...'}</div>
                  <div><strong>Ngưỡng cảnh báo:</strong> Vắng ≥ {absentLimitPct}%</div>
                </div>
              </div>
            </div>

          <div
            className="ast-table-wrap report-table-scroll"
            role="region"
            aria-label="Bảng báo cáo lớp giảng dạy"
            tabIndex="0"
          >
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
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tx-2)' }}>Vui lòng chọn đầy đủ Học kỳ, Lớp và Môn học để xem báo cáo.</div>
      )}
    </div>
  );
}

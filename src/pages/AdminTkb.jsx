import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Download,
  ArrowLeft,
  Info,
  CalendarClock,
  RefreshCw,
  Search,
  Calendar,
} from 'lucide-react';

import api from '../utils/api';
import '../css/AdminTkb.css';

export default function AdminTkb() {
  const { showError } = useError();

  const [view, setView] = useState('list'); // 'list' | 'import'
  const [step, setStep] = useState('upload'); // upload | analyzing | preview | importing | success

  // Global selections
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');

  // --- LIST STATE ---
  const [schedules, setSchedules] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterDay, setFilterDay] = useState('');

  // --- IMPORT STATE ---
  const [previewData, setPreviewData] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef(null);

  const [isSemestersLoading, setIsSemestersLoading] = useState(true);

  

  const fetchSchedules = useCallback(async (page = 0) => {
    setListLoading(true);
    setListError('');

    try {
      let url = `/api/v1/schedules?page=${page}&size=15`;

      if (selectedSemester) {
        url += `&semesterId=${selectedSemester}`;
      }

      if (searchText) {
        url += `&search=${encodeURIComponent(searchText)}`;
      }

      if (filterDay) {
        url += `&dayOfWeek=${filterDay}`;
      }

      const res = await api.get(url);
      const pageData = res.data.result;

      setSchedules(pageData.content || []);
      setTotalElements(pageData.totalElements ?? pageData.page?.totalElements ?? 0);
      setTotalPages(pageData.totalPages ?? pageData.page?.totalPages ?? 0);
      setCurrentPage(pageData.number ?? pageData.page?.number ?? 0);
    } catch (err) {
      setListError(
        err.response?.data?.message || 'Không thể tải danh sách Thời khóa biểu.'
      );
      setSchedules([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setListLoading(false);
    }
  }, [selectedSemester, searchText, filterDay]);

  const fetchSemesters = useCallback(async () => {
    setIsSemestersLoading(true);

    try {
      const res = await api.get('/api/v1/semesters');
      const sems = res.data.result || [];

      setSemesters(sems);

      if (sems.length > 0) {
        const active = sems.find((semester) => semester.isActive);
        setSelectedSemester(active ? active.id.toString() : '');
      } else {
        setSelectedSemester('');
      }
    } catch (err) {
      console.error('Failed to fetch semesters:', err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    } finally {
      setIsSemestersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  // Gọi API ngay khi thay đổi semester, view, hoặc filterDay (không debounce)
  useEffect(() => {
    if (view === 'list' && selectedSemester) {
      fetchSchedules(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester, view, filterDay]);

  // Debounce riêng cho searchText
  useEffect(() => {
    if (view !== 'list' || !selectedSemester) return;

    const timeoutId = setTimeout(() => {
      fetchSchedules(0);
    }, 500);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchSchedules(newPage);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showError('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV');
      e.target.value = null;
      return;
    }

    setStep('analyzing');
    setImportProgress(20);
    setStatusText('Đang tải file lên và đọc dữ liệu Excel...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const interval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval);
            return 85;
          }

          return prev + 15;
        });

        setStatusText('Đang ánh xạ mã lớp, môn, giảng viên...');
      }, 500);

      const res = await api.post('/api/v1/schedules/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(interval);
      setImportProgress(100);

      setTimeout(() => {
        setPreviewData(res.data.result || []);
        setStep('preview');
      }, 600);
    } catch (err) {
      showError(
        err.response?.data?.message ||
          'Đã xảy ra lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.'
      );
      setStep('upload');
    }

    e.target.value = null;
  };

  const startImport = async () => {
    if (!selectedSemester) {
      showError('Vui lòng chọn học kỳ trước khi xác nhận nhập dữ liệu!');
      return;
    }

    const validSchedules = previewData
      .filter((item) => item.valid)
      .map((item) => item.schedule);

    if (validSchedules.length === 0) {
      showError('Không có dòng dữ liệu hợp lệ nào để import!');
      return;
    }

    setStep('importing');
    setImportProgress(10);
    setStatusText('Đang lưu dữ liệu TKB gốc...');

    try {
      const interval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }

          return prev + 10;
        });

        if (importProgress > 30) {
          setStatusText('Đang sinh lịch học chi tiết cho từng lớp...');
        }

        if (importProgress > 60) {
          setStatusText('Đang thiết lập trạng thái "Đã lên lịch"...');
        }
      }, 500);

      const res = await api.post(
        `/api/v1/schedules/import/confirm?semesterId=${selectedSemester}`,
        validSchedules
      );

      clearInterval(interval);
      setImportProgress(100);

      setTimeout(() => {
        setImportStats(res.data.result);
        setStep('success');
      }, 600);
    } catch (err) {
      showError(
        err.response?.data?.message ||
          'Có lỗi xảy ra khi xác nhận Import. Vui lòng thử lại!'
      );
      setStep('preview');
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/api/v1/schedules/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_TKB.xlsx');

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showError('Không thể tải file mẫu. Vui lòng thử lại sau.');
    }
  };

  const closeImport = () => {
    setView('list');
    setStep('upload');
    setPreviewData([]);
    setImportStats(null);

    if (selectedSemester) {
      fetchSchedules(0);
    }
  };

  const formatDayOfWeek = (day) => {
    if (day === 8) return 'Chủ nhật';
    return `Thứ ${day}`;
  };

  const getValidPreviewCount = () => previewData.filter((item) => item.valid).length;

  const getInvalidPreviewCount = () =>
    previewData.filter((item) => !item.valid).length;

  const getEstimatedSessions = () =>
    previewData
      .filter((item) => item.valid)
      .reduce((acc, curr) => acc + (curr.estimatedSessions || 0), 0);

  const renderHeader = () => (
    <div className="atk-header">
      <div>
        <div className="tb-title atk-page-title">
          <CalendarClock size={24} color="var(--bl)" />
          Thời Khóa Biểu
        </div>

        <div className="tb-sub">Khởi tạo và tự động sinh lịch học toàn học kỳ</div>
      </div>

      <div className="atk-header-actions">
        <select
          className="fi atk-semester-select"
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
        >
          {semesters.length === 0 && <option value="">Đang tải...</option>}
          {semesters.length > 0 && <option value="">-- Chọn học kỳ --</option>}

          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name} {semester.isActive ? '(Hiện tại)' : ''}
            </option>
          ))}
        </select>

        {view === 'list' ? (
          <>
            <button
              className="btn btn-s atk-btn-icon"
              onClick={() => fetchSchedules()}
              disabled={!selectedSemester}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>

            {schedules.length === 0 && !searchText && !filterDay && !listLoading && (
              <button
                className="btn btn-p atk-btn-icon"
                onClick={() => setView('import')}
                disabled={semesters.length === 0}
              >
                <UploadCloud size={14} />
                Import TKB
              </button>
            )}
          </>
        ) : (
          <button className="btn btn-s atk-btn-icon" onClick={closeImport}>
            <ArrowLeft size={14} />
            Trở lại danh sách
          </button>
        )}
      </div>
    </div>
  );

  const renderListView = () => (
    <>
      {isSemestersLoading && renderSemestersLoading()}
      {!isSemestersLoading && semesters.length === 0 && renderNoSemester()}
      {!isSemestersLoading &&
        semesters.length > 0 &&
        !selectedSemester &&
        renderRequireSemester()}
      {!isSemestersLoading &&
        semesters.length > 0 &&
        selectedSemester &&
        listError &&
        renderListErrorCard()}
      {!isSemestersLoading &&
        semesters.length > 0 &&
        selectedSemester &&
        !listError &&
        schedules.length === 0 &&
        !searchText &&
        !filterDay &&
        !listLoading &&
        renderEmptySemester()}
      {!isSemestersLoading &&
        semesters.length > 0 &&
        selectedSemester &&
        !(
          schedules.length === 0 &&
          !searchText &&
          !filterDay &&
          !listLoading
        ) &&
        renderScheduleCard()}
    </>
  );

  const renderSemestersLoading = () => (
    <div className="atk-center-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse atk-state-icon"
      />

      <p>Đang tải thông tin học kỳ...</p>
    </div>
  );

  const renderNoSemester = () => (
    <div className="card atk-message-card">
      <AlertTriangle
        size={48}
        color="var(--am)"
        className="atk-state-icon-lg"
      />

      <h3>Hệ thống chưa có học kỳ nào</h3>

      <p>
        Vui lòng thêm học kỳ mới tại trang "Quản lý Học kỳ" để có thể quản lý
        và import thời khóa biểu.
      </p>
    </div>
  );

  const renderRequireSemester = () => (
    <div className="card atk-message-card">
      <Calendar size={48} color="var(--bl)" className="atk-state-icon-lg" />

      <h3>Vui lòng chọn học kỳ</h3>

      <p>
        Không có học kỳ nào đang hoạt động. Vui lòng chọn một học kỳ ở phía trên
        để xem dữ liệu TKB.
      </p>
    </div>
  );

  const renderListErrorCard = () => (
    <div className="card atk-message-card">
      <AlertTriangle
        size={48}
        color="var(--rd)"
        className="atk-state-icon-lg"
      />

      <h3>Lỗi khi tải dữ liệu</h3>

      <p className="atk-text-red">{listError}</p>

      <button className="btn btn-p atk-message-btn" onClick={() => fetchSchedules(0)}>
        Thử lại
      </button>
    </div>
  );

  const renderEmptySemester = () => (
    <div className="g2">
      <div className="card">
        <div className="card-h">
          <div className="card-t">Trạng thái học kỳ</div>
        </div>

        <div className="atk-empty-semester-body">
          <div className="atk-warning-box">
            <AlertTriangle size={24} color="var(--am)" />

            <span>Học kỳ này chưa có dữ liệu Thời khóa biểu</span>
          </div>

          <button
            className="btn btn-p atk-init-btn"
            onClick={() => setView('import')}
          >
            <UploadCloud size={18} />
            Khởi tạo TKB từ Excel
          </button>
        </div>
      </div>

      <div className="card atk-guide-card">
        <div className="atk-guide-icon-large">
          <Info size={32} color="var(--bl)" />
        </div>

        <h3>Hướng dẫn khởi tạo TKB</h3>

        <p>
          Bạn chỉ có thể khởi tạo TKB cho các học kỳ chưa có dữ liệu. Hệ thống
          hỗ trợ file Excel chuẩn từ nhà trường. Toàn bộ lịch học sẽ được sinh
          tự động ngay lập tức.
        </p>

        <button className="btn btn-s atk-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderScheduleCard = () => (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Dữ liệu Thời khóa biểu</div>
          <div className="card-su">Tổng số: {totalElements} dòng TKB gốc</div>
        </div>

        <div className="atk-filter-actions">
          <div className="srch">
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="atk-day-select"
            >
              <option value="">Tất cả ngày</option>
              <option value="2">Thứ 2</option>
              <option value="3">Thứ 3</option>
              <option value="4">Thứ 4</option>
              <option value="5">Thứ 5</option>
              <option value="6">Thứ 6</option>
              <option value="7">Thứ 7</option>
              <option value="8">Chủ nhật</option>
            </select>
          </div>

          <div className="srch">
            <Search className="srch-ic" size={14} />
            <input
              type="text"
              placeholder="Tìm mã lớp, giảng viên, môn..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      </div>

      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListErrorInline()}
      {!listLoading && !listError && schedules.length === 0 && renderListEmpty()}
      {!listLoading && !listError && schedules.length > 0 && renderScheduleTable()}
    </div>
  );

  const renderListLoading = () => (
    <div className="atk-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse atk-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListErrorInline = () => (
    <div className="atk-list-state atk-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="atk-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchSchedules()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="atk-list-state">
      <CalendarClock
        size={48}
        color="var(--tx3)"
        className="atk-empty-icon"
      />

      <p>Không tìm thấy TKB nào phù hợp với bộ lọc.</p>
    </div>
  );

  const renderScheduleTable = () => (
    <>
      <div className="atk-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th>Lớp</th>
              <th>Môn học</th>
              <th>Giảng viên</th>
              <th>Phòng</th>
              <th>Thứ / Tiết</th>
              <th>Tuần học</th>
              <th className="atk-center-cell">Số buổi</th>
            </tr>
          </thead>

          <tbody>
            {schedules.map((item) => (
              <tr key={item.id}>
                <td data-label="Lớp">
                  <div className="atk-main-text">{item.adminClassCode}</div>
                </td>

                <td data-label="Môn học">
                  <div className="atk-main-text">{item.subjectName}</div>
                  <div className="atk-sub-text">{item.subjectCode}</div>
                </td>

                <td data-label="Giảng viên">
                  <div className="atk-main-text">{item.lecturerName}</div>
                  <div className="atk-sub-text">{item.lecturerCode}</div>
                </td>

                <td data-label="Phòng">
                  <span className="atk-room-badge">{item.roomCode}</span>
                </td>

                <td data-label="Thứ / Tiết">
                  <div className="atk-day-text">{formatDayOfWeek(item.dayOfWeek)}</div>
                  <div className="atk-period-text">
                    Tiết {item.periodStart} - {item.periodEnd}
                  </div>
                </td>

                <td data-label="Tuần học">
                  {item.weekStart} - {item.weekEnd}
                </td>

                <td data-label="Số buổi" className="atk-center-cell">
                  <span className="atk-session-count">{item.totalSessions}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </>
  );

  const renderPagination = () => {
    const pageNumbers = Array.from({ length: Math.min(5, totalPages) })
      .map((_, idx) => {
        let pageNum = currentPage - 2 + idx;

        if (currentPage < 2) pageNum = idx;
        if (currentPage > totalPages - 3) pageNum = totalPages - 5 + idx;

        if (pageNum < 0 || pageNum >= totalPages) return null;

        return pageNum;
      })
      .filter((pageNum) => pageNum !== null);

    return (
      <div className="atk-pagination">
        <span>
          Hiển thị trang {currentPage + 1} / {totalPages} Tổng số {totalElements}{' '}
          dòng
        </span>

        <div className="atk-pagination-actions">
          <button
            className="btn btn-s btn-sm"
            disabled={currentPage === 0}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Trước
          </button>

          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              className={`btn btn-sm ${
                currentPage === pageNum ? 'atk-page-active' : 'btn-s'
              }`}
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum + 1}
            </button>
          ))}

          <button
            className="btn btn-s btn-sm"
            disabled={currentPage === totalPages - 1 || totalPages === 0}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    );
  };

  const renderImportView = () => (
    <>
      {step === 'upload' && renderUploadStep()}
      {(step === 'analyzing' || step === 'importing') && renderProgressStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'success' && importStats && renderSuccessStep()}
    </>
  );

  const renderUploadStep = () => (
    <div className="card atk-upload-card">
      <div className="card-h">
        <div className="card-t">Tải lên file TKB</div>

        <button className="btn btn-s btn-sm atk-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu
        </button>
      </div>

      <div className="atk-upload-body">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls, .csv"
          className="atk-hidden-input"
        />

        <div className="upz atk-upload-zone" onClick={handleImportClick}>
          <FileSpreadsheet
            size={48}
            color="var(--bl)"
            className="atk-upload-icon"
          />

          <div className="atk-upload-title">Kéo thả file Excel / CSV vào đây</div>

          <div className="atk-upload-desc">
            hoặc nhấn để chọn file từ máy tính của bạn
          </div>

          <div className="atk-upload-note">
            <CheckCircle2 size={12} color="var(--gr)" />
            Hỗ trợ .xlsx, .csv Tối đa 10MB
          </div>
        </div>
      </div>
    </div>
  );

  const renderProgressStep = () => {
    const isAnalyzing = step === 'analyzing';

    return (
      <div className="card atk-progress-card">
        <div
          className={
            isAnalyzing
              ? 'atk-progress-icon atk-progress-icon-blue'
              : 'atk-progress-icon atk-progress-icon-purple'
          }
        >
          {isAnalyzing ? (
            <RefreshCw size={36} color="var(--bl)" className="pulse" />
          ) : (
            <CalendarClock size={36} color="var(--pu)" className="pulse" />
          )}
        </div>

        <h3>
          {isAnalyzing ? 'Đang phân tích dữ liệu' : 'Đang xử lý & Sinh lịch học'}
        </h3>

        <p>{statusText}</p>

        <div className="atk-progress-track">
          <div
            className={
              isAnalyzing
                ? 'atk-progress-fill atk-progress-fill-blue'
                : 'atk-progress-fill atk-progress-fill-purple'
            }
            style={{ width: `${importProgress}%` }}
          />
        </div>

        <div className="atk-progress-percent">{Math.round(importProgress)}%</div>
      </div>
    );
  };

  const renderPreviewStep = () => (
    <>
      <div className="sg">
        <div className="sc bl">
          <div className="sc-lb">Tổng dòng dữ liệu</div>
          <div className="sc-vl bl">{previewData.length}</div>
          <div className="sc-su">Đọc từ file Excel</div>
          <FileSpreadsheet className="sc-ic" color="var(--bl)" />
        </div>

        <div className="sc gr">
          <div className="sc-lb">Dòng hợp lệ</div>
          <div className="sc-vl gr">{getValidPreviewCount()}</div>
          <div className="sc-su">Đủ thông tin & ánh xạ thành công</div>
          <CheckCircle2 className="sc-ic" color="var(--gr)" />
        </div>

        <div className="sc rd">
          <div className="sc-lb">Dòng có lỗi</div>
          <div className="sc-vl atk-text-red">{getInvalidPreviewCount()}</div>
          <div className="sc-su">Bị thiếu/sai dữ liệu tham chiếu</div>
          <AlertTriangle className="sc-ic" color="var(--rd)" />
        </div>

        <div className="sc pu">
          <div className="sc-lb">Ước tính buổi học</div>
          <div className="sc-vl pu">
            ~{getEstimatedSessions().toLocaleString()}
          </div>
          <div className="sc-su">Sẽ được tự động sinh</div>
          <CalendarClock className="sc-ic" color="var(--pu)" />
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-t">Bảng xem trước dữ liệu Preview</div>
            <div className="card-su">
              Kiểm tra các dòng lỗi màu đỏ. Chúng sẽ bị bỏ qua khi Import.
            </div>
          </div>

          <div className="atk-preview-actions">
            <button className="btn btn-s" onClick={() => setStep('upload')}>
              Hủy & Upload lại
            </button>

            <button
              className="btn btn-p atk-btn-icon"
              onClick={startImport}
              disabled={getValidPreviewCount() === 0}
            >
              Xác nhận nhập
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {renderPreviewTable()}

        <div className="atk-preview-note">
          <Info size={14} />
          Các dòng dữ liệu báo lỗi sẽ tự động bị bỏ qua trong quá trình import.
        </div>
      </div>
    </>
  );

  const renderPreviewTable = () => (
    <div className="atk-preview-table-wrap">
      <table className="ast-responsive-table">
        <thead className="atk-preview-thead">
          <tr>
            <th className="atk-col-row">Dòng</th>
            <th>Lớp hành chính</th>
            <th>Môn học</th>
            <th>Giảng viên</th>
            <th>Phòng</th>
            <th>Thứ</th>
            <th>Tiết</th>
            <th>Tuần</th>
            <th>Dự kiến</th>
            <th className="atk-col-status">Trạng thái</th>
          </tr>
        </thead>

        <tbody>
          {previewData.map((row, idx) => (
            <tr key={idx} className={!row.valid ? 'atk-preview-error-row' : ''}>
              <td className="atk-muted-cell">{row.schedule.rowIndex}</td>

              <td>
                <div
                  className={
                    !row.valid && row.errors?.some((e) => e.includes('Lớp'))
                      ? 'atk-preview-cell-error'
                      : 'atk-main-text'
                  }
                >
                  {row.adminClassName || row.schedule.adminClassCode}
                </div>

                {!row.adminClassName && (
                  <div className="atk-preview-missing">Không tìm thấy mã</div>
                )}
              </td>

              <td>
                <div
                  className={
                    !row.valid && row.errors?.some((e) => e.includes('Môn'))
                      ? 'atk-preview-cell-error'
                      : 'atk-main-text'
                  }
                >
                  {row.subjectName || row.schedule.subjectCode}
                </div>
              </td>

              <td>
                <div
                  className={
                    !row.valid &&
                    row.errors?.some((e) => e.includes('Giảng viên'))
                      ? 'atk-preview-cell-error'
                      : 'atk-main-text'
                  }
                >
                  {row.lecturerName || row.schedule.lecturerCode}
                </div>
              </td>

              <td>
                <div
                  className={
                    !row.valid && row.errors?.some((e) => e.includes('Phòng'))
                      ? 'atk-preview-cell-error'
                      : 'atk-main-text'
                  }
                >
                  {row.schedule.roomCode}
                </div>
              </td>

              <td>{row.schedule.dayOfWeek}</td>
              <td>
                {row.schedule.periodStart}-{row.schedule.periodEnd}
              </td>
              <td>
                {row.schedule.weekStart}-{row.schedule.weekEnd}
              </td>

              <td
                className={
                  row.valid
                    ? 'atk-preview-estimated atk-text-green'
                    : 'atk-preview-estimated atk-text-red'
                }
              >
                {row.estimatedSessions || '-'}
              </td>

              <td>
                {row.valid ? (
                  <span className="bdg b-op">Hợp lệ</span>
                ) : (
                  <div className="atk-preview-errors">
                    {row.errors?.map((err, index) => (
                      <div key={index}>
                        <AlertTriangle size={12} />
                        {err}
                      </div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="card atk-success-card">
      <div className="atk-success-icon">
        <CheckCircle2 size={48} color="var(--gr)" />
      </div>

      <h2>Nhập Thời Khóa Biểu Thành Công!</h2>

      <p>
        Hệ thống đã lưu <strong>{importStats.totalSaved}</strong> dòng TKB hợp
        lệ và tự động sinh{' '}
        <strong>{importStats.totalSessionsCreated?.toLocaleString() || 0}</strong>{' '}
        buổi học chi tiết.
      </p>

      <div className="atk-success-info">
        <CalendarClock size={16} color="var(--pu)" />

        <span>
          Trạng thái: <strong>Đã lên lịch</strong> cho tất cả sinh viên & giảng
          viên.
        </span>
      </div>

      <div className="atk-success-actions">
        <button className="btn btn-p" onClick={closeImport}>
          Xem danh sách Thời khóa biểu
        </button>
      </div>
    </div>
  );

  return (
    <div className="page active">
      {renderHeader()}

      {view === 'list' && renderListView()}
      {view === 'import' && renderImportView()}
    </div>
  );
}
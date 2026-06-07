import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  RefreshCw,
  Building,
  Search,
  Calendar,
  Edit,
  Trash2,
  X,
} from 'lucide-react';

import api from '../utils/api';
import '../css/AdminFaculties.css';

export default function AdminFaculties() {
  const { showError } = useError();

  const { confirm } = useConfirm();
  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [faculties, setFaculties] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchText, setSearchText] = useState('');

  // --- EDIT & DELETE STATE ---
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // --- ADD STATE ---
  const [isAdding, setIsAdding] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState('upload'); // upload | importing | success | error
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  // =====================
  // FETCH FACULTY LIST
  // =====================
  const fetchFaculties = async (signal) => {
    setListLoading(true);
    setListError('');

    try {
      const res = await api.get('/api/v1/faculties', { signal });
      setFaculties(res.data.result || []);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;

      setListError(
        err.response?.data?.message ||
          'Không thể tải danh sách khoa. Kiểm tra kết nối máy chủ.'
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'list') return;

    const controller = new AbortController();

    fetchFaculties(controller.signal);

    return () => controller.abort();
  }, [view]);

  // =====================
  // IMPORT HANDLERS
  // =====================
  const downloadTemplate = async () => {
    try {
      const res = await api.get('/api/v1/faculties/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_Khoa.xlsx');

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showError('Không thể tải file mẫu. Vui lòng thử lại sau.');
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    if (!file.name.endsWith('.xlsx')) {
      setImportError('Định dạng file không hợp lệ. Vui lòng chọn file .xlsx!');
      setImportStep('error');
      return;
    }

    setImportStep('importing');
    setProgress(20);
    setStatusText('Đang tải file lên máy chủ...');

    const formData = new FormData();
    formData.append('file', file);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 85 ? prev : prev + 10));
    }, 350);

    try {
      const response = await api.post('/api/v1/faculties/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(progressInterval);
      setProgress(100);
      setStatusText('Hoàn thành!');

      setTimeout(() => {
        if (response.data?.result) {
          setImportResult(response.data.result);
          setImportStep('success');
        } else {
          setImportError('Phản hồi từ máy chủ không hợp lệ.');
          setImportStep('error');
        }
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);

      setTimeout(() => {
        setImportError(
          err.response?.data?.message ||
            'Có lỗi xảy ra khi kết nối đến máy chủ.'
        );
        setImportStep('error');
      }, 300);
    }
  };

  const resetImport = () => {
    setImportStep('upload');
    setImportResult(null);
    setImportError('');
    setProgress(0);
  };

  const goBackToList = () => {
    resetImport();
    setView('list');
  };

  // =====================
  // EDIT & DELETE HANDLERS
  // =====================
  const handleEditClick = (faculty) => {
    setEditingFaculty(faculty);
    setEditName(faculty.name);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showError('Tên khoa không được để trống!');
      return;
    }

    setIsSaving(true);

    try {
      await api.put(`/api/v1/faculties/${editingFaculty.id}`, {
        name: editName,
      });

      setEditingFaculty(null);
      fetchFaculties();
    } catch (err) {
      showError(
        err.response?.data?.message ||
          'Cập nhật thất bại. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (faculty) => {
    if (!(await confirm(`Bạn có chắc chắn muốn xóa khoa "${faculty.name}" không?`))) {
      return;
    }

    setIsDeleting(faculty.id);

    try {
      await api.delete(`/api/v1/faculties/${faculty.id}`);
      fetchFaculties();
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAdd = async () => {
    if (!addCode.trim() || !addName.trim()) {
      showError('Mã khoa và tên khoa không được để trống!');
      return;
    }

    setIsSaving(true);

    try {
      await api.post('/api/v1/faculties', {
        code: addCode,
        name: addName,
      });

      setIsAdding(false);
      setAddCode('');
      setAddName('');
      fetchFaculties();
    } catch (err) {
      showError(
        err.response?.data?.message ||
          'Thêm mới thất bại. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =====================
  // HELPERS
  // =====================
  const formatDate = (isoString) => {
    if (!isoString) return '—';

    const d = new Date(isoString);

    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredFaculties = faculties.filter(
    (f) =>
      f.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      f.code?.toLowerCase().includes(searchText.toLowerCase())
  );

  // =====================
  // RENDER HELPERS
  // =====================
  const renderHeader = () => (
    <div className="afc-header">
      <div>
        <div className="tb-title afc-page-title">
          <Building size={24} color="var(--bl)" />
          Quản lý Khoa
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? `Danh sách Khoa · ${faculties.length} khoa trong hệ thống`
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="afc-header-actions">
        {view === 'list' ? (
          <>
            <button
              className="btn btn-s afc-btn-icon"
              onClick={() => fetchFaculties()}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button
              className="btn btn-p afc-btn-icon"
              onClick={() => setIsAdding(true)}
            >
              Thêm mới
            </button>

            <button
              className="btn btn-p afc-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Excel
            </button>
          </>
        ) : (
          <button className="btn btn-s afc-btn-icon" onClick={goBackToList}>
            <ArrowLeft size={14} />
            Quay lại danh sách
          </button>
        )}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Danh sách Khoa</div>
          <div className="card-su">Tất cả các khoa hiện có trong hệ thống</div>
        </div>

        <div className="srch">
          <Search className="srch-ic" size={14} />
          <input
            type="text"
            placeholder="Tìm tên hoặc mã khoa..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListError()}
      {!listLoading &&
        !listError &&
        filteredFaculties.length === 0 &&
        renderListEmpty()}
      {!listLoading &&
        !listError &&
        filteredFaculties.length > 0 &&
        renderFacultyTable()}
    </div>
  );

  const renderListLoading = () => (
    <div className="afc-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse afc-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListError = () => (
    <div className="afc-list-state afc-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="afc-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchFaculties()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="afc-list-state">
      <Building size={48} color="var(--tx3)" className="afc-empty-icon" />

      <p>
        {searchText
          ? `Không tìm thấy khoa nào với từ khóa "${searchText}"`
          : 'Chưa có dữ liệu Khoa. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!searchText && (
        <button
          className="btn btn-p afc-btn-icon afc-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import ngay
        </button>
      )}
    </div>
  );

  const renderFacultyTable = () => (
    <>
      <div className="afc-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th className="afc-col-index">#</th>
              <th className="afc-col-code">Mã Khoa</th>
              <th>Tên Khoa</th>
              <th className="afc-col-date">
                <span className="afc-th-icon">
                  <Calendar size={12} />
                  Ngày tạo
                </span>
              </th>
              <th className="afc-col-date">
                <span className="afc-th-icon">
                  <Calendar size={12} />
                  Cập nhật lúc
                </span>
              </th>
              <th className="afc-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredFaculties.map((faculty, index) => (
              <tr key={faculty.id}>
                <td data-label="#" className="afc-index-cell">{index + 1}</td>

                <td data-label="Mã Khoa">
                  <span className="afc-code-badge">{faculty.code || '—'}</span>
                </td>

                <td data-label="Tên Khoa" className="afc-name-cell">{faculty.name}</td>

                <td data-label="Ngày tạo" className="afc-date-cell">{formatDate(faculty.createdAt)}</td>
                <td data-label="Cập nhật lúc" className="afc-date-cell">{formatDate(faculty.updatedAt)}</td>

                <td data-label="Thao tác" className="afc-action-cell">
                  <div className="afc-row-actions">
                    <button
                      className="btn btn-s afc-icon-btn"
                      title="Sửa"
                      onClick={() => handleEditClick(faculty)}
                    >
                      <Edit size={14} color="var(--bl)" />
                    </button>

                    <button
                      className="btn btn-s afc-icon-btn afc-delete-btn"
                      title="Xóa"
                      onClick={() => handleDeleteClick(faculty)}
                      disabled={isDeleting === faculty.id}
                    >
                      {isDeleting === faculty.id ? (
                        <RefreshCw
                          size={14}
                          color="var(--rd)"
                          className="pulse"
                        />
                      ) : (
                        <Trash2 size={14} color="var(--rd)" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="afc-table-footer">
        Hiển thị {filteredFaculties.length}/{faculties.length} khoa
      </div>
    </>
  );

  const renderImportView = () => (
    <>
      {importStep === 'upload' && renderUploadStep()}
      {importStep === 'importing' && renderImportingStep()}
      {importStep === 'success' && importResult && renderSuccessStep()}
      {importStep === 'error' && renderErrorStep()}
    </>
  );

  const renderUploadStep = () => (
    <div className="g2">
      <div className="card">
        <div className="card-h">
          <div className="card-t">Tải lên file Excel</div>
        </div>

        <div className="afc-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            className="afc-hidden-input"
          />

          <div
            className="upz afc-upload-zone"
            onClick={() => fileInputRef.current.click()}
          >
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="afc-upload-icon"
            />

            <div className="afc-upload-title">Nhấn để chọn file Excel</div>

            <div className="afc-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="afc-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card afc-template-card">
        <div className="afc-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="afc-template-title">File mẫu Import Khoa</h3>

        <p className="afc-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Khoa chưa có và{' '}
          <strong>cập nhật</strong> những Khoa đã tồn tại dựa trên mã Khoa.
        </p>

        <button className="btn btn-p afc-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="card afc-import-card">
      <div className="afc-import-circle">
        <RefreshCw size={36} color="var(--bl)" className="pulse" />
      </div>

      <h3 className="afc-import-title">Đang xử lý & Import dữ liệu</h3>

      <p className="afc-import-status">{statusText}</p>

      <div className="afc-progress">
        <div
          className="afc-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="afc-progress-text">{Math.round(progress)}%</div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="card afc-success-card">
      <div
        className={
          importResult.errorCount === 0
            ? 'afc-result-icon afc-result-icon-success'
            : 'afc-result-icon afc-result-icon-warning'
        }
      >
        {importResult.errorCount === 0 ? (
          <CheckCircle2 size={48} color="var(--gr)" />
        ) : (
          <AlertTriangle size={48} color="var(--am)" />
        )}
      </div>

      <h2 className="afc-result-title">Kết quả Import Khoa</h2>

      <p className="afc-result-desc">
        Đã đọc tổng cộng <strong>{importResult.totalRows}</strong> dòng từ file.
      </p>

      <div className="afc-result-box">
        <div className="afc-result-row">
          <span>Tổng số dòng đã đọc:</span>
          <strong>{importResult.totalRows || 0} dòng</strong>
        </div>

        <div className="afc-result-row">
          <span>Thêm mới thành công:</span>
          <strong className="afc-text-green">
            {importResult.successCount || 0} khoa
          </strong>
        </div>

        <div className="afc-result-row">
          <span>Cập nhật thông tin:</span>
          <strong className="afc-text-blue">
            {importResult.updateCount || 0} khoa
          </strong>
        </div>

        <div className="afc-result-row no-border">
          <span>Dòng bị bỏ qua (lỗi):</span>
          <strong className="afc-text-red">
            {importResult.errorCount || 0} dòng
          </strong>
        </div>
      </div>

      {importResult.errors && importResult.errors.length > 0 && (
        <div className="afc-error-detail">
          <div className="afc-error-detail-title">
            <AlertTriangle size={16} />
            Chi tiết các dòng lỗi
          </div>

          <ul className="afc-error-list">
            {importResult.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="afc-center-actions">
        <button className="btn btn-s afc-btn-icon" onClick={resetImport}>
          <UploadCloud size={14} />
          Import thêm file
        </button>

        <button className="btn btn-p afc-btn-icon" onClick={goBackToList}>
          <Building size={14} />
          Xem danh sách Khoa
        </button>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="card afc-error-card">
      <div className="afc-error-circle">
        <AlertTriangle size={36} color="var(--rd)" />
      </div>

      <h3 className="afc-error-title">Import Thất Bại</h3>

      <p className="afc-error-text">{importError}</p>

      <button className="btn btn-p" onClick={resetImport}>
        Thử lại
      </button>
    </div>
  );

  const renderEditModal = () => (
    <div className="afc-modal-overlay">
      <div className="card afc-modal">
        <div className="afc-modal-header">
          <h3>Cập nhật Khoa</h3>

          <button
            className="btn btn-s afc-close-btn"
            onClick={() => setEditingFaculty(null)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="afc-form-group">
          <label>Mã Khoa</label>
          <input
            type="text"
            value={editingFaculty.code || ''}
            readOnly
            className="afc-input afc-input-muted"
          />
        </div>

        <div className="afc-form-group afc-form-group-large">
          <label>Tên Khoa</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nhập tên khoa..."
            className="afc-input afc-input-primary"
            autoFocus
          />
        </div>

        <div className="afc-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setEditingFaculty(null)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p afc-btn-icon"
            onClick={handleSaveEdit}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw size={14} className="pulse" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddModal = () => (
    <div className="afc-modal-overlay">
      <div className="card afc-modal">
        <div className="afc-modal-header">
          <h3>Thêm Khoa mới</h3>

          <button
            className="btn btn-s afc-close-btn"
            onClick={() => setIsAdding(false)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="afc-form-group">
          <label>Mã Khoa</label>
          <input
            type="text"
            value={addCode}
            onChange={(e) => setAddCode(e.target.value)}
            placeholder="Nhập mã khoa..."
            className="afc-input"
            autoFocus
          />
        </div>

        <div className="afc-form-group afc-form-group-large">
          <label>Tên Khoa</label>
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Nhập tên khoa..."
            className="afc-input"
          />
        </div>

        <div className="afc-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setIsAdding(false)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p afc-btn-icon"
            onClick={handleAdd}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw size={14} className="pulse" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Thêm mới
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page active">
      {renderHeader()}

      {view === 'list' && renderListView()}
      {view === 'import' && renderImportView()}

      {editingFaculty && renderEditModal()}
      {isAdding && renderAddModal()}
    </div>
  );
}
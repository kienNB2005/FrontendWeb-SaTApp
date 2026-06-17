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
  BookOpen,
  Search,
  Calendar,
  Building,
  Edit,
  Trash2,
  X,
} from 'lucide-react';

import api from '../utils/api';
import { TableSkeleton } from '../components/LoadingStates';
import '../css/AdminDepartments.css';

export default function AdminDepartments() {
  const { showError } = useError();

  const { confirm } = useConfirm();
  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [departments, setDepartments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchText, setSearchText] = useState('');

  // --- EDIT & DELETE STATE ---
  const [editingDept, setEditingDept] = useState(null);
  const [editName, setEditName] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [faculties, setFaculties] = useState([]);

  // --- ADD STATE ---
  const [isAdding, setIsAdding] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addFacultyId, setAddFacultyId] = useState('');

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState('upload'); // upload | importing | success | error
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  // =====================
  // FETCH DEPARTMENT LIST
  // =====================
  const fetchDepartments = async (signal) => {
    setListLoading(true);
    setListError('');

    try {
      const res = await api.get('/api/v1/departments', { signal });
      setDepartments(res.data.result || []);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;

      setListError(
        err.response?.data?.message ||
          'Không thể tải danh sách ngành. Kiểm tra kết nối máy chủ.'
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'list') return;

    const controller = new AbortController();

    fetchDepartments(controller.signal);

    return () => controller.abort();
  }, [view]);

  // =====================
  // IMPORT HANDLERS
  // =====================
  const downloadTemplate = async () => {
    try {
      const res = await api.get('/api/v1/departments/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_NganhHoc.xlsx');

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
      const response = await api.post('/api/v1/departments/import', formData, {
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
  const handleEditClick = async (dept) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditFacultyId(dept.facultyId);

    try {
      const res = await api.get('/api/v1/faculties');
      setFaculties(res.data.result || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách khoa', err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showError('Tên ngành không được để trống!');
      return;
    }

    if (!editFacultyId) {
      showError('Vui lòng chọn khoa trực thuộc!');
      return;
    }

    setIsSaving(true);

    try {
      await api.put(`/api/v1/departments/${editingDept.id}`, {
        name: editName,
        facultyId: Number(editFacultyId),
      });

      setEditingDept(null);
      fetchDepartments();
    } catch (err) {
      showError(
        err.response?.data?.message ||
          'Cập nhật thất bại. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (dept) => {
    if (!(await confirm(`Bạn có chắc chắn muốn xóa ngành "${dept.name}" không?`))) {
      return;
    }

    setIsDeleting(dept.id);

    try {
      await api.delete(`/api/v1/departments/${dept.id}`);
      fetchDepartments();
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddClick = async () => {
    setIsAdding(true);
    setAddCode('');
    setAddName('');
    setAddFacultyId('');

    try {
      const res = await api.get('/api/v1/faculties');
      setFaculties(res.data.result || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách khoa', err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  };

  const handleSaveAdd = async () => {
    if (!addCode.trim() || !addName.trim()) {
      showError('Mã ngành và tên ngành không được để trống!');
      return;
    }

    if (!addFacultyId) {
      showError('Vui lòng chọn khoa trực thuộc!');
      return;
    }

    setIsSaving(true);

    try {
      await api.post('/api/v1/departments', {
        code: addCode,
        name: addName,
        facultyId: Number(addFacultyId),
      });

      setIsAdding(false);
      fetchDepartments();
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

    return new Date(isoString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredDepartments = departments.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.facultyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.facultyCode?.toLowerCase().includes(searchText.toLowerCase())
  );

  // =====================
  // RENDER HELPERS
  // =====================
  const renderHeader = () => (
    <div className="adp-header">
      <div>
        <div className="tb-title adp-page-title">
          <BookOpen size={24} color="var(--bl)" />
          Quản lý Ngành
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? `Danh sách Ngành · ${departments.length} ngành trong hệ thống`
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="adp-header-actions">
        {view === 'list' ? (
          <>
            <button
              className="btn btn-s adp-btn-icon"
              onClick={() => fetchDepartments()}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button className="btn btn-p adp-btn-icon" onClick={handleAddClick}>
              Thêm mới
            </button>

            <button
              className="btn btn-p adp-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Excel
            </button>
          </>
        ) : (
          <button className="btn btn-s adp-btn-icon" onClick={goBackToList}>
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
          <div className="card-t">Danh sách Ngành</div>
          <div className="card-su">Tất cả các ngành hiện có trong hệ thống</div>
        </div>

        <div className="srch">
          <Search className="srch-ic" size={14} />
          <input
            type="text"
            placeholder="Tìm tên, mã ngành hoặc tên khoa..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListError()}
      {!listLoading &&
        !listError &&
        filteredDepartments.length === 0 &&
        renderListEmpty()}
      {!listLoading &&
        !listError &&
        filteredDepartments.length > 0 &&
        renderDepartmentTable()}
    </div>
  );

  const renderListLoading = () => <TableSkeleton rows={7} columns={8} />;

  const renderListError = () => (
    <div className="adp-list-state adp-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="adp-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchDepartments()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="adp-list-state">
      <BookOpen size={48} color="var(--tx3)" className="adp-empty-icon" />

      <p>
        {searchText
          ? `Không tìm thấy ngành nào với từ khóa "${searchText}"`
          : 'Chưa có dữ liệu Ngành. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!searchText && (
        <button
          className="btn btn-p adp-btn-icon adp-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import ngay
        </button>
      )}
    </div>
  );

  const renderDepartmentTable = () => (
    <>
      <div className="adp-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th className="adp-col-index">#</th>
              <th className="adp-col-code">Mã Ngành</th>
              <th>Tên Ngành</th>
              <th className="adp-col-faculty-code">Mã Khoa</th>
              <th>Thuộc Khoa</th>
              <th className="adp-col-date">
                <span className="adp-th-icon">
                  <Calendar size={12} />
                  Ngày tạo
                </span>
              </th>
              <th className="adp-col-date">
                <span className="adp-th-icon">
                  <Calendar size={12} />
                  Cập nhật lúc
                </span>
              </th>
              <th className="adp-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredDepartments.map((dept, index) => (
              <tr key={dept.id}>
                <td data-label="#" className="adp-index-cell">{index + 1}</td>

                <td data-label="Mã Ngành">
                  <span className="adp-code-badge">{dept.code || '—'}</span>
                </td>

                <td data-label="Tên Ngành" className="adp-name-cell">{dept.name}</td>

                <td data-label="Mã Khoa">
                  <span className="adp-faculty-code-badge">
                    {dept.facultyCode || '—'}
                  </span>
                </td>

                <td data-label="Thuộc Khoa">
                  <div className="adp-faculty-name">
                    <Building size={12} color="var(--tx3)" />
                    {dept.facultyName || '—'}
                  </div>
                </td>

                <td data-label="Ngày tạo" className="adp-date-cell">{formatDate(dept.createdAt)}</td>
                <td data-label="Cập nhật lúc" className="adp-date-cell">{formatDate(dept.updatedAt)}</td>

                <td data-label="Thao tác" className="adp-action-cell">
                  <div className="adp-row-actions">
                    <button
                      className="btn btn-s adp-icon-btn"
                      title="Sửa"
                      onClick={() => handleEditClick(dept)}
                    >
                      <Edit size={14} color="var(--bl)" />
                    </button>

                    <button
                      className="btn btn-s adp-icon-btn adp-delete-btn"
                      title="Xóa"
                      onClick={() => handleDeleteClick(dept)}
                      disabled={isDeleting === dept.id}
                    >
                      {isDeleting === dept.id ? (
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

      <div className="adp-table-footer">
        Hiển thị {filteredDepartments.length}/{departments.length} ngành
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

        <div className="adp-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            className="adp-hidden-input"
          />

          <div
            className="upz adp-upload-zone"
            onClick={() => fileInputRef.current.click()}
          >
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="adp-upload-icon"
            />

            <div className="adp-upload-title">Nhấn để chọn file Excel</div>

            <div className="adp-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="adp-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card adp-template-card">
        <div className="adp-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="adp-template-title">File mẫu Import Ngành</h3>

        <p className="adp-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Ngành chưa có và{' '}
          <strong>cập nhật</strong> những Ngành đã tồn tại dựa trên mã Ngành.
          Ngành phải thuộc một <strong>Khoa hợp lệ</strong>.
        </p>

        <button className="btn btn-p adp-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="card adp-import-card">
      <div className="adp-import-circle">
        <RefreshCw size={36} color="var(--bl)" className="pulse" />
      </div>

      <h3 className="adp-import-title">Đang xử lý & Import dữ liệu</h3>

      <p className="adp-import-status">{statusText}</p>

      <div className="adp-progress">
        <div
          className="adp-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="adp-progress-text">{Math.round(progress)}%</div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="card adp-success-card">
      <div
        className={
          importResult.errorCount === 0
            ? 'adp-result-icon adp-result-icon-success'
            : 'adp-result-icon adp-result-icon-warning'
        }
      >
        {importResult.errorCount === 0 ? (
          <CheckCircle2 size={48} color="var(--gr)" />
        ) : (
          <AlertTriangle size={48} color="var(--am)" />
        )}
      </div>

      <h2 className="adp-result-title">Kết quả Import Ngành</h2>

      <p className="adp-result-desc">
        Đã đọc tổng cộng <strong>{importResult.totalRows}</strong> dòng từ file.
      </p>

      <div className="adp-result-box">
        <div className="adp-result-row">
          <span>Tổng số dòng đã đọc:</span>
          <strong>{importResult.totalRows || 0} dòng</strong>
        </div>

        <div className="adp-result-row">
          <span>Thêm mới thành công:</span>
          <strong className="adp-text-green">
            {importResult.successCount || 0} ngành
          </strong>
        </div>

        <div className="adp-result-row">
          <span>Cập nhật thông tin:</span>
          <strong className="adp-text-blue">
            {importResult.updateCount || 0} ngành
          </strong>
        </div>

        <div className="adp-result-row no-border">
          <span>Dòng bị bỏ qua (lỗi):</span>
          <strong className="adp-text-red">
            {importResult.errorCount || 0} dòng
          </strong>
        </div>
      </div>

      {importResult.errors && importResult.errors.length > 0 && (
        <div className="adp-error-detail">
          <div className="adp-error-detail-title">
            <AlertTriangle size={16} />
            Chi tiết các dòng lỗi
          </div>

          <ul className="adp-error-list">
            {importResult.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="adp-center-actions">
        <button className="btn btn-s adp-btn-icon" onClick={resetImport}>
          <UploadCloud size={14} />
          Import thêm file
        </button>

        <button className="btn btn-p adp-btn-icon" onClick={goBackToList}>
          <BookOpen size={14} />
          Xem danh sách Ngành
        </button>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="card adp-error-card">
      <div className="adp-error-circle">
        <AlertTriangle size={36} color="var(--rd)" />
      </div>

      <h3 className="adp-error-title">Import Thất Bại</h3>

      <p className="adp-error-text">{importError}</p>

      <button className="btn btn-p" onClick={resetImport}>
        Thử lại
      </button>
    </div>
  );

  const renderEditModal = () => (
    <div className="adp-modal-overlay">
      <div className="card adp-modal">
        <div className="adp-modal-header">
          <h3>Cập nhật Ngành</h3>

          <button
            className="btn btn-s adp-close-btn"
            onClick={() => setEditingDept(null)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="adp-form-group">
          <label>Mã Ngành</label>
          <input
            type="text"
            value={editingDept.code || ''}
            readOnly
            className="adp-input adp-input-muted"
          />
        </div>

        <div className="adp-form-group">
          <label>Tên Ngành</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nhập tên ngành..."
            className="adp-input adp-input-primary"
            autoFocus
          />
        </div>

        <div className="adp-form-group adp-form-group-large">
          <label>Khoa trực thuộc</label>
          <select
            className="fi adp-input adp-input-muted"
            value={editFacultyId || ''}
            onChange={(e) => setEditFacultyId(e.target.value)}
          >
            <option value="" disabled>
              -- Chọn Khoa --
            </option>

            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="adp-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setEditingDept(null)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p adp-btn-icon"
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
    <div className="adp-modal-overlay">
      <div className="card adp-modal">
        <div className="adp-modal-header">
          <h3>Thêm Ngành mới</h3>

          <button
            className="btn btn-s adp-close-btn"
            onClick={() => setIsAdding(false)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="adp-form-group">
          <label>Mã Ngành</label>
          <input
            type="text"
            value={addCode}
            onChange={(e) => setAddCode(e.target.value)}
            placeholder="Nhập mã ngành..."
            className="adp-input adp-input-muted"
            autoFocus
          />
        </div>

        <div className="adp-form-group">
          <label>Tên Ngành</label>
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Nhập tên ngành..."
            className="adp-input adp-input-primary"
          />
        </div>

        <div className="adp-form-group adp-form-group-large">
          <label>Khoa trực thuộc</label>
          <select
            className="fi adp-input adp-input-muted"
            value={addFacultyId}
            onChange={(e) => setAddFacultyId(e.target.value)}
          >
            <option value="" disabled>
              -- Chọn Khoa --
            </option>

            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="adp-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setIsAdding(false)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p adp-btn-icon"
            onClick={handleSaveAdd}
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

      {editingDept && renderEditModal()}
      {isAdding && renderAddModal()}
    </div>
  );
}
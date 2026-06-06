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
  Edit,
  Trash2,
  X,
} from 'lucide-react';

import api from '../utils/api';
import '../css/AdminSubjects.css';

export default function AdminSubjects() {
  const { confirm } = useConfirm();
  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [subjects, setSubjects] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchText, setSearchText] = useState('');

  // --- EDIT & DELETE STATE ---
  const [editingSubject, setEditingSubject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCredits, setEditCredits] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // --- ADD STATE ---
  const [isAdding, setIsAdding] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addCredits, setAddCredits] = useState('');

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState('upload');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  // =====================
  // FETCH SUBJECT LIST
  // =====================
  const fetchSubjects = async (signal) => {
    setListLoading(true);
    setListError('');

    try {
      const res = await api.get('/api/v1/subjects', { signal });
      setSubjects(res.data.result || []);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;

      setListError(
        err.response?.data?.message || 'Không thể tải danh sách môn học.'
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'list') return;

    const controller = new AbortController();

    Promise.resolve().then(() => fetchSubjects(controller.signal));

    return () => controller.abort();
  }, [view]);

  // =====================
  // EDIT & DELETE HANDLERS
  // =====================
  const handleEditClick = (subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditCredits(subject.credits);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editCredits) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    setIsSaving(true);

    try {
      await api.put(`/api/v1/subjects/${editingSubject.id}`, {
        name: editName,
        credits: parseInt(editCredits),
      });

      setEditingSubject(null);
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subject) => {
    if (
      !(await confirm(
        `Bạn có chắc chắn muốn xóa môn học "${subject.name}" không?`
      ))
    ) {
      return;
    }

    setIsDeleting(subject.id);

    try {
      await api.delete(`/api/v1/subjects/${subject.id}`);
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setAddCode('');
    setAddName('');
    setAddCredits('');
  };

  const handleSaveAdd = async () => {
    if (!addCode.trim() || !addName.trim() || !addCredits) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    setIsSaving(true);

    try {
      await api.post('/api/v1/subjects', {
        code: addCode,
        name: addName,
        credits: parseInt(addCredits),
      });

      setIsAdding(false);
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thêm mới thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  // =====================
  // IMPORT HANDLERS
  // =====================
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setImportError('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV');
      setImportStep('error');
      e.target.value = null;
      return;
    }

    setImportStep('importing');
    setProgress(10);
    setStatusText('Đang tải file lên...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setTimeout(() => {
        setProgress(40);
        setStatusText('Đang đọc dữ liệu Excel...');
      }, 500);

      const res = await api.post('/api/v1/subjects/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProgress(100);
      setStatusText('Xử lý hoàn tất');
      setImportResult(res.data.result);
      setImportStep('success');
    } catch (err) {
      setProgress(0);
      setImportError(
        err.response?.data?.message ||
          'Đã xảy ra lỗi khi import dữ liệu. Vui lòng kiểm tra lại file.'
      );
      setImportStep('error');
    }

    e.target.value = null;
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/api/v1/subjects/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_MonHoc.xlsx');

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Không thể tải file mẫu. Vui lòng thử lại sau.');
    }
  };

  const closeImport = () => {
    setView('list');
    setImportStep('upload');
    setImportResult(null);
    setImportError('');
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

  const filteredSubjects = subjects.filter(
    (subject) =>
      (subject.name?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
      (subject.code?.toLowerCase() || '').includes(searchText.toLowerCase())
  );

  // =====================
  // RENDER HELPERS
  // =====================
  const renderHeader = () => (
    <div className="asb-header">
      <div>
        <div className="tb-title asb-page-title">
          <BookOpen size={24} color="var(--bl)" />
          Quản lý Môn học
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? `Danh sách Môn học · ${subjects.length} môn học trong hệ thống`
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="asb-header-actions">
        {view === 'list' ? (
          <>
            <button
              className="btn btn-s asb-btn-icon"
              onClick={() => fetchSubjects()}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button className="btn btn-p asb-btn-icon" onClick={handleAddClick}>
              Thêm mới
            </button>

            <button
              className="btn btn-p asb-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Excel
            </button>
          </>
        ) : (
          <button className="btn btn-s asb-btn-icon" onClick={closeImport}>
            <ArrowLeft size={14} />
            Quay lại danh sách
          </button>
        )}
      </div>
    </div>
  );

  const renderImportView = () => (
    <>
      {importStep === 'upload' && renderUploadStep()}
      {importStep !== 'upload' && renderImportProcess()}
    </>
  );

  const renderUploadStep = () => (
    <div className="g2">
      <div className="card">
        <div className="card-h">
          <div className="card-t">Tải lên file Excel</div>
        </div>

        <div className="asb-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="asb-hidden-input"
          />

          <div className="upz asb-upload-zone" onClick={handleImportClick}>
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="asb-upload-icon"
            />

            <div className="asb-upload-title">Nhấn để chọn file Excel</div>

            <div className="asb-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="asb-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card asb-template-card">
        <div className="asb-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="asb-template-title">File mẫu Import Môn học</h3>

        <p className="asb-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Môn học chưa có
          và <strong>cập nhật</strong> những Môn học đã tồn tại dựa trên mã Môn
          học.
        </p>

        <button className="btn btn-p asb-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportProcess = () => (
    <div className="card asb-import-card">
      <div className="card-h asb-card-header-between">
        <div>
          <div className="card-t">Nhập dữ liệu Môn học từ Excel</div>
          <div className="card-su">Hệ thống đang xử lý file tải lên...</div>
        </div>

        <button className="btn btn-s btn-sm asb-btn-icon" onClick={closeImport}>
          <ArrowLeft size={14} />
          Quay lại
        </button>
      </div>

      <div className="asb-import-body">
        {importStep === 'importing' && renderImportingState()}
        {importStep === 'error' && renderImportErrorState()}
        {importStep === 'success' && importResult && renderImportSuccessState()}
      </div>
    </div>
  );

  const renderImportingState = () => (
    <div className="asb-center">
      <FileSpreadsheet
        size={48}
        color="var(--bl)"
        className="pulse asb-state-icon"
      />

      <h3 className="asb-state-title">{statusText}</h3>

      <div className="pb asb-progress">
        <div
          className="pf bl asb-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="asb-muted-text">
        Vui lòng không đóng trình duyệt trong quá trình này...
      </p>
    </div>
  );

  const renderImportErrorState = () => (
    <div className="asb-center">
      <AlertTriangle
        size={48}
        color="var(--rd)"
        className="asb-state-icon"
      />

      <h3 className="asb-state-title asb-text-red">Import thất bại</h3>

      <p className="asb-error-message">{importError}</p>

      <div className="asb-center-actions">
        <button className="btn btn-s" onClick={closeImport}>
          Hủy bỏ
        </button>

        <button className="btn btn-p" onClick={handleImportClick}>
          Thử lại file khác
        </button>
      </div>
    </div>
  );

  const renderImportSuccessState = () => (
    <div>
      <div className="asb-center asb-success-head">
        <CheckCircle2
          size={48}
          color="var(--gr)"
          className="asb-state-icon"
        />

        <h3 className="asb-state-title asb-text-green">
          Import dữ liệu thành công!
        </h3>

        <p className="asb-success-desc">
          Hệ thống đã đọc và xử lý xong file dữ liệu của bạn.
        </p>
      </div>

      <div className="asb-result-box">
        <div className="asb-result-row">
          <span>Tổng số dòng hợp lệ:</span>
          <strong>{importResult.totalRowsProcessed || 0} dòng</strong>
        </div>

        <div className="asb-result-row">
          <span>Thêm mới thành công:</span>
          <strong className="asb-text-green">
            {importResult.successCount || 0} môn học
          </strong>
        </div>

        <div className="asb-result-row no-border">
          <span>Cập nhật thông tin:</span>
          <strong className="asb-text-blue">
            {importResult.updatedCount || 0} môn học
          </strong>
        </div>
      </div>

      {importResult.errors && importResult.errors.length > 0 && (
        <div className="asb-warning-box">
          <h4 className="asb-warning-title">
            <AlertTriangle size={16} />
            Có {importResult.errors.length} cảnh báo/lỗi:
          </h4>

          <ul className="asb-warning-list">
            {importResult.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="asb-center">
        <button className="btn btn-p" onClick={closeImport}>
          Đóng và Xem danh sách
        </button>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Danh sách Môn học</div>
          <div className="card-su">Tất cả các môn học hiện có trong hệ thống</div>
        </div>

        <div className="srch">
          <Search className="srch-ic" size={14} />
          <input
            type="text"
            placeholder="Tìm tên, mã môn..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      
      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListError()}
      {!listLoading &&
        !listError &&
        filteredSubjects.length === 0 &&
        renderListEmpty()}
      {!listLoading &&
        !listError &&
        filteredSubjects.length > 0 &&
        renderSubjectTable()}
    </div>
  );

  

  const renderListLoading = () => (
    <div className="asb-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse asb-list-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListError = () => (
    <div className="asb-list-state asb-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="asb-list-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchSubjects()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="asb-list-state">
      <BookOpen size={48} color="var(--tx3)" className="asb-empty-icon" />

      <p>
        {searchText
          ? `Không tìm thấy môn học nào với từ khóa "${searchText}"`
          : 'Chưa có dữ liệu Môn học. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!searchText && (
        <button
          className="btn btn-p asb-btn-icon asb-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import Excel ngay
        </button>
      )}
    </div>
  );

  const renderSubjectTable = () => (
    <>
      <div className="asb-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th className="asb-col-index">#</th>
              <th className="asb-col-code">Mã Môn</th>
              <th>Tên Môn học</th>
              <th className="asb-col-credits">Số TC</th>
              <th className="asb-col-date">
                <span className="asb-th-icon">
                  <Calendar size={12} />
                  Ngày tạo
                </span>
              </th>
              <th className="asb-col-date">
                <span className="asb-th-icon">
                  <Calendar size={12} />
                  Cập nhật lúc
                </span>
              </th>
              <th className="asb-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredSubjects.map((subject, index) => (
              <tr key={subject.id}>
                <td data-label="#" className="asb-index-cell">{index + 1}</td>

                <td data-label="Mã Môn">
                  <span className="asb-subject-code">
                    {subject.code || '—'}
                  </span>
                </td>

                <td data-label="Tên Môn học" className="asb-name-cell">{subject.name}</td>

                <td data-label="Số TC" className="asb-credits-cell">{subject.credits}</td>

                <td data-label="Ngày tạo" className="asb-date-cell">
                  {formatDate(subject.createdAt)}
                </td>

                <td data-label="Cập nhật lúc" className="asb-date-cell">
                  {formatDate(subject.updatedAt)}
                </td>

                <td data-label="Thao tác" className="asb-action-cell">
                  <div className="asb-row-actions">
                    <button
                      className="btn btn-s asb-icon-btn"
                      title="Sửa"
                      onClick={() => handleEditClick(subject)}
                    >
                      <Edit size={14} color="var(--bl)" />
                    </button>

                    <button
                      className="btn btn-s asb-icon-btn asb-delete-btn"
                      title="Xóa"
                      onClick={() => handleDelete(subject)}
                      disabled={isDeleting === subject.id}
                    >
                      {isDeleting === subject.id ? (
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

      <div className="asb-table-footer">
        Hiển thị {filteredSubjects.length}/{subjects.length} môn học
      </div>
    </>
  );

  const renderEditModal = () => (
    <SubjectModal
      title="Cập nhật Môn học"
      mode="edit"
      isSaving={isSaving}
      code={editingSubject.code}
      name={editName}
      credits={editCredits}
      setName={setEditName}
      setCredits={setEditCredits}
      onClose={() => setEditingSubject(null)}
      onSubmit={handleSaveEdit}
    />
  );

  const renderAddModal = () => (
    <SubjectModal
      title="Thêm Môn học mới"
      mode="add"
      isSaving={isSaving}
      code={addCode}
      name={addName}
      credits={addCredits}
      setCode={setAddCode}
      setName={setAddName}
      setCredits={setAddCredits}
      onClose={() => setIsAdding(false)}
      onSubmit={handleSaveAdd}
    />
  );

  return (
    <div className="page active">
      {renderHeader()}

      {view === 'import' && renderImportView()}
      {view === 'list' && renderListView()}

      {editingSubject && renderEditModal()}
      {isAdding && renderAddModal()}
    </div>
  );
}

function SubjectModal({
  title,
  mode,
  isSaving,
  code,
  name,
  credits,
  setCode,
  setName,
  setCredits,
  onClose,
  onSubmit,
}) {
  const isEditMode = mode === 'edit';

  return (
    <div className="asb-modal-overlay">
      <div className="card asb-modal">
        <div className="asb-modal-header">
          <h3>{title}</h3>

          <button className="btn btn-s asb-close-btn" onClick={onClose}>
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        {isEditMode ? (
          <div className="asb-form-group">
            <label>Mã Môn học (Chỉ đọc)</label>
            <div className="asb-readonly-field">{code}</div>
          </div>
        ) : (
          <div className="asb-form-group">
            <label>Mã Môn học</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ví dụ: IT1110"
              className="asb-input asb-input-muted"
              autoFocus
            />
          </div>
        )}

        <div className="asb-form-group">
          <label>Tên Môn học</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên môn học..."
            className="asb-input asb-input-primary"
            autoFocus={isEditMode}
          />
        </div>

        <div className="asb-form-group asb-form-group-large">
          <label>Số Tín chỉ</label>
          <input
            type="number"
            min="1"
            max="10"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="asb-input"
          />
        </div>

        <div className="asb-modal-actions">
          <button className="btn btn-s" onClick={onClose} disabled={isSaving}>
            Hủy
          </button>

          <button
            className="btn btn-p asb-btn-icon"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw size={14} className="pulse" />
            ) : (
              <CheckCircle2 size={14} />
            )}

            {isEditMode ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
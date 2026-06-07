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
  Search,
  Edit,
  Trash2,
  X,
  Users,
} from 'lucide-react';

import api from '../utils/api';
import '../css/AdminAdministrativeClasses.css';

export default function AdminAdministrativeClasses() {
  const { showError } = useError();

  const { confirm } = useConfirm();
  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [classes, setClasses] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchText, setSearchText] = useState('');

  // --- EDIT & DELETE STATE ---
  const [editingClass, setEditingClass] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCohortYear, setEditCohortYear] = useState('');
  const [editLecturerCode, setEditLecturerCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // --- ADD STATE ---
  const [isAdding, setIsAdding] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addCohortYear, setAddCohortYear] = useState('');
  const [addDepartmentId, setAddDepartmentId] = useState('');
  const [addLecturerCode, setAddLecturerCode] = useState('');

  const [departments, setDepartments] = useState([]);

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState('upload');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  // =====================
  // FETCH LIST
  // =====================
  const fetchClasses = async (signal) => {
    setListLoading(true);
    setListError('');

    try {
      const res = await api.get('/api/v1/administrative-classes', { signal });
      setClasses(res.data.result || []);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;

      setListError(
        err.response?.data?.message ||
          'Không thể tải danh sách lớp hành chính.'
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'list') return;

    const controller = new AbortController();

    Promise.resolve().then(() => fetchClasses(controller.signal));

    return () => controller.abort();
  }, [view]);

  // =====================
  // EDIT & DELETE
  // =====================
  const handleEditClick = (cls) => {
    setEditingClass(cls);
    setEditName(cls.name || '');
    setEditCohortYear(cls.cohortYear || '');
    setEditLecturerCode(cls.homeroomTeacherCode || '');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editCohortYear.trim()) {
      showError('Vui lòng nhập Tên lớp và Khóa học!');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: editName,
        cohortYear: editCohortYear,
        lecturerCode: editLecturerCode || '',
      };

      await api.put(
        `/api/v1/administrative-classes/${editingClass.id}`,
        payload
      );

      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      showError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cls) => {
    if (!(await confirm(`Bạn có chắc chắn muốn xóa lớp "${cls.code}" không?`))) {
      return;
    }

    setIsDeleting(cls.id);

    try {
      await api.delete(`/api/v1/administrative-classes/${cls.id}`);
      fetchClasses();
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddClick = async () => {
    setIsAdding(true);
    setAddCode('');
    setAddName('');
    setAddCohortYear('');
    setAddDepartmentId('');
    setAddLecturerCode('');

    try {
      const res = await api.get('/api/v1/departments');
      setDepartments(res.data.result || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách ngành', err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  };

  const handleSaveAdd = async () => {
    if (!addCode.trim() || !addName.trim() || !addCohortYear.trim()) {
      showError('Vui lòng nhập Mã lớp, Tên lớp và Khóa học!');
      return;
    }

    if (!addDepartmentId) {
      showError('Vui lòng chọn Ngành!');
      return;
    }

    setIsSaving(true);

    try {
      await api.post('/api/v1/administrative-classes', {
        code: addCode,
        name: addName,
        cohortYear: addCohortYear,
        departmentId: Number(addDepartmentId),
        homeroomTeacherCode: addLecturerCode || '',
      });

      setIsAdding(false);
      fetchClasses();
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
  // IMPORT
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

      const res = await api.post(
        '/api/v1/administrative-classes/import',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

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
      const res = await api.get('/api/v1/administrative-classes/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_LopHanhChinh.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showError('Không thể tải file mẫu. Vui lòng thử lại sau.');
    }
  };

  const closeImport = () => {
    setView('list');
    setImportStep('upload');
    setImportResult(null);
    setImportError('');
  };

  // =====================
  // RENDER HELPERS
  // =====================

  const filteredClasses = classes.filter(
    (c) =>
      (c.code?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
      (c.name?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
      (c.departmentName?.toLowerCase() || '').includes(
        searchText.toLowerCase()
      ) ||
      (c.homeroomTeacherName?.toLowerCase() || '').includes(
        searchText.toLowerCase()
      )
  );

  const renderHeader = () => (
    <div className="aac-header">
      <div>
        <div className="tb-title aac-title">
          <Users size={24} color="var(--bl)" />
          Quản lý lớp hành chính
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? `Danh sách Lớp sinh viên · ${classes.length} lớp trong hệ thống`
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="aac-actions">
        {view === 'list' ? (
          <>
            <button className="btn btn-s aac-btn-icon" onClick={() => fetchClasses()}>
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button className="btn btn-p aac-btn-icon" onClick={handleAddClick}>
              Thêm mới
            </button>

            <button
              className="btn btn-p aac-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Excel
            </button>
          </>
        ) : (
          <button className="btn btn-s aac-btn-icon" onClick={closeImport}>
            <ArrowLeft size={14} />
            Quay lại danh sách
          </button>
        )}
      </div>
    </div>
  );

  const renderImportUpload = () => (
    <div className="g2">
      <div className="card">
        <div className="card-h">
          <div className="card-t">Tải lên file Excel</div>
        </div>

        <div className="aac-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="aac-hidden-input"
          />

          <div className="upz aac-upload-zone" onClick={handleImportClick}>
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="aac-upload-icon"
            />

            <div className="aac-upload-title">Nhấn để chọn file Excel</div>

            <div className="aac-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="aac-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card aac-template-card">
        <div className="aac-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="aac-template-title">File mẫu Import Lớp</h3>

        <p className="aac-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Lớp chưa có và{' '}
          <strong>cập nhật</strong> những Lớp đã tồn tại.
        </p>

        <button className="btn btn-p aac-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportProcessing = () => (
    <div className="card aac-import-card">
      <div className="card-h aac-card-header-between">
        <div>
          <div className="card-t">Nhập dữ liệu Lớp từ Excel</div>
          <div className="card-su">Hệ thống đang xử lý file tải lên...</div>
        </div>

        <button className="btn btn-s btn-sm aac-btn-icon" onClick={closeImport}>
          <ArrowLeft size={14} />
          Quay lại
        </button>
      </div>

      <div className="aac-import-body">
        {importStep === 'importing' && renderImportingState()}
        {importStep === 'error' && renderImportErrorState()}
        {importStep === 'success' && importResult && renderImportSuccessState()}
      </div>
    </div>
  );

  const renderImportingState = () => (
    <div className="aac-center">
      <FileSpreadsheet
        size={48}
        color="var(--bl)"
        className="pulse aac-state-icon"
      />

      <h3 className="aac-state-title">{statusText}</h3>

      <div className="pb aac-progress">
        <div
          className="pf bl aac-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="aac-muted-text">
        Vui lòng không đóng trình duyệt trong quá trình này...
      </p>
    </div>
  );

  const renderImportErrorState = () => (
    <div className="aac-center">
      <AlertTriangle
        size={48}
        color="var(--rd)"
        className="aac-state-icon"
      />

      <h3 className="aac-state-title aac-text-red">Import thất bại</h3>

      <p className="aac-error-message">{importError}</p>

      <div className="aac-center-actions">
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
      <div className="aac-center aac-success-head">
        <CheckCircle2
          size={48}
          color="var(--gr)"
          className="aac-state-icon"
        />

        <h3 className="aac-state-title aac-text-green">
          Import dữ liệu thành công!
        </h3>

        <p className="aac-success-desc">
          Hệ thống đã đọc và xử lý xong file dữ liệu của bạn.
        </p>
      </div>

      <div className="aac-result-box">
        <div className="aac-result-row">
          <span>Tổng số dòng hợp lệ:</span>
          <strong>{importResult.totalRowsProcessed || 0} dòng</strong>
        </div>

        <div className="aac-result-row">
          <span>Thêm mới thành công:</span>
          <strong className="aac-text-green">
            {importResult.successCount || 0} lớp
          </strong>
        </div>

        <div className="aac-result-row no-border">
          <span>Cập nhật thông tin:</span>
          <strong className="aac-text-blue">
            {importResult.updatedCount || 0} lớp
          </strong>
        </div>
      </div>

      {importResult.errors && importResult.errors.length > 0 && (
        <div className="aac-warning-box">
          <h4 className="aac-warning-title">
            <AlertTriangle size={16} />
            Có {importResult.errors.length} cảnh báo/lỗi:
          </h4>

          <ul className="aac-warning-list">
            {importResult.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="aac-center">
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
          <div className="card-t">Danh sách Lớp</div>
          <div className="card-su">
            Tất cả các lớp sinh viên hiện có trong hệ thống
          </div>
        </div>

        <div className="srch">
          <Search className="srch-ic" size={14} />
          <input
            type="text"
            placeholder="Tìm theo mã, tên, khoa..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      
      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListError()}
      {!listLoading &&
        !listError &&
        filteredClasses.length === 0 &&
        renderListEmpty()}
      {!listLoading &&
        !listError &&
        filteredClasses.length > 0 &&
        renderClassTable()}
    </div>
  );

  

  const renderListLoading = () => (
    <div className="aac-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse aac-list-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListError = () => (
    <div className="aac-list-state">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="aac-list-state-icon"
      />

      <p className="aac-text-red">{listError}</p>

      <button className="btn btn-p" onClick={() => fetchClasses()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="aac-list-state">
      <Users size={48} color="var(--tx3)" className="aac-empty-icon" />

      <p>
        {searchText
          ? `Không tìm thấy lớp nào với từ khóa "${searchText}"`
          : 'Chưa có dữ liệu Lớp. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!searchText && (
        <button
          className="btn btn-p aac-btn-icon aac-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import Excel ngay
        </button>
      )}
    </div>
  );

  const renderClassTable = () => (
    <>
      <div className="aac-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th className="aac-col-index">#</th>
              <th className="aac-col-code">Mã Lớp</th>
              <th>Tên lớp & Khoa</th>
              <th>Khóa học</th>
              <th>GV Chủ nhiệm</th>
              <th className="aac-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredClasses.map((cls, index) => (
              <tr key={cls.id}>
                <td data-label="#" className="aac-index-cell">{index + 1}</td>

                <td data-label="Mã Lớp">
                  <span className="aac-class-code">{cls.code || '—'}</span>
                </td>

                <td data-label="Tên lớp & Khoa">
                  <div className="aac-class-name">{cls.name}</div>
                  <div className="aac-class-department">
                    {cls.departmentName || 'Chưa thuộc khoa/ngành'}
                  </div>
                </td>

                <td data-label="Khóa học">
                  <span className="aac-cohort">{cls.cohortYear || '—'}</span>
                </td>

                <td data-label="GV Chủ nhiệm">
                  {cls.homeroomTeacherName ? (
                    <span>{cls.homeroomTeacherName}</span>
                  ) : (
                    <span className="aac-empty-teacher">Chưa phân công</span>
                  )}
                </td>

                <td data-label="Thao tác" className="aac-action-cell">
                  <div className="aac-row-actions">
                    <button
                      className="btn btn-s aac-icon-btn"
                      title="Sửa"
                      onClick={() => handleEditClick(cls)}
                    >
                      <Edit size={14} color="var(--bl)" />
                    </button>

                    <button
                      className="btn btn-s aac-icon-btn aac-delete-btn"
                      title="Xóa"
                      onClick={() => handleDelete(cls)}
                      disabled={isDeleting === cls.id}
                    >
                      {isDeleting === cls.id ? (
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

      <div className="aac-table-footer">
        Hiển thị {filteredClasses.length}/{classes.length} lớp
      </div>
    </>
  );

  const renderEditModal = () => (
    <div className="aac-modal-overlay">
      <div className="card aac-modal">
        <div className="aac-modal-header">
          <h3>Cập nhật Lớp hành chính</h3>

          <button
            className="btn btn-s aac-close-btn"
            onClick={() => setEditingClass(null)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="aac-form-row">
          <div className="aac-form-group">
            <label>Mã Lớp (Chỉ đọc)</label>
            <div className="aac-readonly-field">{editingClass.code}</div>
          </div>

          <div className="aac-form-group">
            <label>Ngành (Chỉ đọc)</label>
            <div
              className="aac-readonly-field aac-ellipsis"
              title={editingClass.departmentName}
            >
              {editingClass.departmentCode}
            </div>
          </div>
        </div>

        <div className="aac-form-group">
          <label>Tên Lớp</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Ví dụ: Lớp CNTT K22A"
            className="aac-input aac-input-primary"
            autoFocus
          />
        </div>

        <div className="aac-form-row">
          <div className="aac-form-group">
            <label>Khóa học</label>
            <input
              type="text"
              value={editCohortYear}
              onChange={(e) => setEditCohortYear(e.target.value)}
              placeholder="Ví dụ: K22"
              className="aac-input"
            />
          </div>

          <div className="aac-form-group">
            <label>Mã Giảng viên CN</label>
            <input
              type="text"
              value={editLecturerCode}
              onChange={(e) => setEditLecturerCode(e.target.value)}
              placeholder="Mã Giảng viên"
              className="aac-input"
            />
          </div>
        </div>

        <div className="aac-form-note">
          * Nhập mã giảng viên chủ nhiệm. Để trống nếu chưa phân công.
        </div>

        <div className="aac-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setEditingClass(null)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p aac-btn-icon"
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
    <div className="aac-modal-overlay">
      <div className="card aac-modal">
        <div className="aac-modal-header">
          <h3>Thêm Lớp hành chính mới</h3>

          <button
            className="btn btn-s aac-close-btn"
            onClick={() => setIsAdding(false)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="aac-form-row">
          <div className="aac-form-group">
            <label>Mã Lớp</label>
            <input
              type="text"
              value={addCode}
              onChange={(e) => setAddCode(e.target.value)}
              placeholder="Ví dụ: CNTTK22A"
              className="aac-input aac-input-muted"
              autoFocus
            />
          </div>

          <div className="aac-form-group">
            <label>Tên Lớp</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Ví dụ: Lớp CNTT K22A"
              className="aac-input aac-input-primary"
            />
          </div>
        </div>

        <div className="aac-form-group">
          <label>Ngành</label>
          <select
            className="fi aac-input aac-input-muted"
            value={addDepartmentId}
            onChange={(e) => setAddDepartmentId(e.target.value)}
          >
            <option value="" disabled>
              -- Chọn Ngành --
            </option>

            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="aac-form-row">
          <div className="aac-form-group">
            <label>Khóa học</label>
            <input
              type="text"
              value={addCohortYear}
              onChange={(e) => setAddCohortYear(e.target.value)}
              placeholder="Ví dụ: K22"
              className="aac-input"
            />
          </div>

          <div className="aac-form-group">
            <label>Mã Giảng viên CN</label>
            <input
              type="text"
              value={addLecturerCode}
              onChange={(e) => setAddLecturerCode(e.target.value)}
              placeholder="Mã Giảng viên"
              className="aac-input"
            />
          </div>
        </div>

        <div className="aac-form-note">
          * Nhập mã giảng viên chủ nhiệm. Để trống nếu chưa phân công.
        </div>

        <div className="aac-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setIsAdding(false)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p aac-btn-icon"
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

      {view === 'import' && (
        <>
          {importStep === 'upload' && renderImportUpload()}
          {importStep !== 'upload' && renderImportProcessing()}
        </>
      )}

      {view === 'list' && renderListView()}

      {editingClass && renderEditModal()}
      {isAdding && renderAddModal()}
    </div>
  );
}
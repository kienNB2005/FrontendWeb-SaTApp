import { useError } from '../contexts/ErrorContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  Users,
  UserPlus,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import api from '../utils/api';
import '../css/AdminStudents.css';

const DEFAULT_ADD_FORM = {
  fullName: '',
  email: '',
  studentCode: '',
  adminClassId: '',
  phoneNumber: '',
  gender: '',
  birthday: '',
  birthPlace: '',
};

const DEFAULT_EDIT_FORM = {
  fullName: '',
  email: '',
  isActive: true,
  phoneNumber: '',
  gender: '',
  birthday: '',
  birthPlace: '',
};

export default function AdminStudents() {
  const { showError } = useError();

  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Pagination & Filters
  const [searchText, setSearchText] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const size = 10;

  // --- ADD STATE ---
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addForm, setAddForm] = useState(DEFAULT_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // --- EDIT STATE ---
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState('upload');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [previewList, setPreviewList] = useState([]);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const isFirstRender = useRef(true);

  const validCount = previewList.filter((x) => x.valid).length;
  const invalidCount = previewList.length - validCount;

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/administrative-classes');
      const data = res.data.result || res.data.data || res.data;
      const classList = Array.isArray(data) ? data : data?.content || [];

      setClasses(classList);
    } catch (err) {
      console.error('Lỗi lấy danh sách lớp', err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchClasses());
  }, [fetchClasses]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPage(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchStudents = useCallback(async () => {
    setListLoading(true);
    setListError('');

    try {
      const params = {
        page,
        size,
        sort: 'id,desc',
      };

      if (debouncedSearchText.trim()) {
        params.search = debouncedSearchText.trim();
      }

      if (selectedClassId) {
        params.classId = selectedClassId;
      }

      if (selectedStatus !== '') {
        params.isActive = selectedStatus === 'true';
      }

      const res = await api.get('/api/v1/users/students', { params });

      if (res.data.result) {
        setStudents(res.data.result.content || []);
        setTotalPages(
          res.data.result.page?.totalPages || res.data.result.totalPages || 1
        );
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
      setListError(
        err.response?.data?.message ||
          err.message ||
          JSON.stringify(err) ||
          'Không thể tải danh sách sinh viên.'
      );
    } finally {
      setListLoading(false);
    }
  }, [page, debouncedSearchText, selectedClassId, selectedStatus]);

  useEffect(() => {
    if (view === 'list') {
      Promise.resolve().then(() => fetchStudents());
    }
  }, [page, selectedClassId, selectedStatus, debouncedSearchText, view, fetchStudents]);

  const handleEditClick = (student) => {
    setEditingStudent(student);

    setEditForm({
      fullName: student.fullName || '',
      email: student.email || '',
      isActive: student.isActive !== false,
      phoneNumber: student.phoneNumber || '',
      gender: student.gender || '',
      birthday: student.birthday || '',
      birthPlace: student.birthPlace || '',
    });

    setEditError('');
  };

  const handleAddStudentClick = () => {
    setIsAddingStudent(true);
    setAddForm(DEFAULT_ADD_FORM);
    setAddError('');
  };

  const handleCreateStudent = async () => {
    if (
      !addForm.fullName ||
      !addForm.email ||
      !addForm.studentCode ||
      !addForm.adminClassId
    ) {
      setAddError(
        'Vui lòng điền đầy đủ Tên, Email, Mã sinh viên và chọn Lớp hành chính'
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email)) {
      setAddError('Định dạng Email không hợp lệ');
      return;
    }

    if (addForm.phoneNumber && !/^[0-9]{10,11}$/.test(addForm.phoneNumber)) {
      setAddError('Số điện thoại không hợp lệ (phải từ 10-11 số)');
      return;
    }

    setAddLoading(true);
    setAddError('');

    try {
      const payload = {
        ...addForm,
        adminClassId: Number(addForm.adminClassId),
      };

      if (payload.gender === '') payload.gender = null;
      await api.post('/api/v1/users/students', payload);

      setIsAddingStudent(false);
      fetchStudents();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Lỗi khi thêm sinh viên');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editForm.fullName || !editForm.email) {
      setEditError('Vui lòng điền đầy đủ Tên và Email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      setEditError('Định dạng Email không hợp lệ');
      return;
    }

    if (editForm.phoneNumber && !/^[0-9]{10,11}$/.test(editForm.phoneNumber)) {
      setEditError('Số điện thoại không hợp lệ (phải từ 10-11 số)');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const payload = { ...editForm };
      if (payload.gender === '') payload.gender = null;
      await api.put(`/api/v1/users/students/${editingStudent.id}`, payload);

      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Lỗi khi cập nhật sinh viên');
    } finally {
      setEditLoading(false);
    }
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

    setImportStep('importing_preview');
    setProgress(20);
    setStatusText('Đang tải file lên để kiểm tra...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setTimeout(() => {
        setProgress(60);
        setStatusText('Đang phân tích dữ liệu Excel...');
      }, 500);

      const res = await api.post(
        '/api/v1/users/students/import/preview',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setProgress(100);
      setPreviewList(res.data.result || []);
      setImportStep('preview');
    } catch (err) {
      setProgress(0);
      setImportError(
        err.response?.data?.message ||
          'Đã xảy ra lỗi khi đọc file dữ liệu. Vui lòng kiểm tra lại cấu trúc file.'
      );
      setImportStep('error');
    }

    e.target.value = null;
  };

  const handleConfirmImport = async () => {
    const validStudents = previewList
      .filter((item) => item.valid)
      .map((item) => item.student);

    if (validStudents.length === 0) {
      showError('Không có dòng dữ liệu hợp lệ nào để import!');
      return;
    }

    setImportStep('importing_confirm');
    setProgress(30);
    setStatusText(`Đang lưu ${validStudents.length} sinh viên vào hệ thống...`);

    try {
      await api.post('/api/v1/users/students/import/confirm', validStudents);

      setProgress(100);
      setStatusText('Lưu dữ liệu thành công!');
      setImportStep('success');
    } catch (err) {
      setProgress(0);
      setImportError(
        err.response?.data?.message || 'Lỗi khi lưu dữ liệu. Vui lòng thử lại sau.'
      );
      setImportStep('error');
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/api/v1/users/students/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_SinhVien.xlsx');

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
    setPreviewList([]);
    setImportError('');
  };

  const updateAddForm = (field, value) => {
    setAddForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEditForm = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getGenderLabel = (gender) => {
    if (gender === 'male') return 'Nam';
    if (gender === 'female') return 'Nữ';
    if (gender === 'other') return 'Khác';
    return '—';
  };

  const renderHeader = () => (
    <div className="ast-header">
      <div>
        <div className="tb-title ast-page-title">
          <Users size={24} color="var(--bl)" />
          Quản lý Sinh viên
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? 'Danh sách sinh viên, trạng thái tài khoản và nhập liệu hàng loạt'
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="ast-header-actions">
        {view === 'list' ? (
          <>
            <button
              className="btn btn-s ast-btn-icon"
              onClick={() => {
                setPage(0);
                fetchStudents();
              }}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button
              className="btn btn-p ast-btn-icon"
              onClick={handleAddStudentClick}
            >
              <UserPlus size={14} />
              Thêm Sinh Viên
            </button>

            <button
              className="btn btn-s ast-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Sinh Viên
            </button>
          </>
        ) : (
          <button className="btn btn-s ast-btn-icon" onClick={closeImport}>
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

        <div className="ast-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="ast-hidden-input"
          />

          <div
            className="upz ast-upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="ast-upload-icon"
            />

            <div className="ast-upload-title">Nhấn để chọn file Excel</div>

            <div className="ast-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="ast-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card ast-template-card">
        <div className="ast-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="ast-template-title">File mẫu Import Sinh Viên</h3>

        <p className="ast-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Sinh viên chưa có
          và <strong>cập nhật</strong> những Sinh viên đã tồn tại dựa trên mã
          Sinh viên. Sinh viên phải thuộc một <strong>Lớp hợp lệ</strong>.
        </p>

        <button className="btn btn-p ast-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportProcess = () => (
    <div className="card ast-import-card">
      <div className="card-h ast-card-header-between">
        <div>
          <div className="card-t">Import Sinh viên hàng loạt</div>
          <div className="card-su">
            {importStep === 'preview'
              ? 'Kiểm tra dữ liệu trước khi lưu'
              : 'Hệ thống đang xử lý file...'}
          </div>
        </div>

        <button className="btn btn-s btn-sm ast-btn-icon" onClick={closeImport}>
          <ArrowLeft size={14} />
          Quay lại
        </button>
      </div>

      <div className="ast-import-body">
        {(importStep === 'importing_preview' ||
          importStep === 'importing_confirm') &&
          renderImportingState()}

        {importStep === 'error' && renderImportErrorState()}
        {importStep === 'success' && renderImportSuccessState()}
        {importStep === 'preview' && renderPreviewState()}
      </div>
    </div>
  );

  const renderImportingState = () => (
    <div className="ast-import-state">
      <FileSpreadsheet
        size={48}
        color="var(--bl)"
        className="pulse ast-state-icon"
      />

      <h3 className="ast-state-title">{statusText}</h3>

      <div className="pb ast-progress">
        <div
          className="pf bl ast-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="ast-muted-text">
        Vui lòng không đóng trình duyệt trong quá trình này...
      </p>
    </div>
  );

  const renderImportErrorState = () => (
    <div className="ast-import-state">
      <AlertTriangle
        size={48}
        color="var(--rd)"
        className="ast-state-icon"
      />

      <h3 className="ast-state-title ast-text-red">Import thất bại</h3>

      <p className="ast-error-message">{importError}</p>

      <div className="ast-center-actions">
        <button
          className="btn btn-s"
          onClick={() => {
            setImportStep('upload');
            setImportError('');
          }}
        >
          Hủy bỏ
        </button>

        <button
          className="btn btn-p"
          onClick={() => fileInputRef.current?.click()}
        >
          Thử lại file khác
        </button>
      </div>
    </div>
  );

  const renderImportSuccessState = () => (
    <div className="ast-success-wrap">
      <div className="ast-import-state">
        <CheckCircle2
          size={48}
          color="var(--gr)"
          className="ast-state-icon"
        />

        <h3 className="ast-state-title ast-text-green">
          Import dữ liệu thành công!
        </h3>

        <p className="ast-success-desc">
          Đã lưu thành công {validCount} sinh viên vào hệ thống.
        </p>
      </div>

      <div className="ast-center">
        <button className="btn btn-p" onClick={closeImport}>
          Đóng và Xem danh sách
        </button>
      </div>
    </div>
  );

  const renderPreviewState = () => (
    <div>
      <div className="ast-preview-stats">
        <PreviewStatCard
          title="Tổng số dòng quét được"
          value={previewList.length}
          type="blue"
        />

        <PreviewStatCard
          title="Dòng hợp lệ (Sẵn sàng)"
          value={validCount}
          type="green"
        />

        <PreviewStatCard
          title="Dòng lỗi (Sẽ bị bỏ qua)"
          value={invalidCount}
          type="red"
        />
      </div>

      <div className="ast-preview-table-wrap">
        <div className="ast-preview-table-scroll">
          <table className="tbl">
            <thead className="ast-preview-thead">
              <tr>
                <th className="ast-col-row">Dòng</th>
                <th className="ast-col-code">Mã SV</th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th className="ast-col-class">Mã Lớp</th>
                <th className="ast-col-status">Trạng thái kiểm tra</th>
              </tr>
            </thead>

            <tbody>
              {previewList.map((item, idx) => {
                const student = item.student || {};

                return (
                  <tr
                    key={idx}
                    className={item.valid ? '' : 'ast-preview-error-row'}
                  >
                    <td className="ast-index-cell">
                      {student.rowIndex || idx + 1}
                    </td>

                    <td className="ast-code-cell">
                      {student.studentCode || '—'}
                    </td>

                    <td>{student.fullName || '—'}</td>

                    <td className="ast-email-cell">{student.email || '—'}</td>

                    <td>
                      <span className="ast-class-badge">
                        {student.adminClassCode || '—'}
                      </span>
                    </td>

                    <td>
                      {item.valid ? (
                        <span className="ast-valid-status">
                          <CheckCircle2 size={14} />
                          Hợp lệ
                        </span>
                      ) : (
                        <div className="ast-invalid-status">
                          <div className="ast-invalid-title">
                            <AlertTriangle size={14} />
                            Lỗi dữ liệu:
                          </div>

                          <ul>
                            {(item.errors || []).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ast-preview-footer">
        <div className="ast-preview-note">
          * Hệ thống chỉ lưu lại những dòng báo{' '}
          <span className="ast-text-green">Hợp lệ</span>.
        </div>

        <div className="ast-preview-actions">
          <button className="btn btn-s" onClick={closeImport}>
            Hủy bỏ
          </button>

          <button
            className="btn btn-p"
            onClick={handleConfirmImport}
            disabled={validCount === 0}
          >
            Xác nhận lưu {validCount} sinh viên hợp lệ
          </button>
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="card">
      <div className="card-h">
        <div className="ast-filter-row">
          <div className="srch">
            <Search className="srch-ic" size={14} />
            <input
              type="text"
              placeholder="Tìm Tên, email, mã SV..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="ast-filter-box">
            <Filter size={14} color="var(--tx3)" />

            <select
              className="fi ast-filter-select"
              value={selectedClassId}
              onChange={(e) => {
                setPage(0);
                setSelectedClassId(e.target.value);
              }}
            >
              <option value="">Tất cả Lớp HC</option>

              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.code} - {cls.name}
                </option>
              ))}
            </select>
          </div>

          <select
            className="fi ast-status-select"
            value={selectedStatus}
            onChange={(e) => {
              setPage(0);
              setSelectedStatus(e.target.value);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        </div>
      </div>

      {renderListGuide()}

      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListError()}
      {!listLoading && !listError && students.length === 0 && renderListEmpty()}
      {!listLoading && !listError && students.length > 0 && renderStudentTable()}
    </div>
  );

  const renderListGuide = () => (
    <div className="ast-guide">
      <div className="ast-guide-content">
        <div className="ast-guide-icon">
          <FileSpreadsheet size={16} color="var(--bl)" />
        </div>

        <div>
          <div className="ast-guide-title">Hướng dẫn nhập liệu</div>
          <div className="ast-guide-desc">
            Tải file mẫu Excel về, điền dữ liệu theo đúng cột và Upload lên hệ
            thống.
          </div>
        </div>
      </div>

      <button className="btn btn-s btn-sm ast-btn-icon" onClick={downloadTemplate}>
        <Download size={14} />
        Tải file mẫu
      </button>
    </div>
  );

  const renderListLoading = () => (
    <div className="ast-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse ast-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListError = () => (
    <div className="ast-list-state ast-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="ast-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchStudents()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="ast-list-state">
      <Users size={48} color="var(--tx3)" className="ast-empty-icon" />

      <p>
        {debouncedSearchText
          ? `Không tìm thấy sinh viên nào với từ khóa "${debouncedSearchText}"`
          : 'Chưa có dữ liệu Sinh viên. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!debouncedSearchText && (
        <button
          className="btn btn-p ast-btn-icon ast-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import Excel ngay
        </button>
      )}
    </div>
  );

  const renderStudentTable = () => (
    <>
      <div className="ast-table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="ast-col-index">#</th>
              <th>Mã SV</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Giới tính</th>
              <th>Lớp HC</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id}>
                <td className="ast-index-cell">{page * size + idx + 1}</td>

                <td className="ast-code-cell">{student.studentCode}</td>

                <td>
                  <div className="ast-user-cell">
                    <div className="ast-avatar">
                      {student.fullName
                        ? student.fullName.substring(0, 2).toUpperCase()
                        : 'SV'}
                    </div>

                    <span>{student.fullName}</span>
                  </div>
                </td>

                <td className="ast-email-cell">{student.email}</td>

                <td className="ast-muted-cell">{student.phoneNumber || '—'}</td>

                <td className="ast-small-cell">{getGenderLabel(student.gender)}</td>

                <td>
                  <div className="ast-class-code">{student.adminClassCode || '—'}</div>
                  <div className="ast-class-name">{student.adminClassName}</div>
                </td>

                <td>
                  {student.isActive ? (
                    <span className="bdg b-op">Hoạt động</span>
                  ) : (
                    <span className="bdg b-ca">Đã khóa</span>
                  )}
                </td>

                <td className="ast-action-cell">
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => handleEditClick(student)}
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && renderPagination()}
    </>
  );

  const renderPagination = () => (
    <div className="ast-pagination">
      <div className="ast-pagination-text">
        Trang {page + 1} / {totalPages}
      </div>

      <div className="ast-pagination-actions">
        <button
          className="btn btn-s ast-pagination-btn"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          className="btn btn-s ast-pagination-btn"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  const renderEditModal = () => (
    <StudentModal
      title="Chỉnh sửa Sinh viên"
      icon={<Users size={20} color="var(--bl)" />}
      form={editForm}
      error={editError}
      loading={editLoading}
      mode="edit"
      classes={classes}
      onClose={() => setEditingStudent(null)}
      onSubmit={handleUpdateStudent}
      onChange={updateEditForm}
    />
  );

  const renderAddModal = () => (
    <StudentModal
      title="Thêm mới Sinh viên"
      icon={<UserPlus size={20} color="var(--bl)" />}
      form={addForm}
      error={addError}
      loading={addLoading}
      mode="add"
      classes={classes}
      onClose={() => setIsAddingStudent(false)}
      onSubmit={handleCreateStudent}
      onChange={updateAddForm}
    />
  );

  return (
    <div className="page active">
      {renderHeader()}

      {view === 'import' && renderImportView()}
      {view === 'list' && renderListView()}

      {editingStudent && renderEditModal()}
      {isAddingStudent && renderAddModal()}
    </div>
  );
}

function PreviewStatCard({ title, value, type }) {
  return (
    <div className={`ast-preview-stat ast-preview-stat-${type}`}>
      <div className="ast-preview-stat-title">{title}</div>
      <div className="ast-preview-stat-value">{value}</div>
    </div>
  );
}

function StudentModal({
  title,
  icon,
  form,
  error,
  loading,
  mode,
  classes,
  onClose,
  onSubmit,
  onChange,
}) {
  const isEditMode = mode === 'edit';

  return (
    <div className="ast-modal-overlay">
      <div className="card ast-modal">
        <button className="ast-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="ast-modal-title">
          {icon}
          {title}
        </h3>

        {error && (
          <div className="ast-form-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {!isEditMode && (
          <FormGroup label="Mã sinh viên">
            <input
              type="text"
              value={form.studentCode}
              onChange={(e) => onChange('studentCode', e.target.value)}
              className="ast-input"
              placeholder="Nhập mã sinh viên"
            />
          </FormGroup>
        )}

        <FormGroup label="Họ và tên">
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            className="ast-input"
            placeholder="Nhập họ và tên"
          />
        </FormGroup>

        <FormGroup label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="ast-input"
            placeholder="Nhập email"
          />
        </FormGroup>

        <div className="ast-form-row">
          <FormGroup label="Số điện thoại">
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(e) => onChange('phoneNumber', e.target.value)}
              className="ast-input"
              placeholder="SĐT"
            />
          </FormGroup>

          <FormGroup label="Giới tính">
            <select
              value={form.gender}
              onChange={(e) => onChange('gender', e.target.value)}
              className="ast-input"
            >
              <option value="">-- Chọn --</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </FormGroup>
        </div>

        <div className="ast-form-row">
          <FormGroup label="Ngày sinh">
            <input
              type="date"
              value={form.birthday}
              onChange={(e) => onChange('birthday', e.target.value)}
              className="ast-input"
            />
          </FormGroup>

          <FormGroup label="Nơi sinh">
            <input
              type="text"
              value={form.birthPlace}
              onChange={(e) => onChange('birthPlace', e.target.value)}
              className="ast-input"
              placeholder="Nơi sinh"
            />
          </FormGroup>
        </div>

        {!isEditMode && (
          <FormGroup label="Lớp hành chính" large>
            <select
              value={form.adminClassId}
              onChange={(e) => onChange('adminClassId', e.target.value)}
              className="ast-input"
            >
              <option value="">-- Chọn Lớp --</option>

              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.code} - {cls.name}
                </option>
              ))}
            </select>
          </FormGroup>
        )}

        {isEditMode && (
          <FormGroup label="Trạng thái tài khoản" large>
            <select
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => onChange('isActive', e.target.value === 'true')}
              className="ast-input"
            >
              <option value="true">Hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </FormGroup>
        )}

        <div className="ast-modal-actions">
          <button className="btn btn-s" onClick={onClose}>
            Hủy
          </button>

          <button className="btn btn-p" onClick={onSubmit} disabled={loading}>
            {loading
              ? isEditMode
                ? 'Đang lưu...'
                : 'Đang thêm...'
              : isEditMode
                ? 'Lưu thay đổi'
                : 'Thêm mới'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormGroup({ label, children, large = false }) {
  return (
    <div className={large ? 'ast-form-group ast-form-group-large' : 'ast-form-group'}>
      <label>{label}</label>
      {children}
    </div>
  );
}
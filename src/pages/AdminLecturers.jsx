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
import '../css/AdminLecturers.css';

const DEFAULT_ADD_FORM = {
  fullName: '',
  email: '',
  lecturerCode: '',
  facultyId: '',
  phoneNumber: '',
  gender: '',
  birthday: '',
  birthPlace: '',
};

const DEFAULT_EDIT_FORM = {
  fullName: '',
  email: '',
  isActive: true,
  facultyId: '',
  phoneNumber: '',
  gender: '',
  birthday: '',
  birthPlace: '',
};

export default function AdminLecturers() {
  const { showError } = useError();

  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [lecturers, setLecturers] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Pagination & Filters
  const [searchText, setSearchText] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const size = 10;

  // --- ADD STATE ---
  const [isAddingLecturer, setIsAddingLecturer] = useState(false);
  const [addForm, setAddForm] = useState(DEFAULT_ADD_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // --- EDIT STATE ---
  const [editingLecturer, setEditingLecturer] = useState(null);
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

  const fetchFaculties = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/faculties');
      const data = res.data.result || res.data.data || res.data;
      const facultyList = Array.isArray(data) ? data : data?.content || [];

      setFaculties(facultyList);
    } catch (err) {
      console.error('Lỗi lấy danh sách khoa', err);
      showError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchFaculties());
  }, [fetchFaculties]);

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

  const fetchLecturers = useCallback(async () => {
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

      if (selectedDepartmentId) {
        params.departmentId = selectedDepartmentId;
      }

      if (selectedStatus !== '') {
        params.isActive = selectedStatus === 'true';
      }

      const res = await api.get('/api/v1/users/lecturers', { params });

      if (res.data.result) {
        setLecturers(res.data.result.content || []);
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
          'Không thể tải danh sách giảng viên.'
      );
    } finally {
      setListLoading(false);
    }
  }, [page, debouncedSearchText, selectedDepartmentId, selectedStatus]);

  useEffect(() => {
    if (view === 'list') {
      Promise.resolve().then(() => fetchLecturers());
    }
  }, [page, selectedDepartmentId, selectedStatus, debouncedSearchText, view, fetchLecturers]);

  const handleEditClick = (lecturer) => {
    setEditingLecturer(lecturer);

    let fId = lecturer.facultyId;

    if (!fId) {
      const faculty = faculties.find((fac) => fac.code === lecturer.facultyCode);
      if (faculty) fId = faculty.id;
    }

    setEditForm({
      fullName: lecturer.fullName || '',
      email: lecturer.email || '',
      isActive: lecturer.isActive !== false,
      facultyId: fId || '',
      phoneNumber: lecturer.phoneNumber || '',
      gender: lecturer.gender || '',
      birthday: lecturer.birthday || '',
      birthPlace: lecturer.birthPlace || '',
    });

    setEditError('');
  };

  const handleAddLecturerClick = () => {
    setIsAddingLecturer(true);
    setAddForm(DEFAULT_ADD_FORM);
    setAddError('');
  };

  const handleCreateLecturer = async () => {
    if (
      !addForm.fullName ||
      !addForm.email ||
      !addForm.lecturerCode ||
      !addForm.facultyId
    ) {
      setAddError('Vui lòng điền đầy đủ Tên, Email, Mã giảng viên và chọn Khoa');
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
        facultyId: Number(addForm.facultyId),
      };

      if (payload.gender === '') payload.gender = null;
      await api.post('/api/v1/users/lecturers', payload);

      setIsAddingLecturer(false);
      fetchLecturers();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Lỗi khi thêm giảng viên');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateLecturer = async () => {
    if (!editForm.fullName || !editForm.email || !editForm.facultyId) {
      setEditError('Vui lòng điền đầy đủ Tên, Email và chọn Khoa');
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
      const payload = {
        ...editForm,
        facultyId: Number(editForm.facultyId),
      };

      if (payload.gender === '') payload.gender = null;
      await api.put(`/api/v1/users/lecturers/${editingLecturer.id}`, payload);

      setEditingLecturer(null);
      fetchLecturers();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Lỗi khi cập nhật giảng viên');
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
        '/api/v1/users/lecturers/import/preview',
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
    const validLecturers = previewList
      .filter((item) => item.valid)
      .map((item) => item.lecturer);

    if (validLecturers.length === 0) {
      showError('Không có dòng dữ liệu hợp lệ nào để import!');
      return;
    }

    setImportStep('importing_confirm');
    setProgress(30);
    setStatusText(`Đang lưu ${validLecturers.length} giảng viên vào hệ thống...`);

    try {
      await api.post('/api/v1/users/lecturers/import/confirm', validLecturers);

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
      const res = await api.get('/api/v1/users/lecturers/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_GiangVien.xlsx');

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
    <div className="alc-header">
      <div>
        <div className="tb-title alc-page-title">
          <Users size={24} color="var(--bl)" />
          Quản lý Giảng viên
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? 'Danh sách giảng viên, trạng thái tài khoản và nhập liệu hàng loạt'
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="alc-header-actions">
        {view === 'list' ? (
          <>
            <button
              className="btn btn-s alc-btn-icon"
              onClick={() => {
                setPage(0);
                fetchLecturers();
              }}
            >
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button
              className="btn btn-p alc-btn-icon"
              onClick={handleAddLecturerClick}
            >
              <UserPlus size={14} />
              Thêm Giảng Viên
            </button>

            <button
              className="btn btn-s alc-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Giảng Viên
            </button>
          </>
        ) : (
          <button className="btn btn-s alc-btn-icon" onClick={closeImport}>
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

        <div className="alc-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="alc-hidden-input"
          />

          <div
            className="upz alc-upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="alc-upload-icon"
            />

            <div className="alc-upload-title">Nhấn để chọn file Excel</div>

            <div className="alc-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="alc-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card alc-template-card">
        <div className="alc-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="alc-template-title">File mẫu Import Giảng Viên</h3>

        <p className="alc-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Giảng viên chưa có
          và <strong>cập nhật</strong> những Giảng viên đã tồn tại dựa trên mã
          Giảng viên. Giảng viên phải thuộc một <strong>Khoa hợp lệ</strong>.
        </p>

        <button className="btn btn-p alc-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportProcess = () => (
    <div className="card alc-import-card">
      <div className="card-h alc-card-header-between">
        <div>
          <div className="card-t">Import Giảng viên hàng loạt</div>
          <div className="card-su">
            {importStep === 'preview'
              ? 'Kiểm tra dữ liệu trước khi lưu'
              : 'Hệ thống đang xử lý file...'}
          </div>
        </div>

        <button className="btn btn-s btn-sm alc-btn-icon" onClick={closeImport}>
          <ArrowLeft size={14} />
          Quay lại
        </button>
      </div>

      <div className="alc-import-body">
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
    <div className="alc-import-state">
      <FileSpreadsheet
        size={48}
        color="var(--bl)"
        className="pulse alc-state-icon"
      />

      <h3 className="alc-state-title">{statusText}</h3>

      <div className="pb alc-progress">
        <div
          className="pf bl alc-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="alc-muted-text">
        Vui lòng không đóng trình duyệt trong quá trình này...
      </p>
    </div>
  );

  const renderImportErrorState = () => (
    <div className="alc-import-state">
      <AlertTriangle
        size={48}
        color="var(--rd)"
        className="alc-state-icon"
      />

      <h3 className="alc-state-title alc-text-red">Import thất bại</h3>

      <p className="alc-error-message">{importError}</p>

      <div className="alc-center-actions">
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
    <div className="alc-success-wrap">
      <div className="alc-import-state">
        <CheckCircle2
          size={48}
          color="var(--gr)"
          className="alc-state-icon"
        />

        <h3 className="alc-state-title alc-text-green">
          Import dữ liệu thành công!
        </h3>

        <p className="alc-success-desc">
          Đã lưu thành công {validCount} giảng viên vào hệ thống.
        </p>
      </div>

      <div className="alc-center">
        <button className="btn btn-p" onClick={closeImport}>
          Đóng và Xem danh sách
        </button>
      </div>
    </div>
  );

  const renderPreviewState = () => (
    <div>
      <div className="alc-preview-stats">
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

      <div className="alc-preview-table-wrap">
        <div className="alc-preview-table-scroll">
          <table className="tbl">
            <thead className="alc-preview-thead">
              <tr>
                <th className="alc-col-row">Dòng</th>
                <th className="alc-col-code">Mã GV</th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th className="alc-col-faculty">Mã Khoa</th>
                <th className="alc-col-status">Trạng thái kiểm tra</th>
              </tr>
            </thead>

            <tbody>
              {previewList.map((item, idx) => {
                const lecturer = item.lecturer || {};

                return (
                  <tr
                    key={idx}
                    className={item.valid ? '' : 'alc-preview-error-row'}
                  >
                    <td className="alc-index-cell">
                      {lecturer.rowIndex || idx + 1}
                    </td>

                    <td className="alc-code-cell">
                      {lecturer.lecturerCode || '—'}
                    </td>

                    <td>{lecturer.fullName || '—'}</td>

                    <td className="alc-email-cell">{lecturer.email || '—'}</td>

                    <td>
                      <span className="alc-faculty-badge">
                        {lecturer.facultyCode || '—'}
                      </span>
                    </td>

                    <td>
                      {item.valid ? (
                        <span className="alc-valid-status">
                          <CheckCircle2 size={14} />
                          Hợp lệ
                        </span>
                      ) : (
                        <div className="alc-invalid-status">
                          <div className="alc-invalid-title">
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

      <div className="alc-preview-footer">
        <div className="alc-preview-note">
          * Hệ thống chỉ lưu lại những dòng báo{' '}
          <span className="alc-text-green">Hợp lệ</span>.
        </div>

        <div className="alc-preview-actions">
          <button className="btn btn-s" onClick={closeImport}>
            Hủy bỏ
          </button>

          <button
            className="btn btn-p"
            onClick={handleConfirmImport}
            disabled={validCount === 0}
          >
            Xác nhận lưu {validCount} giảng viên hợp lệ
          </button>
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="card">
      <div className="card-h">
        <div className="alc-filter-row">
          <div className="srch">
            <Search className="srch-ic" size={14} />
            <input
              type="text"
              placeholder="Tìm Tên, email, mã GV..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="alc-filter-box">
            <Filter size={14} color="var(--tx3)" />

            <select
              className="fi alc-filter-select"
              value={selectedDepartmentId}
              onChange={(e) => {
                setPage(0);
                setSelectedDepartmentId(e.target.value);
              }}
            >
              <option value="">Tất cả Khoa</option>

              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.code} - {faculty.name}
                </option>
              ))}
            </select>
          </div>

          <select
            className="fi alc-status-select"
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
      {!listLoading && !listError && lecturers.length === 0 && renderListEmpty()}
      {!listLoading && !listError && lecturers.length > 0 && renderLecturerTable()}
    </div>
  );

  const renderListGuide = () => (
    <div className="alc-guide">
      <div className="alc-guide-content">
        <div className="alc-guide-icon">
          <FileSpreadsheet size={16} color="var(--bl)" />
        </div>

        <div>
          <div className="alc-guide-title">Hướng dẫn nhập liệu</div>
          <div className="alc-guide-desc">
            Tải file mẫu Excel về, điền dữ liệu theo đúng cột và Upload lên hệ
            thống.
          </div>
        </div>
      </div>

      <button className="btn btn-s btn-sm alc-btn-icon" onClick={downloadTemplate}>
        <Download size={14} />
        Tải file mẫu
      </button>
    </div>
  );

  const renderListLoading = () => (
    <div className="alc-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse alc-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListError = () => (
    <div className="alc-list-state alc-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="alc-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchLecturers()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="alc-list-state">
      <Users size={48} color="var(--tx3)" className="alc-empty-icon" />

      <p>
        {debouncedSearchText
          ? `Không tìm thấy giảng viên nào với từ khóa "${debouncedSearchText}"`
          : 'Chưa có dữ liệu Giảng viên. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!debouncedSearchText && (
        <button
          className="btn btn-p alc-btn-icon alc-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import Excel ngay
        </button>
      )}
    </div>
  );

  const renderLecturerTable = () => (
    <>
      <div className="alc-table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="alc-col-index">#</th>
              <th>Mã GV</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Giới tính</th>
              <th>Khoa</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {lecturers.map((lecturer, idx) => (
              <tr key={lecturer.id}>
                <td className="alc-index-cell">{page * size + idx + 1}</td>

                <td className="alc-code-cell">{lecturer.lecturerCode}</td>

                <td>
                  <div className="alc-user-cell">
                    <div className="alc-avatar">
                      {lecturer.fullName
                        ? lecturer.fullName.substring(0, 2).toUpperCase()
                        : 'GV'}
                    </div>

                    <span>{lecturer.fullName}</span>
                  </div>
                </td>

                <td className="alc-email-cell">{lecturer.email}</td>

                <td className="alc-muted-cell">{lecturer.phoneNumber || '—'}</td>

                <td className="alc-small-cell">{getGenderLabel(lecturer.gender)}</td>

                <td>
                  <div className="alc-faculty-code">{lecturer.facultyCode || '—'}</div>
                  <div className="alc-faculty-name">{lecturer.facultyName}</div>
                </td>

                <td>
                  {lecturer.isActive ? (
                    <span className="bdg b-op">Hoạt động</span>
                  ) : (
                    <span className="bdg b-ca">Đã khóa</span>
                  )}
                </td>

                <td className="alc-action-cell">
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => handleEditClick(lecturer)}
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
    <div className="alc-pagination">
      <div className="alc-pagination-text">
        Trang {page + 1} / {totalPages}
      </div>

      <div className="alc-pagination-actions">
        <button
          className="btn btn-s alc-pagination-btn"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          className="btn btn-s alc-pagination-btn"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  const renderEditModal = () => (
    <LecturerModal
      title="Chỉnh sửa Giảng viên"
      icon={<Users size={20} color="var(--bl)" />}
      form={editForm}
      error={editError}
      loading={editLoading}
      faculties={faculties}
      mode="edit"
      onClose={() => setEditingLecturer(null)}
      onSubmit={handleUpdateLecturer}
      onChange={updateEditForm}
    />
  );

  const renderAddModal = () => (
    <LecturerModal
      title="Thêm mới Giảng viên"
      icon={<UserPlus size={20} color="var(--bl)" />}
      form={addForm}
      error={addError}
      loading={addLoading}
      faculties={faculties}
      mode="add"
      onClose={() => setIsAddingLecturer(false)}
      onSubmit={handleCreateLecturer}
      onChange={updateAddForm}
    />
  );

  return (
    <div className="page active">
      {renderHeader()}

      {view === 'import' && renderImportView()}
      {view === 'list' && renderListView()}

      {editingLecturer && renderEditModal()}
      {isAddingLecturer && renderAddModal()}
    </div>
  );
}

function PreviewStatCard({ title, value, type }) {
  return (
    <div className={`alc-preview-stat alc-preview-stat-${type}`}>
      <div className="alc-preview-stat-title">{title}</div>
      <div className="alc-preview-stat-value">{value}</div>
    </div>
  );
}

function LecturerModal({
  title,
  icon,
  form,
  error,
  loading,
  faculties,
  mode,
  onClose,
  onSubmit,
  onChange,
}) {
  const isEditMode = mode === 'edit';

  return (
    <div className="alc-modal-overlay">
      <div className="card alc-modal">
        <button className="alc-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h3 className="alc-modal-title">
          {icon}
          {title}
        </h3>

        {error && (
          <div className="alc-form-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {!isEditMode && (
          <FormGroup label="Mã giảng viên">
            <input
              type="text"
              value={form.lecturerCode}
              onChange={(e) => onChange('lecturerCode', e.target.value)}
              className="alc-input"
              placeholder="Nhập mã giảng viên"
            />
          </FormGroup>
        )}

        <FormGroup label="Họ và tên">
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            className="alc-input"
            placeholder="Nhập họ và tên"
          />
        </FormGroup>

        <FormGroup label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="alc-input"
            placeholder="Nhập email"
          />
        </FormGroup>

        <div className="alc-form-row">
          <FormGroup label="Số điện thoại">
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(e) => onChange('phoneNumber', e.target.value)}
              className="alc-input"
              placeholder="SĐT"
            />
          </FormGroup>

          <FormGroup label="Giới tính">
            <select
              value={form.gender}
              onChange={(e) => onChange('gender', e.target.value)}
              className="alc-input"
            >
              <option value="">-- Chọn --</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </FormGroup>
        </div>

        <div className="alc-form-row">
          <FormGroup label="Ngày sinh">
            <input
              type="date"
              value={form.birthday}
              onChange={(e) => onChange('birthday', e.target.value)}
              className="alc-input"
            />
          </FormGroup>

          <FormGroup label="Nơi sinh">
            <input
              type="text"
              value={form.birthPlace}
              onChange={(e) => onChange('birthPlace', e.target.value)}
              className="alc-input"
              placeholder="Nơi sinh"
            />
          </FormGroup>
        </div>

        <FormGroup label="Khoa">
          <select
            value={form.facultyId}
            onChange={(e) => onChange('facultyId', e.target.value)}
            className="alc-input"
          >
            <option value="">-- Chọn Khoa --</option>

            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.code} - {faculty.name}
              </option>
            ))}
          </select>
        </FormGroup>

        {isEditMode && (
          <FormGroup label="Trạng thái tài khoản" large>
            <select
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => onChange('isActive', e.target.value === 'true')}
              className="alc-input"
            >
              <option value="true">Hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </FormGroup>
        )}

        <div className="alc-modal-actions">
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
    <div className={large ? 'alc-form-group alc-form-group-large' : 'alc-form-group'}>
      <label>{label}</label>
      {children}
    </div>
  );
}
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  X,
  Plus,
} from 'lucide-react';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { vi } from 'date-fns/locale';

import api from '../utils/api';
import '../css/AdminSemesters.css';

const DEFAULT_CREATE_DATA = {
  name: '',
  startDate: null,
  endDate: null,
  startWeek: 1,
};

const DEFAULT_EDIT_DATA = {
  name: '',
  isActive: false,
  startWeek: 1,
};

export default function AdminSemesters() {
  const { confirm } = useConfirm();
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState(DEFAULT_CREATE_DATA);

  const [editingSemester, setEditingSemester] = useState(null);
  const [editData, setEditData] = useState(DEFAULT_EDIT_DATA);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchSemesters();
  }, []);

  async function fetchSemesters() {
    setLoading(true);
    setError('');

    try {
      const res = await api.get('/api/v1/semesters');
      setSemesters(res.data.result || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Không thể tải danh sách học kỳ.'
      );
    } finally {
      setLoading(false);
    }
  }

  const formatDateForAPI = (dateObj) => {
    if (!dateObj) return '';

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr) return '—';

    const parts = dateStr.split('-');

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateStr;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';

    return new Date(isoString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCreate = async () => {
    if (!createData.name.trim() || !createData.startDate || !createData.endDate || !createData.startWeek) {
      toast.error('Vui lòng nhập đầy đủ Tên, Ngày bắt đầu, Ngày kết thúc và Tuần bắt đầu!');
      return;
    }

    if (createData.startDate >= createData.endDate) {
      toast.error('Ngày bắt đầu phải trước Ngày kết thúc!');
      return;
    }

    const payload = {
      name: createData.name,
      startDate: formatDateForAPI(createData.startDate),
      endDate: formatDateForAPI(createData.endDate),
      startWeek: parseInt(createData.startWeek, 10),
    };

    setIsSaving(true);

    try {
      await api.post('/api/v1/semesters', payload);

      setShowCreate(false);
      setCreateData(DEFAULT_CREATE_DATA);
      fetchSemesters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo học kỳ thất bại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (semester) => {
    setEditingSemester(semester);
    setEditData({
      name: semester.name,
      isActive: semester.isActive || false,
      startWeek: semester.startWeek || 1,
    });
  };

  const handleSaveEdit = async () => {
    if (!editData.name.trim() || !editData.startWeek) {
      toast.error('Tên học kỳ và Tuần bắt đầu không được để trống!');
      return;
    }

    setIsSaving(true);

    try {
      await api.put(`/api/v1/semesters/${editingSemester.id}`, editData);

      setEditingSemester(null);
      fetchSemesters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (semester) => {
    if (!(await confirm(`Bạn có chắc muốn xóa học kỳ "${semester.name}" không?`))) {
      return;
    }

    setIsDeleting(semester.id);

    try {
      await api.delete(`/api/v1/semesters/${semester.id}`);
      fetchSemesters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại!');
    } finally {
      setIsDeleting(null);
    }
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateData(DEFAULT_CREATE_DATA);
  };

  const closeEditModal = () => {
    setEditingSemester(null);
    setEditData(DEFAULT_EDIT_DATA);
  };

  const filteredSemesters = semesters.filter((semester) =>
    semester.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderHeader = () => (
    <div className="asm-header">
      <div>
        <div className="tb-title asm-page-title">
          <Calendar size={24} color="var(--bl)" />
          Quản lý Học kỳ
        </div>

        <div className="tb-sub">
          Danh sách Học kỳ · {semesters.length} học kỳ trong hệ thống
        </div>
      </div>

      <div className="asm-header-actions">
        <button className="btn btn-s asm-btn-icon" onClick={fetchSemesters}>
          <RefreshCw size={14} />
          Làm mới
        </button>

        <button
          className="btn btn-p asm-btn-icon"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={14} />
          Thêm Học kỳ
        </button>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="card-t">Danh sách Học kỳ</div>
          <div className="card-su">Quản lý các học kỳ giảng dạy</div>
        </div>

        <div className="srch">
          <Search className="srch-ic" size={14} />
          <input
            type="text"
            placeholder="Tìm tên học kỳ..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {loading && renderLoading()}
      {!loading && error && renderError()}
      {!loading && !error && filteredSemesters.length === 0 && renderEmpty()}
      {!loading && !error && filteredSemesters.length > 0 && renderTable()}
    </div>
  );

  const renderLoading = () => (
    <div className="asm-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse asm-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderError = () => (
    <div className="asm-list-state asm-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="asm-state-icon"
      />

      <p>{error}</p>

      <button className="btn btn-p" onClick={fetchSemesters}>
        Thử lại
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="asm-list-state">
      <Calendar size={48} color="var(--tx3)" className="asm-empty-icon" />

      <p>
        {searchText
          ? `Không tìm thấy học kỳ nào với từ khóa "${searchText}"`
          : 'Chưa có dữ liệu Học kỳ.'}
      </p>

      {!searchText && (
        <button
          className="btn btn-p asm-btn-icon asm-inline-flex"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={14} />
          Thêm Học kỳ ngay
        </button>
      )}
    </div>
  );

  const renderTable = () => (
    <>
      <div className="asm-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th className="asm-col-index">#</th>
              <th>Tên Học Kỳ</th>
              <th className="asm-col-date">Ngày bắt đầu</th>
              <th className="asm-col-date">Ngày kết thúc</th>
              <th className="asm-col-date">Tuần bắt đầu</th>
              <th className="asm-col-status">Trạng thái</th>
              <th className="asm-col-date">Ngày tạo</th>
              <th className="asm-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredSemesters.map((semester, index) => (
              <tr key={semester.id}>
                <td data-label="#" className="asm-index-cell">{index + 1}</td>

                <td data-label="Tên Học Kỳ" className="asm-name-cell">{semester.name}</td>

                <td data-label="Ngày bắt đầu" className="asm-date-cell">
                  <DateCell value={formatDateStr(semester.startDate)} />
                </td>

                <td data-label="Ngày kết thúc" className="asm-date-cell">
                  <DateCell value={formatDateStr(semester.endDate)} />
                </td>

                <td data-label="Tuần bắt đầu" className="asm-name-cell" style={{ textAlign: 'center' }}>
                  Tuần {semester.startWeek || 1}
                </td>

                <td data-label="Trạng thái">
                  {semester.isActive ? (
                    <span className="bdg b-op asm-status-badge">Hoạt động</span>
                  ) : (
                    <span className="bdg b-ca asm-status-badge">Vô hiệu</span>
                  )}
                </td>

                <td data-label="Ngày tạo" className="asm-created-cell">
                  {formatDateTime(semester.createdAt)}
                </td>

                <td data-label="Thao tác" className="asm-action-cell">
                  <div className="asm-row-actions">
                    <button
                      className="btn btn-s asm-icon-btn"
                      title="Sửa"
                      onClick={() => handleEditClick(semester)}
                    >
                      <Edit size={14} color="var(--bl)" />
                    </button>

                    <button
                      className="btn btn-s asm-icon-btn asm-delete-btn"
                      title="Xóa"
                      onClick={() => handleDelete(semester)}
                      disabled={isDeleting === semester.id}
                    >
                      {isDeleting === semester.id ? (
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

      <div className="asm-table-footer">
        Hiển thị {filteredSemesters.length}/{semesters.length} học kỳ
      </div>
    </>
  );

  const renderCreateModal = () => (
    <SemesterModal
      title="Thêm Học kỳ mới"
      mode="create"
      isSaving={isSaving}
      createData={createData}
      setCreateData={setCreateData}
      onClose={closeCreateModal}
      onSubmit={handleCreate}
    />
  );

  const renderEditModal = () => (
    <SemesterModal
      title="Cập nhật Học kỳ"
      mode="edit"
      isSaving={isSaving}
      editData={editData}
      setEditData={setEditData}
      editingSemester={editingSemester}
      formatDateStr={formatDateStr}
      onClose={closeEditModal}
      onSubmit={handleSaveEdit}
    />
  );

  return (
    <div className="page active">
      {renderHeader()}
      {renderListView()}

      {showCreate && renderCreateModal()}
      {editingSemester && renderEditModal()}
    </div>
  );
}

function DateCell({ value }) {
  return (
    <div className="asm-date-inline">
      <Calendar size={14} color="var(--bl)" className="asm-date-icon" />
      {value}
    </div>
  );
}

function SemesterModal({
  title,
  mode,
  isSaving,
  createData,
  setCreateData,
  editData,
  setEditData,
  editingSemester,
  formatDateStr,
  onClose,
  onSubmit,
}) {
  const isCreateMode = mode === 'create';

  return (
    <div className="asm-modal-overlay">
      <div className="card asm-modal">
        <div className="asm-modal-header">
          <h3>{title}</h3>

          <button className="btn btn-s asm-close-btn" onClick={onClose}>
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        {isCreateMode ? (
          <>
            <div className="asm-form-group">
              <label>Tên Học kỳ</label>
              <input
                type="text"
                value={createData.name}
                onChange={(e) =>
                  setCreateData({ ...createData, name: e.target.value })
                }
                placeholder="Ví dụ: Học kỳ 1 (2024-2025)"
                className="asm-input asm-input-primary"
                autoFocus
              />
            </div>

            <div className="asm-form-group">
              <label>Tuần bắt đầu</label>
              <input
                type="number"
                min="1"
                max="52"
                value={createData.startWeek}
                onChange={(e) =>
                  setCreateData({ ...createData, startWeek: e.target.value })
                }
                placeholder="Ví dụ: 1 hoặc 25"
                className="asm-input asm-input-primary"
              />
            </div>

            <div className="asm-form-group">
              <label>Ngày bắt đầu</label>
              <div className="dp-wrapper">
                <DatePicker
                  selected={createData.startDate}
                  onChange={(date) =>
                    setCreateData({ ...createData, startDate: date })
                  }
                  locale={vi}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="dd/mm/yyyy"
                  className="fi"
                  autoComplete="off"
                  portalId="root-portal"
                />
              </div>
            </div>

            <div className="asm-form-group asm-form-group-large">
              <label>Ngày kết thúc</label>
              <div className="dp-wrapper">
                <DatePicker
                  selected={createData.endDate}
                  onChange={(date) =>
                    setCreateData({ ...createData, endDate: date })
                  }
                  locale={vi}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="dd/mm/yyyy"
                  className="fi"
                  autoComplete="off"
                  minDate={createData.startDate}
                  portalId="root-portal"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="asm-form-group">
              <label>Tên Học kỳ</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                placeholder="Tên học kỳ..."
                className="asm-input asm-input-primary"
                autoFocus
              />
            </div>

            <div className="asm-form-group">
              <label>Tuần bắt đầu</label>
              <input
                type="number"
                min="1"
                max="52"
                value={editData.startWeek}
                onChange={(e) =>
                  setEditData({ ...editData, startWeek: e.target.value })
                }
                placeholder="Ví dụ: 1 hoặc 25"
                className="asm-input asm-input-primary"
              />
            </div>

            <div className="asm-readonly-dates">
              <div className="asm-readonly-date-group">
                <label>Ngày bắt đầu</label>
                <div className="asm-readonly-date">
                  <Calendar size={16} color="var(--bl)" className="asm-date-icon" />
                  {formatDateStr(editingSemester.startDate)}
                </div>
              </div>

              <div className="asm-readonly-date-group">
                <label>Ngày kết thúc</label>
                <div className="asm-readonly-date">
                  <Calendar size={16} color="var(--bl)" className="asm-date-icon" />
                  {formatDateStr(editingSemester.endDate)}
                </div>
              </div>
            </div>

            <div className="asm-active-box">
              <label>
                <input
                  type="checkbox"
                  checked={editData.isActive}
                  onChange={(e) =>
                    setEditData({ ...editData, isActive: e.target.checked })
                  }
                />

                <span>Trạng thái hoạt động</span>
              </label>

              <p>
                Đánh dấu để học kỳ này có thể được sử dụng trong hệ thống. (Chỉ
                sửa được tên và trạng thái)
              </p>
            </div>
          </>
        )}

        <div className="asm-modal-actions">
          <button className="btn btn-s" onClick={onClose} disabled={isSaving}>
            Hủy
          </button>

          <button
            className="btn btn-p asm-btn-icon"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw size={14} className="pulse" />
            ) : isCreateMode ? (
              <Plus size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}

            {isCreateMode ? 'Tạo mới' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
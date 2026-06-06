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
  Home,
  Search,
  Calendar,
  Edit,
  Trash2,
  X,
  MapPin,
  Navigation,
} from 'lucide-react';

import api from '../utils/api';
import '../css/AdminRooms.css';

import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({
  latitude,
  longitude,
  radius,
  setLat,
  setLng,
  disabled,
  onMapClick,
}) {
  const map = useMapEvents({
    click(e) {
      if (disabled) return;

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      setLat(lat);
      setLng(lng);

      if (onMapClick) onMapClick(lat, lng);
    },
  });

  useEffect(() => {
    if (latitude && longitude) {
      const nextZoom = map.getZoom() < 15 ? 15 : map.getZoom();
      map.flyTo([parseFloat(latitude), parseFloat(longitude)], nextZoom);
    }
  }, [latitude, longitude, map]);

  if (!latitude || !longitude) return null;

  return (
    <>
      <Marker position={[parseFloat(latitude), parseFloat(longitude)]} />

      {radius > 0 && (
        <Circle
          center={[parseFloat(latitude), parseFloat(longitude)]}
          radius={parseInt(radius)}
          pathOptions={{
            fillColor: 'var(--bl)',
            color: 'var(--bl)',
          }}
        />
      )}
    </>
  );
}

export default function AdminRooms() {
  const { confirm } = useConfirm();
  // --- VIEW STATE ---
  const [view, setView] = useState('list'); // 'list' | 'import'

  // --- LIST STATE ---
  const [rooms, setRooms] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchText, setSearchText] = useState('');

  // --- EDIT & DELETE STATE ---
  const [editingRoom, setEditingRoom] = useState(null);
  const [editBuilding, setEditBuilding] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editGpsRadius, setEditGpsRadius] = useState('');
  const [editClearGps, setEditClearGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // --- ADD STATE ---
  const [isAdding, setIsAdding] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addBuilding, setAddBuilding] = useState('');
  const [addCapacity, setAddCapacity] = useState('');
  const [addLatitude, setAddLatitude] = useState('');
  const [addLongitude, setAddLongitude] = useState('');
  const [addGpsRadius, setAddGpsRadius] = useState('');

  // --- MAP SEARCH STATE ---
  const [mapSearchText, setMapSearchText] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // --- IMPORT STATE ---
  const [importStep, setImportStep] = useState('upload');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  // =====================
  // FETCH ROOMS LIST
  // =====================
  const fetchRooms = async (signal) => {
    setListLoading(true);
    setListError('');

    try {
      const res = await api.get('/api/v1/rooms', { signal });
      setRooms(res.data.result || []);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;

      setListError(err.response?.data?.message || 'Không thể tải danh sách phòng.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'list') return;

    const controller = new AbortController();

    Promise.resolve().then(() => fetchRooms(controller.signal));

    return () => controller.abort();
  }, [view]);

  // =====================
  // EDIT & DELETE HANDLERS
  // =====================
  const handleEditClick = (room) => {
    setEditingRoom(room);
    setEditBuilding(room.building || '');
    setEditCapacity(room.capacity || '');
    setEditLatitude(room.latitude || '');
    setEditLongitude(room.longitude || '');
    setEditGpsRadius(room.gpsRadiusM || '');
    setEditClearGps(false);
  };

  const handleSaveEdit = async () => {
    if (!editBuilding.trim() || !editCapacity) {
      toast.error('Vui lòng nhập Tòa nhà và Sức chứa!');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        building: editBuilding,
        capacity: parseInt(editCapacity),
        latitude: editLatitude ? parseFloat(editLatitude) : null,
        longitude: editLongitude ? parseFloat(editLongitude) : null,
        gpsRadiusM: editGpsRadius ? parseInt(editGpsRadius) : null,
        clearGps: editClearGps,
      };

      await api.put(`/api/v1/rooms/${editingRoom.id}`, payload);

      setEditingRoom(null);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (room) => {
    if (!(await confirm(`Bạn có chắc chắn muốn xóa phòng "${room.code}" không?`))) {
      return;
    }

    setIsDeleting(room.id);

    try {
      await api.delete(`/api/v1/rooms/${room.id}`);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setAddCode('');
    setAddBuilding('');
    setAddCapacity('');
    setAddLatitude('');
    setAddLongitude('');
    setAddGpsRadius('');
  };

  const handleSaveAdd = async () => {
    if (!addCode.trim() || !addBuilding.trim() || !addCapacity) {
      toast.error('Vui lòng nhập Mã phòng, Tòa nhà và Sức chứa!');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        code: addCode,
        building: addBuilding,
        capacity: parseInt(addCapacity),
        latitude: addLatitude ? parseFloat(addLatitude) : null,
        longitude: addLongitude ? parseFloat(addLongitude) : null,
        gpsRadiusM: addGpsRadius ? parseInt(addGpsRadius) : null,
      };

      await api.post('/api/v1/rooms', payload);

      setIsAdding(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thêm mới thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  // =====================
  // MAP SEARCH
  // =====================
  const handleMapClick = (lat, lng) => {
    // Chỉ cập nhật tọa độ, không cập nhật tên Tòa nhà
    void lat; void lng;
  };

  const searchLocation = async () => {
    if (!mapSearchText.trim()) return;

    setIsSearchingMap(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          mapSearchText
        )}&limit=1`
      );

      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];

        if (isAdding) {
          setAddLatitude(parseFloat(result.lat));
          setAddLongitude(parseFloat(result.lon));
        } else {
          setEditLatitude(parseFloat(result.lat));
          setEditLongitude(parseFloat(result.lon));
        }
      } else {
        toast.error('Không tìm thấy địa điểm nào với từ khóa này.');
      }
    } catch {
      toast.error('Lỗi khi tìm kiếm địa điểm.');
    } finally {
      setIsSearchingMap(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(
        'Trình duyệt của bạn không hỗ trợ định vị GPS hoặc đang truy cập qua HTTP (cần HTTPS hoặc localhost).'
      );
      return;
    }

    setIsGettingLocation(true);

    const updateLocation = (lat, lng) => {
      if (isAdding) {
        setAddLatitude(parseFloat(lat.toFixed(6)));
        setAddLongitude(parseFloat(lng.toFixed(6)));
      } else {
        setEditLatitude(parseFloat(lat.toFixed(6)));
        setEditLongitude(parseFloat(lng.toFixed(6)));
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation(position.coords.latitude, position.coords.longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        console.warn('Lỗi định vị high accuracy:', error);

        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            updateLocation(pos2.coords.latitude, pos2.coords.longitude);
            setIsGettingLocation(false);
          },
          (err2) => {
            setIsGettingLocation(false);
            console.error('Lỗi định vị low accuracy:', err2);
            toast.error(
              'Không thể lấy vị trí hiện tại. Vui lòng cấp quyền truy cập vị trí cho trang web hoặc bật Location/GPS trên máy.'
            );
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
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

      const res = await api.post('/api/v1/rooms/import', formData, {
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
      const res = await api.get('/api/v1/rooms/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', 'Template_Import_Phong.xlsx');

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
  // RENDER HELPERS
  // =====================
  const formatDate = (isoString) => {
    if (!isoString) return '—';

    return new Date(isoString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredRooms = rooms.filter(
    (r) =>
      (r.code?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
      (r.building?.toLowerCase() || '').includes(searchText.toLowerCase())
  );

  const renderHeader = () => (
    <div className="arm-header">
      <div>
        <div className="tb-title arm-page-title">
          <Home size={24} color="var(--bl)" />
          Quản lý Phòng học
        </div>

        <div className="tb-sub">
          {view === 'list'
            ? `Danh sách Phòng · ${rooms.length} phòng trong hệ thống`
            : 'Import hàng loạt từ file Excel'}
        </div>
      </div>

      <div className="arm-header-actions">
        {view === 'list' ? (
          <>
            <button className="btn btn-s arm-btn-icon" onClick={() => fetchRooms()}>
              <RefreshCw size={14} />
              Làm mới
            </button>

            <button className="btn btn-p arm-btn-icon" onClick={handleAddClick}>
              Thêm mới
            </button>

            <button
              className="btn btn-p arm-btn-icon"
              onClick={() => setView('import')}
            >
              <UploadCloud size={14} />
              Import Excel
            </button>
          </>
        ) : (
          <button className="btn btn-s arm-btn-icon" onClick={closeImport}>
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
      {importStep !== 'upload' && renderImportResultCard()}
    </>
  );

  const renderUploadStep = () => (
    <div className="g2">
      <div className="card">
        <div className="card-h">
          <div className="card-t">Tải lên file Excel</div>
        </div>

        <div className="arm-upload-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="arm-hidden-input"
          />

          <div className="upz arm-upload-zone" onClick={handleImportClick}>
            <FileSpreadsheet
              size={48}
              color="var(--bl)"
              className="arm-upload-icon"
            />

            <div className="arm-upload-title">Nhấn để chọn file Excel</div>

            <div className="arm-upload-desc">
              Vui lòng sử dụng đúng file mẫu từ hệ thống
            </div>

            <div className="arm-upload-note">
              <CheckCircle2 size={12} color="var(--gr)" />
              Chỉ hỗ trợ file .xlsx
            </div>
          </div>
        </div>
      </div>

      <div className="card arm-template-card">
        <div className="arm-template-icon">
          <Download size={32} color="var(--bl)" />
        </div>

        <h3 className="arm-template-title">File mẫu Import Phòng học</h3>

        <p className="arm-template-desc">
          Hệ thống sẽ tự động <strong>thêm mới</strong> những Phòng học chưa có
          và <strong>cập nhật</strong> những Phòng học đã tồn tại dựa trên mã
          Phòng học.
        </p>

        <button className="btn btn-p arm-btn-icon" onClick={downloadTemplate}>
          <Download size={14} />
          Tải file mẫu .xlsx
        </button>
      </div>
    </div>
  );

  const renderImportResultCard = () => (
    <div className="card arm-import-card">
      <div className="card-h arm-card-header-between">
        <div>
          <div className="card-t">Nhập dữ liệu Phòng từ Excel</div>
          <div className="card-su">Hệ thống đang xử lý file tải lên...</div>
        </div>

        <button className="btn btn-s btn-sm arm-btn-icon" onClick={closeImport}>
          <ArrowLeft size={14} />
          Quay lại
        </button>
      </div>

      <div className="arm-import-body">
        {importStep === 'importing' && renderImportingState()}
        {importStep === 'error' && renderImportErrorState()}
        {importStep === 'success' && importResult && renderImportSuccessState()}
      </div>
    </div>
  );

  const renderImportingState = () => (
    <div className="arm-center">
      <FileSpreadsheet
        size={48}
        color="var(--bl)"
        className="pulse arm-state-icon"
      />

      <h3 className="arm-state-title">{statusText}</h3>

      <div className="pb arm-progress">
        <div
          className="pf bl arm-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="arm-muted-text">
        Vui lòng không đóng trình duyệt trong quá trình này...
      </p>
    </div>
  );

  const renderImportErrorState = () => (
    <div className="arm-center">
      <AlertTriangle
        size={48}
        color="var(--rd)"
        className="arm-state-icon"
      />

      <h3 className="arm-state-title arm-text-red">Import thất bại</h3>

      <p className="arm-error-message">{importError}</p>

      <div className="arm-center-actions">
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
      <div className="arm-center arm-success-head">
        <CheckCircle2
          size={48}
          color="var(--gr)"
          className="arm-state-icon"
        />

        <h3 className="arm-state-title arm-text-green">
          Import dữ liệu thành công!
        </h3>

        <p className="arm-success-desc">
          Hệ thống đã đọc và xử lý xong file dữ liệu của bạn.
        </p>
      </div>

      <div className="arm-result-box">
        <div className="arm-result-row">
          <span>Tổng số dòng hợp lệ:</span>
          <strong>{importResult.totalRowsProcessed || 0} dòng</strong>
        </div>

        <div className="arm-result-row">
          <span>Thêm mới thành công:</span>
          <strong className="arm-text-green">
            {importResult.successCount || 0} phòng
          </strong>
        </div>

        <div className="arm-result-row no-border">
          <span>Cập nhật thông tin:</span>
          <strong className="arm-text-blue">
            {importResult.updatedCount || 0} phòng
          </strong>
        </div>
      </div>

      {importResult.errors && importResult.errors.length > 0 && (
        <div className="arm-warning-box">
          <h4 className="arm-warning-title">
            <AlertTriangle size={16} />
            Có {importResult.errors.length} cảnh báo/lỗi:
          </h4>

          <ul className="arm-warning-list">
            {importResult.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="arm-center">
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
          <div className="card-t">Danh sách Phòng</div>
          <div className="card-su">Tất cả các phòng học hiện có trong hệ thống</div>
        </div>

        <div className="srch">
          <Search className="srch-ic" size={14} />
          <input
            type="text"
            placeholder="Tìm phòng, tòa nhà..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      
      {listLoading && renderListLoading()}
      {!listLoading && listError && renderListError()}
      {!listLoading && !listError && filteredRooms.length === 0 && renderListEmpty()}
      {!listLoading && !listError && filteredRooms.length > 0 && renderRoomTable()}
    </div>
  );

  

  const renderListLoading = () => (
    <div className="arm-list-state">
      <RefreshCw
        size={32}
        color="var(--bl)"
        className="pulse arm-list-state-icon"
      />

      <p>Đang tải dữ liệu...</p>
    </div>
  );

  const renderListError = () => (
    <div className="arm-list-state arm-list-error">
      <AlertTriangle
        size={32}
        color="var(--rd)"
        className="arm-list-state-icon"
      />

      <p>{listError}</p>

      <button className="btn btn-p" onClick={() => fetchRooms()}>
        Thử lại
      </button>
    </div>
  );

  const renderListEmpty = () => (
    <div className="arm-list-state">
      <Home size={48} color="var(--tx3)" className="arm-empty-icon" />

      <p>
        {searchText
          ? `Không tìm thấy phòng nào với từ khóa "${searchText}"`
          : 'Chưa có dữ liệu Phòng. Hãy Import file Excel để bắt đầu.'}
      </p>

      {!searchText && (
        <button
          className="btn btn-p arm-btn-icon arm-inline-flex"
          onClick={() => setView('import')}
        >
          <UploadCloud size={14} />
          Import Excel ngay
        </button>
      )}
    </div>
  );

  const renderRoomTable = () => (
    <>
      <div className="arm-table-wrap">
        <table className="ast-responsive-table">
          <thead>
            <tr>
              <th className="arm-col-index">#</th>
              <th className="arm-col-code">Mã Phòng</th>
              <th>Tòa nhà</th>
              <th className="arm-col-capacity">Sức chứa</th>
              <th>
                <span className="arm-th-icon">
                  <MapPin size={12} />
                  Tọa độ GPS
                </span>
              </th>
              <th className="arm-col-date">
                <span className="arm-th-icon">
                  <Calendar size={12} />
                  Ngày tạo
                </span>
              </th>
              <th className="arm-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredRooms.map((room, index) => (
              <tr key={room.id}>
                <td data-label="#" className="arm-index-cell">{index + 1}</td>

                <td data-label="Mã Phòng">
                  <span className="arm-room-code">{room.code || '—'}</span>
                </td>

                <td data-label="Tòa nhà" className="arm-building-cell">{room.building}</td>

                <td data-label="Sức chứa" className="arm-capacity-cell">{room.capacity}</td>

                <td data-label="Tọa độ GPS">{renderGpsCell(room)}</td>

                <td data-label="Ngày tạo" className="arm-date-cell">{formatDate(room.createdAt)}</td>

                <td data-label="Thao tác" className="arm-action-cell">
                  <div className="arm-row-actions">
                    <button
                      className="btn btn-s arm-icon-btn"
                      title="Sửa"
                      onClick={() => handleEditClick(room)}
                    >
                      <Edit size={14} color="var(--bl)" />
                    </button>

                    <button
                      className="btn btn-s arm-icon-btn arm-delete-btn"
                      title="Xóa"
                      onClick={() => handleDelete(room)}
                      disabled={isDeleting === room.id}
                    >
                      {isDeleting === room.id ? (
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

      <div className="arm-table-footer">
        Hiển thị {filteredRooms.length}/{rooms.length} phòng
      </div>
    </>
  );

  const renderGpsCell = (room) => {
    if (!room.latitude || !room.longitude) {
      return <span className="arm-no-gps">Chưa cấu hình GPS</span>;
    }

    return (
      <div className="arm-gps-info">
        <span>Lat:</span> {room.latitude.toFixed(5)}
        <br />
        <span>Lng:</span> {room.longitude.toFixed(5)}
        <br />
        <strong>Bán kính:</strong> {room.gpsRadiusM || 0}m
      </div>
    );
  };

  const renderGpsSection = ({
    mode,
    latitude,
    longitude,
    radius,
    setLatitude,
    setLongitude,
    setRadius,
    clearGps = false,
  }) => {
    const isEditMode = mode === 'edit';

    return (
      <div className="arm-gps-section">
        <div className="arm-section-title">
          <MapPin size={16} color="var(--primary)" />
          <span>
            {isEditMode
              ? 'Cấu hình điểm danh GPS'
              : 'Cấu hình điểm danh GPS (tùy chọn)'}
          </span>
        </div>

        <div className="arm-map-search-row">
          <input
            type="text"
            placeholder="Tìm kiếm địa điểm (VD: Đại học Bách Khoa Hà Nội)..."
            value={mapSearchText}
            onChange={(e) => setMapSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchLocation();
              }
            }}
            className="arm-map-search-input"
            disabled={clearGps}
          />

          <button
            className="btn btn-s arm-btn-icon"
            onClick={(e) => {
              e.preventDefault();
              searchLocation();
            }}
            disabled={clearGps || isSearchingMap}
          >
            {isSearchingMap ? (
              <RefreshCw size={14} className="pulse" />
            ) : (
              <Search size={14} />
            )}
            Tìm
          </button>

          <button
            className="btn btn-p arm-btn-icon arm-location-btn"
            onClick={(e) => {
              e.preventDefault();
              getCurrentLocation();
            }}
            disabled={clearGps || isGettingLocation}
            title="Lấy vị trí của tôi"
          >
            {isGettingLocation ? (
              <RefreshCw size={14} className="pulse" />
            ) : (
              <Navigation size={14} />
            )}
          </button>
        </div>

        <div className="arm-map-box">
          <MapContainer
            center={
              latitude && longitude
                ? [latitude, longitude]
                : [21.028511, 105.804817]
            }
            zoom={15}
            className="arm-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            <LocationMarker
              latitude={latitude}
              longitude={longitude}
              radius={radius}
              setLat={(lat) => setLatitude(parseFloat(lat).toFixed(6))}
              setLng={(lng) => setLongitude(parseFloat(lng).toFixed(6))}
              disabled={clearGps}
              onMapClick={handleMapClick}
            />
          </MapContainer>

          {clearGps && (
            <div className="arm-map-disabled">
              <span>Đang tắt GPS cho phòng này</span>
            </div>
          )}
        </div>

        <div className="arm-form-row">
          <div className="arm-form-group">
            <label>Vĩ độ (Latitude)</label>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="VD: 21.0382"
              className="arm-input arm-input-sm"
              disabled={clearGps}
            />
          </div>

          <div className="arm-form-group">
            <label>Kinh độ (Longitude)</label>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="VD: 105.7827"
              className="arm-input arm-input-sm"
              disabled={clearGps}
            />
          </div>
        </div>

        <div className="arm-form-group">
          <label>Bán kính cho phép (mét)</label>
          <input
            type="number"
            min="0"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="VD: 50"
            className="arm-input arm-input-sm"
            disabled={clearGps}
          />
        </div>
      </div>
    );
  };

  const renderEditModal = () => (
    <div className="arm-modal-overlay">
      <div className="card arm-modal">
        <div className="arm-modal-header">
          <h3>Cập nhật Phòng học</h3>

          <button
            className="btn btn-s arm-close-btn"
            onClick={() => setEditingRoom(null)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="arm-form-group">
          <label>Mã Phòng (Chỉ đọc)</label>
          <div className="arm-readonly-field">{editingRoom.code}</div>
        </div>

        <div className="arm-form-row">
          <div className="arm-form-group">
            <label>Tòa nhà</label>
            <input
              type="text"
              value={editBuilding}
              onChange={(e) => setEditBuilding(e.target.value)}
              placeholder="Ví dụ: Tòa A"
              className="arm-input arm-input-primary"
              autoFocus
            />
          </div>

          <div className="arm-form-group">
            <label>Sức chứa</label>
            <input
              type="number"
              min="1"
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              className="arm-input"
            />
          </div>
        </div>

        {renderGpsSection({
          mode: 'edit',
          latitude: editLatitude,
          longitude: editLongitude,
          radius: editGpsRadius,
          setLatitude: setEditLatitude,
          setLongitude: setEditLongitude,
          setRadius: setEditGpsRadius,
          clearGps: editClearGps,
        })}

        <label className="arm-clear-gps">
          <input
            type="checkbox"
            checked={editClearGps}
            onChange={(e) => setEditClearGps(e.target.checked)}
          />
          Xóa dữ liệu GPS hiện tại (tắt điểm danh bằng GPS cho phòng này)
        </label>

        <div className="arm-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setEditingRoom(null)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p arm-btn-icon"
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
    <div className="arm-modal-overlay">
      <div className="card arm-modal">
        <div className="arm-modal-header">
          <h3>Thêm Phòng học mới</h3>

          <button
            className="btn btn-s arm-close-btn"
            onClick={() => setIsAdding(false)}
          >
            <X size={20} color="var(--tx3)" />
          </button>
        </div>

        <div className="arm-form-group">
          <label>Mã Phòng</label>
          <input
            type="text"
            value={addCode}
            onChange={(e) => setAddCode(e.target.value)}
            placeholder="Ví dụ: P201"
            className="arm-input arm-input-primary arm-input-muted"
            autoFocus
          />
        </div>

        <div className="arm-form-row">
          <div className="arm-form-group">
            <label>Tòa nhà</label>
            <input
              type="text"
              value={addBuilding}
              onChange={(e) => setAddBuilding(e.target.value)}
              placeholder="Ví dụ: Tòa A"
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label>Sức chứa</label>
            <input
              type="number"
              min="1"
              value={addCapacity}
              onChange={(e) => setAddCapacity(e.target.value)}
              className="arm-input"
            />
          </div>
        </div>

        {renderGpsSection({
          mode: 'add',
          latitude: addLatitude,
          longitude: addLongitude,
          radius: addGpsRadius,
          setLatitude: setAddLatitude,
          setLongitude: setAddLongitude,
          setRadius: setAddGpsRadius,
          clearGps: false,
        })}

        <div className="arm-modal-actions">
          <button
            className="btn btn-s"
            onClick={() => setIsAdding(false)}
            disabled={isSaving}
          >
            Hủy
          </button>

          <button
            className="btn btn-p arm-btn-icon"
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

      {view === 'import' && renderImportView()}
      {view === 'list' && renderListView()}

      {editingRoom && renderEditModal()}
      {isAdding && renderAddModal()}
    </div>
  );
}

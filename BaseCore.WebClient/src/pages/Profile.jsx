import { useEffect, useMemo, useState, useRef } from 'react';
import UserLayout from '../layouts/UserLayout';
import { Link } from 'react-router-dom';
import { apiFetch, labelRole, pick } from '../api';
import { apiClient } from '../services/httpClient';

const readStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

export function ProfileContent() {
  const storedUser = useMemo(readStoredUser, []);
  const [form, setForm] = useState({
    fullName: storedUser.fullName || storedUser.FullName || '',
    email: storedUser.email || storedUser.Email || '',
    phone: storedUser.phone || storedUser.Phone || '',
    dateOfBirth: '',
    gender: '',
    identityNumber: '',
    avatarUrl: '',
  });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const userId = storedUser.userId || storedUser.UserID || storedUser.id || storedUser.Id;
  const role = storedUser.role ?? storedUser.Role;

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    apiFetch(`/api/profile/${userId}`)
      .then((data) => {
        if (ignore) return;
        const dob = pick(data, ['dateOfBirth', 'DateOfBirth'], '');
        setForm({
          fullName: pick(data, ['fullName', 'FullName'], form.fullName),
          email: pick(data, ['email', 'Email'], form.email),
          phone: pick(data, ['phone', 'Phone'], form.phone),
          dateOfBirth: dob ? dob.slice(0, 10) : '',
          gender: String(pick(data, ['gender', 'Gender'], '') ?? ''),
          identityNumber: pick(data, ['identityNumber', 'IdentityNumber'], '') || '',
          avatarUrl: pick(data, ['avatarUrl', 'AvatarUrl'], '') || '',
        });
      })
      .catch(() => {
        if (!ignore) {
          setStatus('Không tải được dữ liệu mới nhất, đang hiển thị thông tin đã lưu.');
          setStatusType('warn');
        }
      });
    return () => { ignore = true; };
  }, [userId]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveLocalUser = (nextForm) => {
    const current = readStoredUser();
    localStorage.setItem('user', JSON.stringify({
      ...current,
      fullName: nextForm.fullName,
      email: nextForm.email,
      phone: nextForm.phone,
    }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus('Ảnh không được vượt quá 2MB'); setStatusType('error'); return;
    }
    setUploadingAvatar(true);
    setStatus(''); setStatusType('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/api/profile/upload-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateField('avatarUrl', data.avatarUrl);
      setStatus('Đã cập nhật ảnh đại diện.'); setStatusType('success');
    } catch (err) {
      setStatus(err?.response?.data?.message || 'Tải ảnh lên thất bại'); setStatusType('error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      if (userId) {
        await apiFetch(`/api/profile/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender !== '' ? Number(form.gender) : null,
            identityNumber: form.identityNumber || null,
            avatarUrl: form.avatarUrl || null,
          }),
        });
      }
      saveLocalUser(form);
      setStatus('Đã cập nhật thông tin cá nhân thành công.');
      setStatusType('success');
    } catch (error) {
      saveLocalUser(form);
      setStatus(error.message || 'Không cập nhật được, thông tin đã được lưu tạm trên trình duyệt.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar" style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              title="Nhấn để đổi ảnh đại diện"
            >
              {uploadingAvatar ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#e2e8f0' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 22, color: '#2563eb' }} />
                </div>
              ) : form.avatarUrl ? (
                <img src={`${form.avatarUrl.startsWith('/') ? 'http://localhost:5001' : ''}${form.avatarUrl}`}
                  alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="profile-avatar-initials">{(form.fullName || 'U').charAt(0).toUpperCase()}</span>
              )}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', opacity: 0, transition: 'opacity .2s',
              }}
                className="avatar-overlay"
              >
                <i className="fa-solid fa-camera" style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div>
              <h1>Thông tin cá nhân</h1>
              <p>Quản lý thông tin tài khoản dùng để đặt vé và nhận thông báo.</p>
            </div>
          </div>

          <form onSubmit={submit} className="profile-form">
            <div className="form-group">
              <label>Họ và tên</label>
              <input
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="form-group">
              <label>Ngày sinh</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => updateField('dateOfBirth', event.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="form-group">
              <label>Giới tính</label>
              <select
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value)}
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="0">Nam</option>
                <option value="1">Nữ</option>
                <option value="2">Khác</option>
              </select>
            </div>

            <div className="form-group">
              <label>Số CCCD / CMND</label>
              <input
                value={form.identityNumber}
                onChange={(event) => updateField('identityNumber', event.target.value)}
                placeholder="Nhập số căn cước công dân"
                maxLength={12}
              />
            </div>

            <div className="profile-meta">
              <span><i className="fa-solid fa-shield-halved" /> Vai trò: {labelRole(role)}</span>
              {userId && <span><i className="fa-solid fa-id-card" /> Mã tài khoản: {userId}</span>}
            </div>

            {status && (
              <p className={`profile-status profile-status--${statusType}`} role="alert">
                {statusType === 'success' && <i className="fa-solid fa-circle-check" />}
                {statusType === 'error' && <i className="fa-solid fa-circle-exclamation" />}
                {statusType === 'warn' && <i className="fa-solid fa-triangle-exclamation" />}
                {' '}{status}
              </p>
            )}

            <div className="profile-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Đang lưu...</> : 'Lưu thông tin'}
              </button>
              <Link to="/change-password" className="btn btn-outline">
                <i className="fa-solid fa-key" /> Đổi mật khẩu
              </Link>
            </div>
          </form>
        </section>
    </div>
  );
}

export default function Profile() {
  return (
    <UserLayout>
      <ProfileContent />
    </UserLayout>
  );
}

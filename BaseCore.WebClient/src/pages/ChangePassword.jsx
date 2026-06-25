import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { loginRequest, AUTH_BASE } from '../api';

const readStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

export default function ChangePassword() {
  const user = useMemo(readStoredUser, []);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const userId = user.userId || user.UserID || user.id || user.Id;
  const email = user.email || user.Email || '';

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus('');

    if (form.newPassword.length < 6) {
      setStatus('Mật khẩu mới phải có ít nhất 6 ký tự.');
      setStatusType('error');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setStatus('Mật khẩu xác nhận không khớp.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    try {
      await loginRequest(email, form.currentPassword);

      const token = localStorage.getItem('token');
      const res = await fetch(`${AUTH_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: user.fullName || user.FullName || email,
          email,
          phone: user.phone || user.Phone || '',
          password: form.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Lỗi ${res.status}`);
      }

      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatus('Đổi mật khẩu thành công!');
      setStatusType('success');
    } catch (error) {
      setStatus(error.message || 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const passwordFields = [
    { key: 'currentPassword', label: 'Mật khẩu hiện tại', show: showCurrent, toggle: () => setShowCurrent((v) => !v), autoComplete: 'current-password' },
    { key: 'newPassword', label: 'Mật khẩu mới', show: showNew, toggle: () => setShowNew((v) => !v), autoComplete: 'new-password' },
    { key: 'confirmPassword', label: 'Xác nhận mật khẩu mới', show: showConfirm, toggle: () => setShowConfirm((v) => !v), autoComplete: 'new-password' },
  ];

  return (
    <UserLayout>
      <div className="account-page">
        <section className="account-panel small">
          <div className="account-head">
            <div>
              <h1>Đổi mật khẩu</h1>
              <p>Cập nhật mật khẩu đăng nhập cho tài khoản {email}.</p>
            </div>
          </div>

          <form onSubmit={submit}>
            {passwordFields.map(({ key, label, show, toggle, autoComplete }) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <div className="auth-password-wrap">
                  <input
                    type={show ? 'text' : 'password'}
                    value={form[key]}
                    onChange={(event) => setField(key, event.target.value)}
                    required
                    autoComplete={autoComplete}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={toggle}
                    tabIndex={-1}
                    aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <i className={`fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
            ))}

            {status && (
              <p className={`profile-status profile-status--${statusType}`} role="alert">
                {statusType === 'success' && <i className="fa-solid fa-circle-check" />}
                {statusType === 'error' && <i className="fa-solid fa-circle-exclamation" />}
                {' '}{status}
              </p>
            )}

            <div className="profile-actions">
              <button className="btn btn-primary" disabled={loading || !userId}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Đang đổi...</> : 'Đổi mật khẩu'}
              </button>
              <Link to="/profile" className="btn btn-outline">
                <i className="fa-solid fa-arrow-left" /> Quay lại
              </Link>
            </div>
          </form>
        </section>
      </div>
    </UserLayout>
  );
}

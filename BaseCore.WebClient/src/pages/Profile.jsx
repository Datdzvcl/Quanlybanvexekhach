import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { apiFetch, pick } from '../api';

const readStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

export default function Profile() {
  const storedUser = useMemo(readStoredUser, []);
  const [form, setForm] = useState({
    fullName: storedUser.fullName || storedUser.FullName || '',
    email: storedUser.email || storedUser.Email || '',
    phone: storedUser.phone || storedUser.Phone || '',
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const userId = storedUser.userId || storedUser.UserID || storedUser.id || storedUser.Id;
  const role = storedUser.role || storedUser.Role || 'User';

  useEffect(() => {
    if (!userId) return;

    let ignore = false;
    apiFetch(`/api/profile/${userId}`)
      .then((data) => {
        if (ignore) return;
        setForm({
          fullName: pick(data, ['fullName', 'FullName'], form.fullName),
          email: pick(data, ['email', 'Email'], form.email),
          phone: pick(data, ['phone', 'Phone'], form.phone),
        });
      })
      .catch(() => {
        if (!ignore) setStatus('Không tải được dữ liệu mới nhất, đang hiển thị thông tin đã lưu khi đăng nhập.');
      });

    return () => {
      ignore = true;
    };
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
          }),
        });
      }
      saveLocalUser(form);
      setStatus('Đã cập nhật thông tin cá nhân.');
    } catch (error) {
      saveLocalUser(form);
      setStatus(error.message || 'Backend chưa cho phép cập nhật, thông tin hiển thị đã được lưu tạm trên trình duyệt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="profile-page">
        <section className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <i className="fa-solid fa-user" />
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

            <div className="profile-meta">
              <span><i className="fa-solid fa-shield-halved" /> Vai trò: {role}</span>
              {userId && <span><i className="fa-solid fa-id-card" /> Mã tài khoản: {userId}</span>}
            </div>

            {status && <p className="profile-status">{status}</p>}

            <div className="profile-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

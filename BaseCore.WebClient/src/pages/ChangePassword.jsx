import { useMemo, useState } from 'react';
import Header from '../components/Header';
// import { apiFetch, loginRequest } from '../api';
// // Thêm import AUTH_BASE
// import { apiFetch, loginRequest, AUTH_BASE } from '../api';
import { loginRequest, AUTH_BASE } from '../api';
const readStoredUser = () => JSON.parse(localStorage.getItem('user') || '{}');

export default function ChangePassword() {
  const user = useMemo(readStoredUser, []);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const userId = user.userId || user.UserID || user.id || user.Id;
  const email = user.email || user.Email || '';

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

//   const submit = async (event) => {
//     event.preventDefault();
//     setStatus('');

//     if (form.newPassword.length < 6) {
//       setStatus('Mật khẩu mới phải có ít nhất 6 ký tự.');
//       return;
//     }
//     if (form.newPassword !== form.confirmPassword) {
//       setStatus('Mật khẩu xác nhận không khớp.');
//       return;
//     }

//     // setLoading(true);
//     // try {
//     //   await loginRequest(email, form.currentPassword);
//     //   await apiFetch(`/api/users/${userId}`, {
//     //     method: 'PUT',
//     //     body: JSON.stringify({
//     //       fullName: user.fullName || user.FullName || email,
//     //       email,
//     //       phone: user.phone || user.Phone || '',
//     //       password: form.newPassword,
//     //     }),
//     //   });
//     //   setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
//     //   setStatus('Đã đổi mật khẩu thành công.');
//     // } catch (error) {
//     //   setStatus(error.message || 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.');
//     // } finally {
//     //   setLoading(false);
//     // }
//     setLoading(true);
// try {
//   // Bước 1: verify mật khẩu hiện tại
//   await loginRequest(email, form.currentPassword);
  
//   // Bước 2: đổi mật khẩu — dùng AUTH_BASE thay vì API_BASE
//   const token = localStorage.getItem('token');
//   const res = await fetch(`${AUTH_BASE}/api/users/${userId}`, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${token}`
//     },
//     body: JSON.stringify({
//       fullName: user.fullName || user.FullName || email,
//       email,
//       phone: user.phone || user.Phone || '',
//       password: form.newPassword,
//     }),
//   });
  
//   if (!res.ok) throw new Error(`API lỗi ${res.status}`);
  
//   setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
//   setStatus('Đã đổi mật khẩu thành công.');
// } catch (error) {
//   setStatus(error.message || 'Đổi mật khẩu thất bại.');
// } finally {
//   setLoading(false);
// }
//   };
const submit = async (event) => {
  event.preventDefault();
  setStatus('');

  if (form.newPassword.length < 6) {
    setStatus('Mật khẩu mới phải có ít nhất 6 ký tự.');
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    setStatus('Mật khẩu xác nhận không khớp.');
    return;
  }

  setLoading(true);
  try {
    // Bước 1: xác minh mật khẩu hiện tại
    await loginRequest(email, form.currentPassword);

    // Bước 2: đổi mật khẩu — gửi kèm token
    const token = localStorage.getItem('token');
    const res = await fetch(`${AUTH_BASE}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
    setStatus('✅ Đã đổi mật khẩu thành công!');
  } catch (error) {
    setStatus(error.message || 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.');
  } finally {
    setLoading(false);
  }
};
  return (
    <>
      <Header />
      <main className="account-page">
        <section className="account-panel small">
          <div className="account-head">
            <div>
              <h1>Đổi mật khẩu</h1>
              <p>Cập nhật mật khẩu đăng nhập cho tài khoản {email}.</p>
            </div>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Mật khẩu hiện tại</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(event) => setField('currentPassword', event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => setField('newPassword', event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setField('confirmPassword', event.target.value)}
                required
              />
            </div>

            {status && <p className="profile-status">{status}</p>}

            <div className="profile-actions">
              <button className="btn btn-primary" disabled={loading || !userId}>
                {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

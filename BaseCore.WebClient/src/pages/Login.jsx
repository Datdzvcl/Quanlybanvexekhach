import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { isAdminRole } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({
        emailOrPhone: form.emailOrPhone.trim(),
        password: form.password,
      });
      navigate(isAdminRole(user.role) ? '/admin' : '/', { replace: true });
    } catch (err) {
      alert(err.message || 'Dang nhap that bai. Kiem tra email/phone, mat khau va AuthService.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header simple />
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-title">
            <h2><i className="fa-solid fa-bus" /> VeXeAZ</h2>
            <p>Dang nhap de tiep tuc</p>
          </div>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email hoac so dien thoai</label>
              <input
                type="text"
                value={form.emailOrPhone}
                onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Mat khau</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="auth-row">
              <label><input type="checkbox" /> Nho mat khau</label>
              <a href="#">Quen mat khau?</a>
            </div>
            <button disabled={loading} className="btn btn-primary auth-btn">
              {loading ? 'Dang dang nhap...' : 'Dang Nhap'}
            </button>
          </form>
          <p className="auth-bottom">Chua co tai khoan? <Link to="/register">Dang ky ngay</Link></p>
        </div>
      </div>
    </>
  );
}

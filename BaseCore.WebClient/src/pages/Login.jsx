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
      alert(err.message || 'Đăng nhập thất bại. Kiểm tra email/số điện thoại, mật khẩu và AuthService.');
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
            <h2><i className="fa-solid fa-bus" /> VéXeAZ</h2>
            <p>Đăng nhập để tiếp tục</p>
          </div>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email hoặc số điện thoại</label>
              <input
                type="text"
                value={form.emailOrPhone}
                onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="auth-row">
              <label><input type="checkbox" /> Nhớ mật khẩu</label>
              <a href="#">Quên mật khẩu?</a>
            </div>
            <button disabled={loading} className="btn btn-primary auth-btn">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
          <p className="auth-bottom">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
        </div>
      </div>
    </>
  );
}

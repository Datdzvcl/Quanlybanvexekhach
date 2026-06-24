import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const registered = location.state?.registered;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({
        emailOrPhone: form.emailOrPhone.trim(),
        password: form.password,
      });

      const role = Number(user?.role ?? 0);
      if (role === 2) {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 1) {
        navigate('/operator/dashboard', { replace: true });
      } else if (role === 3) {
        navigate('/driver', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Kiểm tra email/số điện thoại và mật khẩu.');
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
          {registered && (
            <p className="auth-success" role="status">
              <i className="fa-solid fa-circle-check" /> Đăng ký thành công! Vui lòng đăng nhập.
            </p>
          )}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email hoặc số điện thoại</label>
              <input
                type="text"
                value={form.emailOrPhone}
                onChange={(e) => { setForm({ ...form, emailOrPhone: e.target.value }); setError(''); }}
                placeholder="email@example.com hoặc 09xxxxxxxx"
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {error && (
              <p className="auth-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </p>
            )}

            <button disabled={loading} className="btn btn-primary auth-btn">
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Đang đăng nhập...</>
                : 'Đăng nhập'}
            </button>
          </form>
          <p className="auth-bottom" style={{ marginBottom: 6 }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </p>
          <p className="auth-bottom">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
        </div>
      </div>
    </>
  );
}

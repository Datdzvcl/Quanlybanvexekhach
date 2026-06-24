import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

const VN_PHONE_RE = /^(0[3|5|7|8|9])[0-9]{8}$/;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (key, value) => {
    setForm((cur) => ({ ...cur, [key]: value }));
    setError('');
  };

  const validate = () => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ và tên.';
    if (!form.email.trim()) return 'Vui lòng nhập email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email không đúng định dạng.';
    if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại.';
    if (!VN_PHONE_RE.test(form.phone.trim())) return 'Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678).';
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setLoading(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
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
            <p>Tạo tài khoản mới</p>
          </div>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0912345678"
                required
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  autoComplete="new-password"
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
            <div className="form-group">
              <label>Xác nhận mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
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
                ? <><i className="fa-solid fa-spinner fa-spin" /> Đang đăng ký...</>
                : 'Đăng ký ngay'}
            </button>
          </form>
          <p className="auth-bottom">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </div>
      </div>
    </>
  );
}

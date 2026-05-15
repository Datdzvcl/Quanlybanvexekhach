import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

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

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      alert('Đăng ký thành công. Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      alert(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, value) => setForm({ ...form, [key]: value });

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
            {[
              ['fullName', 'Họ và tên', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Số điện thoại', 'tel'],
              ['password', 'Mật khẩu', 'password'],
              ['confirmPassword', 'Xác nhận mật khẩu', 'password'],
            ].map(([key, label, type]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                />
              </div>
            ))}
            <button disabled={loading} className="btn btn-primary auth-btn">
              {loading ? 'Đang đăng ký...' : 'Đăng ký ngay'}
            </button>
          </form>
          <p className="auth-bottom">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </div>
      </div>
    </>
  );
}

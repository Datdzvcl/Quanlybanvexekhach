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
      alert('Mat khau xac nhan khong khop.');
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
      alert('Dang ky thanh cong. Vui long dang nhap.');
      navigate('/login');
    } catch (err) {
      alert(err.message || 'Dang ky that bai');
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
            <h2><i className="fa-solid fa-bus" /> VeXeAZ</h2>
            <p>Tao tai khoan moi</p>
          </div>
          <form onSubmit={submit}>
            {[
              ['fullName', 'Ho va ten', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'So dien thoai', 'tel'],
              ['password', 'Mat khau', 'password'],
              ['confirmPassword', 'Xac nhan mat khau', 'password'],
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
              {loading ? 'Dang dang ky...' : 'Dang Ky Ngay'}
            </button>
          </form>
          <p className="auth-bottom">Da co tai khoan? <Link to="/login">Dang nhap</Link></p>
        </div>
      </div>
    </>
  );
}

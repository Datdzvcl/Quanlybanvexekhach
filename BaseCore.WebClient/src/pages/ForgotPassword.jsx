import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { authApi } from '../services/authApi';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1); // 1=nhập email | 2=nhập OTP+mật khẩu mới
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confirmPass, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const [devOtp, setDevOtp] = useState(''); // OTP trả về từ server (demo)

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      // AuthService trả OTP trong response để test
      if (res?.otp) setDevOtp(res.otp);
      setStep(2);
      setSuccess('Mã OTP đã được tạo.');
    } catch (err) {
      setError(err.message || 'Gửi OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resetPass = async (e) => {
    e.preventDefault();
    setError('');
    if (newPass !== confirmPass) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPass.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), otp.trim(), newPass);
      navigate('/login', { state: { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.' } });
    } catch (err) {
      setError(err.message || 'OTP không đúng hoặc đã hết hạn');
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
            <h2><i className="fa-solid fa-lock-open" /> Quên mật khẩu</h2>
            <p>{step === 1 ? 'Nhập email để nhận mã OTP' : 'Nhập mã OTP và mật khẩu mới'}</p>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 99,
                background: s <= step ? '#2563eb' : '#e2e8f0',
                transition: 'background .3s'
              }} />
            ))}
          </div>

          {error && (
            <p className="auth-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" /> {error}
            </p>
          )}
          {success && step === 2 && (
            <p className="auth-success" role="status">
              <i className="fa-solid fa-circle-check" /> {success}
              {devOtp && (
                <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#64748b' }}>
                  (Demo) OTP của bạn: <strong style={{ letterSpacing: 3 }}>{devOtp}</strong>
                </span>
              )}
            </p>
          )}

          {/* Step 1: nhập email */}
          {step === 1 && (
            <form onSubmit={sendOtp}>
              <div className="form-group">
                <label>Email tài khoản</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="email@example.com"
                  required
                  autoFocus
                />
              </div>
              <button disabled={loading} className="btn btn-primary auth-btn">
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang gửi...</>
                  : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />Gửi mã OTP</>}
              </button>
            </form>
          )}

          {/* Step 2: nhập OTP + mật khẩu mới */}
          {step === 2 && (
            <form onSubmit={resetPass}>
              <div className="form-group">
                <label>Mã OTP (6 chữ số)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="Nhập mã 6 chữ số..."
                  maxLength={6}
                  required
                  autoFocus
                  style={{ letterSpacing: 6, fontSize: 22, textAlign: 'center' }}
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <div className="auth-password-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={e => { setNewPass(e.target.value); setError(''); }}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                  <button type="button" className="auth-eye-btn"
                    onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>
              <button disabled={loading} className="btn btn-primary auth-btn">
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang đặt lại...</>
                  : <><i className="fa-solid fa-key" style={{ marginRight: 6 }} />Đặt lại mật khẩu</>}
              </button>
              <button type="button" className="btn btn-outline auth-btn"
                style={{ marginTop: 8 }}
                onClick={() => { setStep(1); setOtp(''); setError(''); setSuccess(''); }}>
                Gửi lại OTP
              </button>
            </form>
          )}

          <p className="auth-bottom">
            <Link to="/login"><i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }} />Quay lại đăng nhập</Link>
          </p>
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';

// ── Forgot-password modal (3 steps) ──────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [step, setStep]             = useState(1); // 1=email, 2=otp, 3=new-password, 4=success
  const [email, setEmail]           = useState('');
  const [otp, setOtp]               = useState('');
  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const clearError = () => setError('');

  // Step 1: send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Vui lòng nhập địa chỉ email.'); return; }
    setLoading(true);
    clearError();
    try {
      await authApi.forgotPassword(email.trim());
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP (client-side advance; backend validates at reset step)
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
      setError('Mã OTP gồm đúng 6 chữ số.');
      return;
    }
    clearError();
    setStep(3);
  };

  // Step 3: reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6)        { setError('Mật khẩu phải ít nhất 6 ký tự.'); return; }
    if (newPass !== confirmPass)   { setError('Mật khẩu xác nhận không khớp.');  return; }
    setLoading(true);
    clearError();
    try {
      await authApi.resetPassword(email.trim(), otp.trim(), newPass);
      setStep(4);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Đặt lại mật khẩu thất bại.';
      setError(msg);
      // If OTP wrong/expired, go back to step 2
      if (msg.includes('OTP')) setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Nhập email', 'Xác nhận OTP', 'Mật khẩu mới'];

  return (
    <div className="fp-overlay" role="dialog" aria-modal="true" aria-label="Đặt lại mật khẩu">
      <div className="fp-modal">
        {/* Header */}
        <div className="fp-modal-head">
          <div>
            <h2>
              {step === 4
                ? <><i className="fa-solid fa-circle-check" style={{ color: '#22c55e' }} /> Thành công!</>
                : <><i className="fa-solid fa-key" /> Đặt lại mật khẩu</>}
            </h2>
            {step < 4 && (
              <p>{stepLabels[step - 1]} · Bước {step}/3</p>
            )}
          </div>
          <button type="button" className="fp-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="fp-steps">
            {stepLabels.map((label, i) => (
              <div key={i} className={`fp-step ${i + 1 < step ? 'done' : ''} ${i + 1 === step ? 'current' : ''}`}>
                <div className="fp-step-dot">
                  {i + 1 < step ? <i className="fa-solid fa-check" /> : i + 1}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="fp-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </p>
        )}

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="fp-body">
            <p className="fp-desc">
              Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi mã OTP 6 chữ số để xác thực.
            </p>
            <div className="form-group">
              <label>Địa chỉ email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="example@gmail.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn btn-primary fp-btn" disabled={loading}>
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Đang gửi...</>
                : <><i className="fa-solid fa-paper-plane" /> Gửi mã OTP</>}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="fp-body">
            <div className="fp-email-hint">
              <i className="fa-solid fa-envelope-circle-check" />
              <span>
                Mã OTP đã gửi đến <strong>{email}</strong>.
                Kiểm tra cả thư mục <em>Spam</em> nếu không thấy.
              </span>
            </div>
            <div className="form-group">
              <label>Mã OTP (6 chữ số)</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clearError(); }}
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                required
                autoFocus
                className="fp-otp-input"
                autoComplete="one-time-code"
              />
            </div>
            <div className="fp-actions">
              <button type="button" className="fp-back-btn" onClick={() => { setStep(1); clearError(); }}>
                <i className="fa-solid fa-arrow-left" /> Gửi lại
              </button>
              <button type="submit" className="btn btn-primary fp-btn" disabled={otp.length !== 6}>
                Xác nhận <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: New password ── */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="fp-body">
            <div className="form-group">
              <label>Mật khẩu mới</label>
              <div className="auth-password-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); clearError(); }}
                  placeholder="Ít nhất 6 ký tự"
                  required
                  autoFocus
                  autoComplete="new-password"
                />
                <button type="button" className="auth-eye-btn" tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Xác nhận mật khẩu</label>
              <div className="auth-password-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => { setConfirmPass(e.target.value); clearError(); }}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="fp-actions">
              <button type="button" className="fp-back-btn" onClick={() => { setStep(2); clearError(); }}>
                <i className="fa-solid fa-arrow-left" /> Quay lại
              </button>
              <button type="submit" className="btn btn-primary fp-btn" disabled={loading}>
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang lưu...</>
                  : <><i className="fa-solid fa-lock" /> Đặt lại mật khẩu</>}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="fp-body fp-success">
            <div className="fp-success-icon">
              <i className="fa-solid fa-circle-check" />
            </div>
            <p>Mật khẩu của bạn đã được đặt lại thành công.</p>
            <p className="fp-success-sub">Hãy đăng nhập bằng mật khẩu mới của bạn.</p>
            <button type="button" className="btn btn-primary fp-btn" onClick={onClose}>
              <i className="fa-solid fa-arrow-right-to-bracket" /> Đăng nhập ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Login page ───────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
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
      if (role === 2)      navigate('/admin/dashboard', { replace: true });
      else if (role === 1) navigate('/operator/dashboard', { replace: true });
      else if (role === 3) navigate('/driver', { replace: true });
      else                 navigate('/', { replace: true });
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
              <div className="fp-label-row">
                <label>Mật khẩu</label>
                <button
                  type="button"
                  className="fp-link-btn"
                  onClick={() => setShowForgot(true)}
                >
                  Quên mật khẩu?
                </button>
              </div>
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

          <p className="auth-bottom">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  );
}

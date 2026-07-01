import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { apiErrorMessage, setToken } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { useAuthStore } from '../store/auth.store';

export default function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (password !== confirm) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authApi.signup(username, nickname || username, password);
      setToken(token);
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'ثبت‌نام ناموفق بود.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-topbar">
        <ThemeToggle />
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-logo">نیپو چت</div>
        <h1>ثبت‌نام</h1>
        <p className="auth-sub">یک نام کاربری یکتا و رمز عبور دلخواه انتخاب کنید</p>

        <div className="field">
          <label htmlFor="u">نام کاربری (یکتا، انگلیسی)</label>
          <input
            id="u"
            autoFocus
            dir="ltr"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
        </div>
        <div className="field">
          <label htmlFor="n">نام نمایشی (دلخواه)</label>
          <input
            id="n"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="نامی که دیگران می‌بینند"
          />
        </div>
        <div className="field">
          <label htmlFor="p">رمز عبور (حداقل ۶ کاراکتر)</label>
          <input
            id="p"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="field">
          <label htmlFor="pc">تکرار رمز عبور</label>
          <input
            id="pc"
            type="password"
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'در حال ساخت…' : 'ساخت حساب'}
        </button>

        <p className="auth-alt">
          حساب دارید؟ <Link to="/login">وارد شوید</Link>
        </p>
      </form>
    </div>
  );
}

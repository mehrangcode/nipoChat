import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { useAuthStore } from '../store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'ورود ناموفق بود.'));
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-topbar">
        <ThemeToggle />
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-logo">نیپو چت</div>
        <h1>ورود</h1>
        <p className="auth-sub">به گفتگوهای خود بازگردید</p>

        <div className="field">
          <label htmlFor="u">نام کاربری</label>
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
          <label htmlFor="p">رمز عبور</label>
          <input
            id="p"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="error-text">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'در حال ورود…' : 'ورود'}
        </button>

        <p className="auth-alt">
          حساب ندارید؟ <Link to="/signup">ثبت‌نام کنید</Link>
        </p>
      </form>
    </div>
  );
}

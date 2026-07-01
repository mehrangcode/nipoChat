import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { apiErrorMessage } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { usePush } from '../hooks/usePush';
import { useAuthStore } from '../store/auth.store';
import { useChatStore } from '../store/chat.store';

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const resetChat = useChatStore((s) => s.reset);
  const push = usePush();

  const [nickname, setNickname] = useState(user.nickname);
  const [savingNick, setSavingNick] = useState(false);
  const [nickMsg, setNickMsg] = useState<string | null>(null);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const saveNickname = async (e: FormEvent) => {
    e.preventDefault();
    setSavingNick(true);
    setNickMsg(null);
    try {
      const updated = await authApi.updateMe({ nickname });
      setUser(updated);
      setNickMsg('ذخیره شد ✓');
    } finally {
      setSavingNick(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    try {
      await authApi.changePassword(curPw, newPw);
      setPwMsg('رمز عبور تغییر کرد ✓');
      setCurPw('');
      setNewPw('');
    } catch (err) {
      setPwErr(apiErrorMessage(err, 'تغییر رمز ناموفق بود.'));
    }
  };

  const doLogout = () => {
    logout();
    resetChat();
    navigate('/login');
  };

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <button className="icon-btn" onClick={() => navigate('/')} title="بازگشت">›</button>
        <h1>تنظیمات</h1>
        <ThemeToggle />
      </header>

      <div className="settings-body">
        {/* Profile */}
        <section className="settings-card">
          <h2>نام نمایشی</h2>
          <form onSubmit={saveNickname}>
            <div className="field">
              <label>نام کاربری (ثابت)</label>
              <input value={`@${user.username}`} dir="ltr" disabled />
            </div>
            <div className="field">
              <label>نام نمایشی</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            {nickMsg && <div className="ok-text">{nickMsg}</div>}
            <button className="btn btn-primary" disabled={savingNick}>ذخیره</button>
          </form>
        </section>

        {/* Password */}
        <section className="settings-card">
          <h2>تغییر رمز عبور</h2>
          <form onSubmit={changePassword}>
            <div className="field">
              <label>رمز فعلی</label>
              <input type="password" dir="ltr" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </div>
            <div className="field">
              <label>رمز جدید (حداقل ۶ کاراکتر)</label>
              <input type="password" dir="ltr" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            {pwErr && <div className="error-text">{pwErr}</div>}
            {pwMsg && <div className="ok-text">{pwMsg}</div>}
            <button className="btn btn-primary">تغییر رمز</button>
          </form>
        </section>

        {/* Notifications */}
        <section className="settings-card">
          <h2>نوتیفیکیشن</h2>
          {!push.supported ? (
            <p className="hint">مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند.</p>
          ) : push.needsInstall ? (
            <p className="hint">
              در iOS ابتدا اپ را به صفحه‌ی اصلی اضافه کنید (Add to Home Screen)، سپس نوتیفیکیشن را
              فعال کنید.
            </p>
          ) : (
            <>
              <p className="hint">
                برای دریافت اعلان پیام‌های جدید هنگام آفلاین بودن، نوتیفیکیشن را فعال کنید.
              </p>
              {push.subscribed ? (
                <button className="btn btn-ghost" onClick={push.disable} disabled={push.busy}>
                  غیرفعال‌سازی نوتیفیکیشن
                </button>
              ) : (
                <button className="btn btn-primary" onClick={push.enable} disabled={push.busy}>
                  {push.busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی نوتیفیکیشن'}
                </button>
              )}
              {push.error && <div className="error-text">{push.error}</div>}
            </>
          )}
        </section>

        <button className="btn btn-ghost logout" onClick={doLogout}>خروج از حساب</button>
      </div>
    </div>
  );
}

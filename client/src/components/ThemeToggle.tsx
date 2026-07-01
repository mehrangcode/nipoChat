import { useThemeStore } from '../store/theme.store';

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  return (
    <button
      className="icon-btn"
      onClick={toggle}
      title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
      aria-label="تغییر تم"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

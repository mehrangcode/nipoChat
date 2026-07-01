import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
// Registers the custom service worker (injectRegister is false in vite.config).
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSocket } from './hooks/useSocket';
import ChatPage from './pages/Chat';
import LoginPage from './pages/Login';
import SettingsPage from './pages/Settings';
import SignupPage from './pages/Signup';
import { useAuthStore } from './store/auth.store';
import { useFeaturesStore } from './store/features.store';

export default function App() {
  const { user, initialized, bootstrap } = useAuthStore();
  const loadFeatures = useFeaturesStore((s) => s.load);

  // Register + auto-update the service worker.
  useRegisterSW({ immediate: true });

  useEffect(() => {
    void bootstrap();
    void loadFeatures();
  }, [bootstrap, loadFeatures]);

  // Keep the authenticated socket connected while logged in.
  useSocket(!!user);

  if (!initialized) {
    return <div className="app-splash">در حال بارگذاری…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" replace />} />
      <Route path="/chat/:conversationId" element={user ? <ChatPage /> : <Navigate to="/login" replace />} />
      <Route path="/" element={user ? <ChatPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { FooterAttribution } from './components/FooterAttribution';
import { OnboardingScreen } from './components/OnboardingScreen';
import { ToastViewport } from './components/ToastViewport';
import { useApp } from './contexts/AppContext';
import { DashboardPage } from './pages/DashboardPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

const KeyGuard = ({ children }: { children: React.ReactNode }) => {
  const {
    state: {
      settings: { tmdbApiKey, theme }
    }
  } = useApp();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  if (!tmdbApiKey && !['/settings', '/about'].includes(location.pathname)) {
    return <OnboardingScreen />;
  }

  return <>{children}</>;
};

const App = () => (
  <AppShell>
    <KeyGuard>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FooterAttribution />
    </KeyGuard>
    <ToastViewport />
  </AppShell>
);

export default App;

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import ScrollToTop from './components/ui/scroll-to-top';

function AppContent() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop watch={location.pathname} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

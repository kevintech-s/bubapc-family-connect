import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { isServerConfigured } from './services/api';
import { ProtectedRoute, AdminRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import FamiliesPage from './pages/FamiliesPage';
import FamilyDetailPage from './pages/FamilyDetailPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import PrayerRequestsPage from './pages/PrayerRequestsPage';
import WorshipPage from './pages/WorshipPage';
import AttendancePage from './pages/AttendancePage';
import GalleryPage from './pages/GalleryPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFamiliesPage from './pages/admin/AdminFamiliesPage';
import AdminMembersPage from './pages/admin/AdminMembersPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage';
import AdminPrayerRequestsPage from './pages/admin/AdminPrayerRequestsPage';
import AdminWorshipPage from './pages/admin/AdminWorshipPage';
import AdminGalleryPage from './pages/admin/AdminGalleryPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const needsSetup = !user && !isServerConfigured();

  return (
    <Routes>
      <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/login" replace />} />
      <Route path="/settings" element={user ? <Layout><SettingsPage /></Layout> : <Navigate to="/login" replace />} />

      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/families" element={<Layout><FamiliesPage /></Layout>} />
        <Route path="/families/:id" element={<Layout><FamilyDetailPage /></Layout>} />
        <Route path="/announcements" element={<Layout><AnnouncementsPage /></Layout>} />
        <Route path="/prayer-requests" element={<Layout><PrayerRequestsPage /></Layout>} />
        <Route path="/worship" element={<Layout><WorshipPage /></Layout>} />
        <Route path="/attendance" element={<Layout><AttendancePage /></Layout>} />
        <Route path="/gallery" element={<Layout><GalleryPage /></Layout>} />
        <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<Layout><AdminDashboardPage /></Layout>} />
        <Route path="/admin/families" element={<Layout><AdminFamiliesPage /></Layout>} />
        <Route path="/admin/members" element={<Layout><AdminMembersPage /></Layout>} />
        <Route path="/admin/announcements" element={<Layout><AdminAnnouncementsPage /></Layout>} />
        <Route path="/admin/prayer-requests" element={<Layout><AdminPrayerRequestsPage /></Layout>} />
        <Route path="/admin/worship" element={<Layout><AdminWorshipPage /></Layout>} />
        <Route path="/admin/gallery" element={<Layout><AdminGalleryPage /></Layout>} />
        <Route path="/admin/users" element={<Layout><AdminUsersPage /></Layout>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

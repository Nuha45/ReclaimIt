import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BrowsePage from './pages/BrowsePage';
import PostItemPage from './pages/PostItemPage';
import ItemDetailPage from './pages/ItemDetailPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminItems from './pages/admin/AdminItems';
import AdminViolations from './pages/admin/AdminViolations';

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="items/:id" element={<ItemDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />

        <Route path="post" element={<ProtectedRoute><PostItemPage /></ProtectedRoute>} />
        <Route path="chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="admin/items" element={<AdminRoute><AdminItems /></AdminRoute>} />
        <Route path="admin/violations" element={<AdminRoute><AdminViolations /></AdminRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161922',
            color: '#f0f2f8',
            border: '1px solid #2a2f42',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#ffb347', secondary: '#0f1117' } },
        }}
      />
    </BrowserRouter>
  );
}

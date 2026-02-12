import React from 'react';
import { BrowserRouter, Routes as RouterRoutes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Pages
import Login from './pages/Login';
import AdminTaskManagement from './pages/admin-task-management';
import StaffDashboard from './pages/staff-dashboard';
import Account from './pages/Account';
import NotFound from './pages/NotFound';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ScrollToTop />
          <RouterRoutes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            {/* Admin dashboard (primary URL) */}
            <Route path="/admin-task-management" element={<AdminTaskManagement />} />
            {/* Backwards-compatible alias */}
            <Route path="/admin-dashboard" element={<AdminTaskManagement />} />
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
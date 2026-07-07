import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const ApiKeys = lazy(() => import('./pages/ApiKeys'));
const Usage = lazy(() => import('./pages/Usage'));
const Billing = lazy(() => import('./pages/Billing'));
const Settings = lazy(() => import('./pages/Settings'));
const ZitadelConsole = lazy(() => import('./pages/ZitadelConsole'));
const BifrostConsole = lazy(() => import('./pages/BifrostConsole'));
const PageFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
    <div style={{ textAlign: 'center' }}>
      <div className="ant-spin ant-spin-spinning" style={{ color: '#1890ff', fontSize: 32 }}>
        <span className="ant-spin-dot-item ant-spin-dot-item1" />
        <span className="ant-spin-dot-item ant-spin-dot-item2" />
        <span className="ant-spin-dot-item ant-spin-dot-item3" />
        <span className="ant-spin-dot-item ant-spin-dot-item4" />
      </div>
      <p style={{ marginTop: 16, color: '#999' }}>Loading...</p>
    </div>
  </div>
);

const AuthorizedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.some(role => hasRole(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<PageFallback />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={
          <Suspense fallback={<PageFallback />}>
            <Dashboard />
          </Suspense>
        } />
        <Route path="/users" element={
          <Suspense fallback={<PageFallback />}>
            <AuthorizedRoute roles={['admin']}>
              <Users />
            </AuthorizedRoute>
          </Suspense>
        } />
        <Route path="/api-keys" element={
          <Suspense fallback={<PageFallback />}>
            <AuthorizedRoute roles={['admin', 'billing']}>
              <ApiKeys />
            </AuthorizedRoute>
          </Suspense>
        } />
        <Route path="/usage" element={
          <Suspense fallback={<PageFallback />}>
            <Usage />
          </Suspense>
        } />
        <Route path="/billing" element={
          <Suspense fallback={<PageFallback />}>
            <Billing />
          </Suspense>
        } />
        <Route path="/settings" element={
          <Suspense fallback={<PageFallback />}>
            <AuthorizedRoute roles={['admin']}>
              <Settings />
            </AuthorizedRoute>
          </Suspense>
        } />
        <Route path="/zitadel" element={
          <Suspense fallback={<PageFallback />}>
            <AuthorizedRoute roles={['admin']}>
              <ZitadelConsole />
            </AuthorizedRoute>
          </Suspense>
        } />
        <Route path="/bifrost" element={
          <Suspense fallback={<PageFallback />}>
            <AuthorizedRoute roles={['admin']}>
              <BifrostConsole />
            </AuthorizedRoute>
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AuthProvider>
  );
};

export default App;

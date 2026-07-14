import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ErrorBoundary } from "./components";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Usage = lazy(() => import("./pages/Usage"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Billing = lazy(() => import("./pages/Billing"));
const Settings = lazy(() => import("./pages/Settings"));
const BifrostConsole = lazy(() => import("./pages/BifrostConsole"));

const PageFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
    <span className="w-8 h-8 rounded-full border-4 border-[var(--color-line-strong)] border-t-[var(--color-accent)] animate-spin" />
    <span className="text-[13px] text-[var(--color-ink-faint)] font-semibold tracking-wider uppercase">
      Loading page...
    </span>
  </div>
);

const AuthorizedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles,
}) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.some((role) => hasRole(role))) {
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
    <AppShell>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/users"
          element={
            <Suspense fallback={<PageFallback />}>
              <AuthorizedRoute roles={["admin"]}>
                <Users />
              </AuthorizedRoute>
            </Suspense>
          }
        />
        <Route
          path="/api-keys"
          element={
            <Suspense fallback={<PageFallback />}>
              <AuthorizedRoute roles={["admin", "billing"]}>
                <ApiKeys />
              </AuthorizedRoute>
            </Suspense>
          }
        />
        <Route
          path="/usage"
          element={
            <Suspense fallback={<PageFallback />}>
              <Usage />
            </Suspense>
          }
        />
        <Route
          path="/sessions"
          element={
            <Suspense fallback={<PageFallback />}>
              <Sessions />
            </Suspense>
          }
        />
        <Route
          path="/billing"
          element={
            <Suspense fallback={<PageFallback />}>
              <Billing />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageFallback />}>
              <AuthorizedRoute roles={["admin"]}>
                <Settings />
              </AuthorizedRoute>
            </Suspense>
          }
        />
        <Route
          path="/bifrost"
          element={
            <Suspense fallback={<PageFallback />}>
              <AuthorizedRoute roles={["admin"]}>
                <BifrostConsole />
              </AuthorizedRoute>
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
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

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import CampaignDashboard from './campaignDashboard';
import CampaignPlanner from './pages/CampaignPlanner';
import WarRoom from './pages/WarRoom';
import LoginPage from './pages/LoginPage';
import ManageUsers from './pages/ManageUsers';

const RequireAuth = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const RequireAdmin = ({ children }) => {
  const { permissions } = useAuth();
  if (!permissions.canManageUsers) return <Navigate to="/" replace />;
  return children;
};

const RequireNonAdmin = ({ children }) => {
  const { permissions } = useAuth();
  if (permissions.canManageUsers) return <Navigate to="/manage-users" replace />;
  return children;
};

const RoleHome = () => {
  const { permissions } = useAuth();
  if (permissions.canManageUsers) return <Navigate to="/manage-users" replace />;
  return <CampaignDashboard />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={(
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              )}
            >
              <Route index element={<RoleHome />} />
              <Route
                path="campaign-planner"
                element={(
                  <RequireNonAdmin>
                    <CampaignPlanner />
                  </RequireNonAdmin>
                )}
              />
              <Route
                path="war-room"
                element={(
                  <RequireNonAdmin>
                    <WarRoom />
                  </RequireNonAdmin>
                )}
              />
              <Route
                path="manage-users"
                element={(
                  <RequireAdmin>
                    <ManageUsers />
                  </RequireAdmin>
                )}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

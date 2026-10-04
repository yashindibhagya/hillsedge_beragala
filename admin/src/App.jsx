import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequirePermission } from './auth';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { MediaProvider } from './hooks/useMediaLibrary';
import Login from './pages/Login';
import { Forgot, Reset } from './pages/PasswordReset';
import Dashboard from './pages/Dashboard';

/*
 * Sign-in and the dashboard ship in the main bundle — every session starts
 * there. The other screens load when first opened.
 */
const MenuItems = lazy(() => import('./pages/MenuItems'));
const Categories = lazy(() => import('./pages/Categories'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Media = lazy(() => import('./pages/Media'));
const Promotions = lazy(() => import('./pages/Promotions'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const Content = lazy(() => import('./pages/Content'));
const Users = lazy(() => import('./pages/Users'));
const Activity = lazy(() => import('./pages/Activity'));
const Account = lazy(() => import('./pages/Account'));

const guarded = (permission, element) => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route
            element={
              <RequireAuth>
                <MediaProvider>
                  <Layout />
                </MediaProvider>
              </RequireAuth>
            }
          >
            <Route index element={guarded('dashboard', <Dashboard />)} />
            <Route path="reservations" element={guarded('reservations:read', <Reservations />)} />
            <Route path="menu" element={guarded('menu:availability', <MenuItems />)} />
            <Route path="categories" element={guarded('menu:write', <Categories />)} />
            <Route path="rooms" element={guarded('rooms:availability', <Rooms />)} />
            <Route path="media" element={guarded('media:write', <Media />)} />
            <Route path="promotions" element={guarded('promotions:write', <Promotions />)} />
            <Route path="testimonials" element={guarded('testimonials:write', <Testimonials />)} />
            <Route path="content" element={guarded('content:write', <Content />)} />
            <Route path="users" element={guarded('users:manage', <Users />)} />
            <Route path="activity" element={guarded('dashboard', <Activity />)} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import WeekView from './pages/WeekView';
import ShiftDetail from './pages/ShiftDetail';
import MyShifts from './pages/MyShifts';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Any authenticated user ───────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"        element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule"               element={<WeekView />} />
            <Route path="/shift/:date/:type"      element={<ShiftDetail />} />
            <Route path="/my-shifts"              element={<MyShifts />} />
          </Route>

          {/* ── Admin only ───────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin"        element={<Dashboard />} />
            <Route path="/admin/users"  element={<Users />} />
          </Route>

          {/* ── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

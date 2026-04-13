import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, LogOut, Users, ListChecks, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <nav className="bg-indigo-700 dark:bg-indigo-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/schedule"
            className="flex items-center gap-2 font-bold text-lg tracking-tight hover:text-indigo-200 transition-colors"
          >
            <CalendarDays className="w-6 h-6" />
            <span className="hidden sm:inline">PTA Store Volunteers</span>
            <span className="sm:hidden">PTA Volunteers</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-4">
            <Link
              to="/schedule"
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Link>

            <Link
              to="/my-shifts"
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
            >
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">My Shifts</span>
            </Link>

            {profile?.role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Users</span>
                </Link>
              </>
            )}

            {profile && (
              <span className="text-xs text-indigo-300 hidden md:inline max-w-[120px] truncate">
                {profile.full_name}
              </span>
            )}

            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

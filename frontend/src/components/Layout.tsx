import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Target,
  TrendingUp,
  FileBarChart,
  Layers,
  Sparkles,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Shield,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AIChatBubble from './AIChatBubble';
import KPIUpdateNotification from './KPIUpdateNotification';
import UserPreferencesDebug from './UserPreferencesDebug';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'AI Strategy Platform', path: '/ogsm', icon: Target },
  { name: 'KPIs', path: '/kpis', icon: TrendingUp },
  { name: 'AI Strategy Generator', path: '/ai-strategy', icon: Sparkles },
  { name: 'Strategic Planning', path: '/strategic-planning', icon: Layers },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
  { name: 'Admin', path: '/admin', icon: Shield },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAnyPermission, isImpersonating, stopImpersonation } = useAuth();
  const [triggerNotification, setTriggerNotification] = useState<(() => void) | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    // Admin link only for super admins
    if (item.path === '/admin') {
      return hasAnyPermission('*', 'manage_users');
    }
    return true;
  });

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <div className="text-sm font-medium">
                  You are viewing as{' '}
                  <span className="font-bold">
                    {user?.first_name} {user?.last_name}
                  </span>{' '}
                  ({user?.role_display_name})
                </div>
              </div>
              <button
                onClick={handleStopImpersonation}
                className="flex items-center gap-2 px-4 py-1.5 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                <X className="h-4 w-4" />
                Exit Impersonation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/RMU_Colonials_logo.svg/1200px-RMU_Colonials_logo.svg.png"
                alt="RMU Colonials Logo"
                className="h-10 w-10 object-contain"
              />
              <Target className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                StratifyAI
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* KPI Notification Trigger Button */}
              <button
                onClick={() => triggerNotification?.()}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Test KPI Update Notification"
              >
                <Bell className="h-5 w-5" />
              </button>

              {/* User Profile Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={`${user.first_name} ${user.last_name}`}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-600" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user?.role_display_name || user?.role}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.email}
                      </p>
                      {user?.department && (
                        <p className="text-xs text-gray-500 mt-1">
                          {user.department}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>

      {/* Global AI Chat Bubble */}
      <AIChatBubble />

      {/* KPI Update Notification */}
      <KPIUpdateNotification
        checkInterval={7}
        onTrigger={(callback) => setTriggerNotification(() => callback)}
      />

      {/* User Preferences Debug (dev mode) */}
      {import.meta.env.DEV && <UserPreferencesDebug />}
    </div>
  );
}

import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Target,
  TrendingUp,
  FileBarChart,
  Layers,
  Sparkles,
  Bell
} from 'lucide-react';
import AIChatBubble from './AIChatBubble';
import KPIUpdateNotification from './KPIUpdateNotification';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'AI Strategy Platform', path: '/ogsm', icon: Target },
  { name: 'KPIs', path: '/kpis', icon: TrendingUp },
  { name: 'AI Strategy Generator', path: '/ai-strategy', icon: Sparkles },
  { name: 'Strategic Planning', path: '/strategic-planning', icon: Layers },
  { name: 'Reports', path: '/reports', icon: FileBarChart },
];

export default function Layout() {
  const location = useLocation();
  const [triggerNotification, setTriggerNotification] = useState<(() => void) | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
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

            {/* KPI Notification Trigger Button */}
            <button
              onClick={() => triggerNotification?.()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              title="Test KPI Update Notification"
            >
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">KPI Reminder</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
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
    </div>
  );
}

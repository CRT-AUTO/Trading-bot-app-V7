import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, LineChart, History, Settings, FileText, LogOut, BarChart3, BarChart, Calculator, BarChart as ChartBar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <BarChart3 size={20} /> },
    { path: '/bots', label: 'Bots', icon: <Bot size={20} /> },
    { path: '/trades', label: 'Bot Trades', icon: <History size={20} /> },
    { path: '/manual-trades', label: 'Manual Trading', icon: <Calculator size={20} /> },
    { path: '/manual-trades-history', label: 'Manual Trades', icon: <ChartBar size={20} /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart size={20} /> },
    { path: '/systems', label: 'Trading Systems', icon: <LineChart size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    { path: '/logs', label: 'Logs', icon: <FileText size={20} /> },
    { path: '/docs', label: 'Documentation', icon: <FileText size={20} /> },
  ];

  // Check if the current path matches the nav item path
  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    
    // For exact match instead of startsWith
    return location.pathname === path || 
      // Special case for /bots/:id route
      (path === '/bots' && location.pathname.startsWith('/bots/')) ||
      // Special case for /analytics/:botId route
      (path === '/analytics' && location.pathname.startsWith('/analytics/'));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center">
            <Bot className="mr-2 text-blue-600" />
            <span>Trading Bot</span>
          </h1>
        </div>
        <nav className="mt-6">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-6 py-3 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                    isActiveRoute(item.path) ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 mt-auto">
            <button
              onClick={handleSignOut}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <LogOut size={20} />
              <span className="ml-3">Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
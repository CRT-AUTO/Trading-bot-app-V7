import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, History, Settings, Menu, BarChart3, BarChart, Calculator, BarChart as ChartBar, ChevronLeft, ChevronRight, PieChart, Book, LineChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Group navigation items by category
  const botItems = [
    { path: '/bots', label: 'Bots', icon: <Bot size={20} /> },
    { path: '/trades', label: 'Bot Trades', icon: <History size={20} /> },
    { path: '/analytics', label: 'Bot Analytics', icon: <BarChart size={20} /> },
  ];
  
  const manualTradeItems = [
    { path: '/manual-trades', label: 'Manual Trading', icon: <Calculator size={20} /> },
    { path: '/manual-trades-history', label: 'Trade History', icon: <ChartBar size={20} /> },
    { path: '/manual-trades-analytics', label: 'Trade Analytics', icon: <PieChart size={20} /> },
  ];
  
  const journalItems = [
    { path: '/r-value-tracker', label: 'R Value Tracker', icon: <LineChart size={20} /> },
    { path: '/journal', label: 'Trading Journal', icon: <Book size={20} /> },
  ];

  const generalItems = [
    { path: '/', label: 'Dashboard', icon: <BarChart3 size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
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

  // Render navigation section with title
  const renderNavSection = (title: string, items: any[]) => {
    return (
      <div className="mb-4">
        {!sidebarCollapsed && (
          <h3 className="px-6 my-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <ul>
          {items.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-6 py-3 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                  sidebarCollapsed ? 'md:justify-center md:px-2' : ''
                } ${
                  isActiveRoute(item.path) ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="ml-3">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Toggle Button for Mobile */}
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="fixed z-20 top-4 left-4 p-2 rounded-md bg-white shadow-md md:hidden"
          aria-label="Open Sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <aside 
        className={`${
          sidebarCollapsed ? 'hidden md:flex md:w-16' : 'w-64'
        } bg-white shadow-md flex-shrink-0 flex flex-col z-10 transition-all duration-300 ease-in-out`}
      >
        <div className={`p-6 ${sidebarCollapsed ? 'md:p-4' : ''}`}>
          <h1 className={`text-xl font-bold flex items-center ${sidebarCollapsed ? 'md:justify-center' : ''}`}>
            <Bot className={`${sidebarCollapsed ? '' : 'mr-2'} text-blue-600`} />
            {!sidebarCollapsed && <span>Trading Bot</span>}
          </h1>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto">
          {renderNavSection("General", generalItems)}
          {renderNavSection("Bots", botItems)}
          {renderNavSection("Manual Trading", manualTradeItems)}
          {renderNavSection("Journal", journalItems)}
        </nav>
        {/* Collapse/Expand button - Changed to be visible on all screens */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-full p-2 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
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

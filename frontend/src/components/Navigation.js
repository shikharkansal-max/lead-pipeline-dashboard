import { Link, useLocation } from "react-router-dom";
import { BarChart3, GitMerge, TrendingUp } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Pipeline Dashboard",
      icon: BarChart3,
      description: "Deal pipeline & performance"
    },
    {
      path: "/mql-sql",
      label: "MQL/SQL Analytics",
      icon: GitMerge,
      description: "Lead generation metrics"
    },
    {
      path: "/trends",
      label: "AI Trends",
      icon: TrendingUp,
      description: "Industry insights"
    }
  ];

  return (
    <nav className="bg-white border-b border-gray-200" data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group inline-flex items-center px-1 pt-4 pb-3 border-b-2 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                data-testid={`nav-${item.path.substring(1) || 'pipeline'}`}
              >
                <Icon className={`mr-2 h-5 w-5 ${
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs text-gray-400">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
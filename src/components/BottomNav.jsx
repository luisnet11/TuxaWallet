import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Wallet, Activity, Settings } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', icon: Home, label: 'Inicio', path: '/dashboard' },
    { id: 'wallet', icon: Wallet, label: 'Cartera', path: '/assets' },
    { id: 'activities', icon: Activity, label: 'Actividades', path: '/activities' },
    { id: 'settings', icon: Settings, label: 'Ajustes', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-950 border-t border-white/10 p-3 flex justify-around items-center z-50">
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button 
            key={item.id}
            onClick={() => navigate(item.path)} 
            className={`flex flex-col items-center space-y-1 transition-colors ${isActive ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

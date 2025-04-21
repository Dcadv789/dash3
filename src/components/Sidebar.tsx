import React from 'react';
import { 
  Home,
  LayoutDashboard, 
  ShoppingCart, 
  LineChart,
  Wallet,
  Receipt,
  Menu,
  CircuitBoard,
  Settings,
} from 'lucide-react';
import { NavLink } from './NavLink';
import { useLocation } from 'react-router-dom';

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="flex flex-col w-64 bg-zinc-900 m-2 rounded-xl">
      <div className="flex-1 flex flex-col p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1 pb-6">
          <CircuitBoard className="h-8 w-8 text-blue-500" />
          <span className="font-semibold text-xl">Sistema</span>
        </div>

        {/* Menu Toggle (Mobile) */}
        <button className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-zinc-100">
          <Menu size={20} />
          <span>Menu</span>
        </button>

        {/* Navigation */}
        <nav className="space-y-0.5 mt-6">
          <NavLink 
            icon={Home} 
            text="Início" 
            active={location.pathname === '/'} 
            href="/"
          />
          <NavLink 
            icon={LayoutDashboard} 
            text="Dashboard" 
            active={location.pathname === '/dashboard'}
            href="/dashboard"
          />
          <NavLink 
            icon={ShoppingCart} 
            text="Vendas" 
            active={location.pathname === '/sales'}
            href="/sales"
          />
          <NavLink 
            icon={LineChart} 
            text="Análise" 
            active={location.pathname === '/analysis'}
            href="/analysis"
          />
          <NavLink 
            icon={Wallet} 
            text="Caixa" 
            active={location.pathname === '/cashflow'}
            href="/cashflow"
          />
          <NavLink 
            icon={Receipt} 
            text="DRE" 
            active={location.pathname === '/dre'}
            href="/dre"
          />
          <NavLink 
            icon={Settings} 
            text="DRE Config" 
            active={location.pathname === '/dre-config'}
            href="/dre-config"
          />
        </nav>
      </div>
    </aside>
  );
};
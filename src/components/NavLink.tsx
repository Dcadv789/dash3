import React from 'react';
import { Link } from 'react-router-dom';

interface NavLinkProps {
  icon: React.ElementType;
  text: string;
  active?: boolean;
  href: string;
}

export const NavLink = ({ icon: Icon, text, active = false, href }: NavLinkProps) => (
  <Link 
    to={href}
    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'text-zinc-400 hover:bg-blue-600/10 hover:text-blue-500'
    }`}
  >
    <Icon size={20} />
    {text}
  </Link>
);
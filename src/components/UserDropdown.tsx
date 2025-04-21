import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
          <User size={20} className="text-zinc-400" />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-zinc-100">{user?.email}</p>
          <p className="text-xs text-zinc-500">Usuário</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-lg shadow-lg py-1 z-50">
          <button
            onClick={() => {
              navigate('/profile');
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
          >
            <User size={16} />
            Ver Perfil
          </button>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};
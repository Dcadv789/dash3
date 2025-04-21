import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, Users, Building, ChevronRight, X, Check, Lock } from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Topbar = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
        setIsFinanceOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-zinc-900 m-2 rounded-xl p-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <Bell size={20} className="text-zinc-400" />
        </button>
        <div className="relative" ref={settingsRef}>
          <button 
            className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings size={20} className="text-zinc-400" />
            <span className="text-zinc-400">Configurações</span>
          </button>
          {isSettingsOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  navigate('/users');
                  setIsSettingsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
              >
                <Users size={16} />
                Usuários
              </button>
              <button
                onClick={() => {
                  navigate('/companies');
                  setIsSettingsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
              >
                <Building size={16} />
                Empresas
              </button>
              <div className="relative group">
                <button
                  onMouseEnter={() => setIsFinanceOpen(true)}
                  className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center justify-between"
                >
                  <span>Financeiro</span>
                  <ChevronRight size={16} />
                </button>
                {isFinanceOpen && (
                  <div className="absolute left-full top-0 w-48 bg-zinc-800 rounded-lg shadow-lg py-1"
                       onMouseLeave={() => setIsFinanceOpen(false)}>
                    <button
                      onClick={() => {
                        navigate('/categories');
                        setIsSettingsOpen(false);
                        setIsFinanceOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 text-left"
                    >
                      Categorias
                    </button>
                    <button
                      onClick={() => {
                        navigate('/indicators');
                        setIsSettingsOpen(false);
                        setIsFinanceOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 text-left"
                    >
                      Indicadores
                    </button>
                    <button
                      onClick={() => {
                        navigate('/raw-data');
                        setIsSettingsOpen(false);
                        setIsFinanceOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 text-left"
                    >
                      Dados Brutos
                    </button>
                    <button
                      onClick={() => {
                        navigate('/dre');
                        setIsSettingsOpen(false);
                        setIsFinanceOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 text-left"
                    >
                      DRE Config
                    </button>
                    <button
                      onClick={() => {
                        navigate('/empresas-contas-dre');
                        setIsSettingsOpen(false);
                        setIsFinanceOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 text-left"
                    >
                      DRE por Empresa
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <UserDropdown />
      </div>
    </header>
  );
};
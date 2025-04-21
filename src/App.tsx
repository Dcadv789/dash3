import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Profile } from './pages/Profile';
import { Users } from './pages/Users';
import { Companies } from './pages/Companies';
import { Categories } from './pages/Categories';
import { Indicators } from './pages/Indicators';
import { DreModelConfig } from './pages/DreModelConfig';
import { EmpresasContasDRE } from './pages/EmpresasContasDRE';
import { RawData } from './pages/RawData';
import { Login } from './pages/Login';
import { DREVisualizacao } from './pages/DREVisualizacao';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path="/companies" element={<PrivateRoute><Companies /></PrivateRoute>} />
          <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
          <Route path="/indicators" element={<PrivateRoute><Indicators /></PrivateRoute>} />
          <Route path="/raw-data" element={<PrivateRoute><RawData /></PrivateRoute>} />
          <Route path="/dre" element={<PrivateRoute><DREVisualizacao /></PrivateRoute>} />
          <Route path="/dre-config" element={<PrivateRoute><DreModelConfig /></PrivateRoute>} />
          <Route path="/empresas-contas-dre" element={<PrivateRoute><EmpresasContasDRE /></PrivateRoute>} />
          <Route path="/" element={<PrivateRoute>
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold">Bem-vindo ao Sistema</h1>
              <p className="mt-4 text-zinc-400">
                Esta página está em desenvolvimento. Em breve, você terá acesso a todas as funcionalidades do sistema.
              </p>
            </div>
          </PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
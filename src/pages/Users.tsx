import React, { useState, useEffect } from 'react';
import { User, Edit, Trash2, Plus, Building, Search, Shield, X, Check, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  company_id: string;
  role: 'master' | 'consultor' | 'cliente' | 'colab';
  is_active: boolean;
}

interface Company {
  id: string;
  trading_name: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  page: string;
  can_access: boolean;
  can_edit: boolean;
}

const ROLE_LABELS = {
  master: 'Master',
  consultor: 'Consultor',
  cliente: 'Cliente',
  colab: 'Colaborador'
};

const ROLE_COLORS = {
  master: 'bg-purple-500/20 text-purple-400',
  consultor: 'bg-blue-500/20 text-blue-400',
  cliente: 'bg-green-500/20 text-green-400',
  colab: 'bg-orange-500/20 text-orange-400'
};

const AVAILABLE_PAGES = [
  { id: 'home', name: 'Início' },
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'sales', name: 'Vendas' },
  { id: 'analysis', name: 'Análise' },
  { id: 'cashflow', name: 'Caixa' },
  { id: 'dre', name: 'DRE' },
  { id: 'users', name: 'Usuários' },
  { id: 'settings', name: 'Configurações' }
];

export const Users = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);

  // Form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    company_id: '',
    role: 'colab' as const,
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError('Erro ao carregar usuários');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, trading_name')
        .eq('is_active', true);

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setUserPermissions(data || []);
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);

      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;

      // 2. Criar usuário no sistema
      const { error: systemError } = await supabase
        .from('system_users')
        .insert([{
          name: newUser.name,
          email: newUser.email,
          company_id: newUser.company_id,
          role: newUser.role,
          is_active: newUser.is_active,
          auth_user_id: authData.user?.id
        }]);

      if (systemError) throw systemError;

      // 3. Atualizar lista de usuários
      await fetchUsers();
      setShowNewUserModal(false);
      resetNewUserForm();
    } catch (err) {
      setError('Erro ao criar usuário');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('system_users')
        .update({
          name: editingUser.name,
          company_id: editingUser.company_id,
          role: editingUser.role,
          is_active: editingUser.is_active
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      setError('Erro ao atualizar usuário');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('system_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
    } catch (err) {
      setError('Erro ao excluir usuário');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);

      // Primeiro, deletamos todas as permissões existentes do usuário
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      if (deleteError) throw deleteError;

      // Depois, inserimos as novas permissões
      const { error: insertError } = await supabase
        .from('user_permissions')
        .insert(
          userPermissions.map(permission => ({
            user_id: selectedUser.id,
            page: permission.page,
            can_access: permission.can_access,
            can_edit: permission.can_edit
          }))
        );

      if (insertError) throw insertError;

      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Erro ao atualizar permissões');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetNewUserForm = () => {
    setNewUser({
      name: '',
      email: '',
      password: '',
      company_id: '',
      role: 'colab',
      is_active: true
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesCompany = selectedCompany ? user.company_id === selectedCompany : true;
    const matchesSearch = searchTerm.toLowerCase() === '' ? true : 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesSearch;
  });

  const togglePermission = (page: string, type: 'access' | 'edit') => {
    setUserPermissions(prevPermissions => {
      const existingPermission = prevPermissions.find(p => p.page === page);
      
      if (existingPermission) {
        return prevPermissions.map(p => 
          p.page === page
            ? {
                ...p,
                can_access: type === 'access' ? !p.can_access : p.can_access,
                can_edit: type === 'edit' ? !p.can_edit : p.can_edit
              }
            : p
        );
      }

      return [
        ...prevPermissions,
        {
          id: crypto.randomUUID(),
          user_id: selectedUser?.id || '',
          page,
          can_access: type === 'access',
          can_edit: type === 'edit'
        }
      ];
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Gerenciamento de Usuários</h1>
          <p className="text-zinc-400 mt-1">Gerencie usuários e suas permissões de acesso</p>
        </div>
        <button 
          onClick={() => setShowNewUserModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              >
                <option value="">Todas as empresas</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.trading_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Usuário</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Empresa</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Nível</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User size={16} className="text-zinc-400" />
                      </div>
                      <span className="text-zinc-300">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-zinc-500" />
                      <span className="text-zinc-400">
                        {companies.find(c => c.id === user.company_id)?.trading_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPermissionsModal(true);
                        }}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                        title="Configurar Permissões"
                      >
                        <Lock size={16} />
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Novo Usuário */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">Novo Usuário</h2>
              <button
                onClick={() => {
                  setShowNewUserModal(false);
                  resetNewUserForm();
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Empresa
                </label>
                <select
                  value={newUser.company_id}
                  onChange={(e) => setNewUser({ ...newUser, company_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.trading_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nível de Acesso
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as SystemUser['role'] })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                  />
                  <span className="text-zinc-400">Usuário Ativo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewUserModal(false);
                  resetNewUserForm();
                }}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.name || !newUser.email || !newUser.password || !newUser.company_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">Editar Usuário</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Empresa
                </label>
                <select
                  value={editingUser.company_id}
                  onChange={(e) => setEditingUser({ ...editingUser, company_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.trading_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nível de Acesso
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as SystemUser['role'] })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                  />
                  <span className="text-zinc-400">Usuário Ativo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Permissões */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">Configurar Permissões</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Usuário: {selectedUser.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {AVAILABLE_PAGES.map(page => {
                const permission = userPermissions.find(p => p.page === page.name) || {
                  can_access: false,
                  can_edit: false
                };

                return (
                  <div key={page.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                    <span className="text-zinc-200">{page.name}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permission.can_access}
                          onChange={() => togglePermission(page.name, 'access')}
                          className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                        />
                        <span className="text-zinc-400">Visualizar</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={permission.can_edit}
                          onChange={() => togglePermission(page.name, 'edit')}
                          disabled={!permission.can_access}
                          className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800 disabled:opacity-50"
                        />
                        <span className="text-zinc-400">Editar</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePermissions}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Salvar Permissões
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DREConfigAccountRow } from '../components/DREConfig/DREConfigAccountRow';
import { DREConfigAccountModal } from '../components/DREConfig/DREConfigAccountModal';
import { Company } from '../types/company';
import { Category, Indicator } from '../types/financial';
import { DREConfigAccount } from '../types/DREConfig';
import { supabase } from '../lib/supabase';

type AccountType = 'all' | 'revenue' | 'expense' | 'total' | 'flex';

const TYPE_LABELS = {
  all: 'Todos',
  revenue: 'Receita',
  expense: 'Despesa',
  total: 'Totalizador',
  flex: 'Flexível'
};

export const DREConfig = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accounts, setAccounts] = useState<DREConfigAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<AccountType>('all');
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<DREConfigAccount | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
    fetchCategories();
    fetchIndicators();
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, trading_name, name')
        .eq('is_active', true)
        .order('trading_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('code');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setError('Erro ao carregar categorias');
    }
  };

  const fetchIndicators = async () => {
    try {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .order('code');

      if (error) throw error;
      setIndicators(data || []);
    } catch (err) {
      console.error('Erro ao carregar indicadores:', err);
      setError('Erro ao carregar indicadores');
    }
  };

  const fetchAccounts = async () => {
    try {
      let query = supabase
        .from('dre_config_accounts')
        .select(`
          *,
          dre_config_account_companies!inner (
            company_id
          )
        `);

      if (selectedCompanyId) {
        query = query.eq('dre_config_account_companies.company_id', selectedCompanyId);
      }

      const { data, error } = await query.order('display_order');

      if (error) throw error;

      const accountsWithExpansion = (data || []).map(account => ({
        ...account,
        isExpanded: expandedAccounts.has(account.id)
      }));

      setAccounts(accountsWithExpansion);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
      setError('Erro ao carregar contas');
    }
  };

  const handleSaveAccount = async (accountData: DREConfigAccount) => {
    if (!selectedCompanyId) {
      setError('Selecione uma empresa antes de criar ou editar uma conta');
      return;
    }

    try {
      let data;
      if (editingAccount?.id) {
        // Atualização de conta existente
        const { data: updatedAccount, error } = await supabase
          .from('dre_config_accounts')
          .update({
            name: accountData.name,
            type: accountData.type,
            category_ids: accountData.categoryIds || null,
            indicator_id: accountData.indicatorId || null,
            selected_accounts: accountData.selectedAccounts || null,
            parent_account_id: accountData.parentAccountId || null,
            sign: accountData.sign || null
          })
          .eq('id', editingAccount.id)
          .select()
          .single();

        if (error) throw error;
        data = updatedAccount;
      } else {
        // Criação de nova conta
        const { data: newAccount, error: insertError } = await supabase
          .from('dre_config_accounts')
          .insert([{
            name: accountData.name,
            type: accountData.type,
            category_ids: accountData.categoryIds || null,
            indicator_id: accountData.indicatorId || null,
            selected_accounts: accountData.selectedAccounts || null,
            parent_account_id: accountData.parentAccountId || null,
            sign: accountData.sign || null,
            display_order: accounts.length,
            is_active: true
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        data = newAccount;

        // Vincula a conta à empresa
        const { error: linkError } = await supabase
          .from('dre_config_account_companies')
          .insert({
            account_id: data.id,
            company_id: selectedCompanyId,
            is_active: true
          });

        if (linkError) throw linkError;
      }

      setShowNewAccountModal(false);
      setEditingAccount(null);
      setError(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Erro ao salvar conta:', err);
      setError('Erro ao salvar conta. Verifique se todos os campos estão preenchidos corretamente.');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta? Todas as contas filhas também serão excluídas.')) return;

    try {
      // Primeiro, encontramos todas as contas filhas recursivamente
      const getAllChildrenIds = (parentId: string): string[] => {
        const children = accounts.filter(acc => acc.parentAccountId === parentId);
        return children.reduce((acc, child) => [
          ...acc,
          child.id,
          ...getAllChildrenIds(child.id)
        ], [] as string[]);
      };

      const childrenIds = getAllChildrenIds(accountId);
      const allIdsToDelete = [accountId, ...childrenIds];

      // Deletamos todas as contas de uma vez
      const { error } = await supabase
        .from('dre_config_accounts')
        .delete()
        .in('id', allIdsToDelete);

      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setError('Erro ao excluir conta');
    }
  };

  const getChildAccounts = (accountId: string | null): DREConfigAccount[] => {
    return accounts.filter(acc => acc.parentAccountId === accountId);
  };

  const handleMoveAccount = async (accountId: string, direction: 'up' | 'down') => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    const siblings = accounts.filter(acc => 
      acc.parentAccountId === account.parentAccountId
    ).sort((a, b) => a.displayOrder - b.displayOrder);

    const currentIndex = siblings.findIndex(acc => acc.id === accountId);
    
    if (direction === 'up' && currentIndex > 0) {
      const prevAccount = siblings[currentIndex - 1];
      await updateAccountOrder(account, prevAccount.displayOrder);
      await updateAccountOrder(prevAccount, account.displayOrder);
    } else if (direction === 'down' && currentIndex < siblings.length - 1) {
      const nextAccount = siblings[currentIndex + 1];
      await updateAccountOrder(account, nextAccount.displayOrder);
      await updateAccountOrder(nextAccount, account.displayOrder);
    }

    fetchAccounts();
  };

  const updateAccountOrder = async (account: DREConfigAccount, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('dre_config_accounts')
        .update({ display_order: newOrder })
        .eq('id', account.id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao atualizar ordem:', err);
      setError('Erro ao atualizar ordem das contas');
    }
  };

  const toggleAccountStatus = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    try {
      const { error } = await supabase
        .from('dre_config_accounts')
        .update({ is_active: !account.isActive })
        .eq('id', accountId);

      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status da conta');
    }
  };

  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Filtra apenas as contas raiz (sem pai)
  const rootAccounts = accounts.filter(acc => !acc.parentAccountId);

  // Aplica os filtros selecionados
  const filteredAccounts = rootAccounts
    .filter(acc => selectedType === 'all' || acc.type === selectedType)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">DRE Config</h1>
          <p className="text-zinc-400 mt-1">Configuração do Demonstrativo de Resultados</p>
        </div>
        <button
          onClick={() => {
            if (!selectedCompanyId) {
              setError('Selecione uma empresa antes de criar uma nova conta');
              return;
            }
            setError(null);
            setShowNewAccountModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Conta
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-64">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Empresa
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setError(null);
              }}
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

          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Tipo de Conta
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Código</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-zinc-400">Conta</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-400">Tipo</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(account => (
                <DREConfigAccountRow
                  key={account.id}
                  account={account}
                  level={0}
                  onToggleExpansion={toggleAccountExpansion}
                  onToggleStatus={toggleAccountStatus}
                  onStartEditing={setEditingAccount}
                  onMoveAccount={handleMoveAccount}
                  onDelete={handleDeleteAccount}
                  childAccounts={getChildAccounts(account.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DREConfigAccountModal
        isOpen={showNewAccountModal || editingAccount !== null}
        onClose={() => {
          setShowNewAccountModal(false);
          setEditingAccount(null);
          setError(null);
        }}
        editingAccount={editingAccount}
        onSave={handleSaveAccount}
        selectedCompanyId={selectedCompanyId}
        categories={categories}
        indicators={indicators}
        parentAccounts={accounts.filter(acc => 
          acc.type === 'total' || acc.type === 'flex'
        )}
      />
    </div>
  );
};
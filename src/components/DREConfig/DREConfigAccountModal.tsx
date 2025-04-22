import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Minus, Equal } from 'lucide-react';
import { DREConfigAccount } from '../../types/DREConfig';
import { Category, Indicator } from '../../types/financial';
import { Company } from '../../types/company';
import { supabase } from '../../lib/supabase';
import { Notification } from '../Notification';

interface DREConfigAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount: DREConfigAccount | null;
  onSave: (account: DREConfigAccount) => void;
  selectedCompanyId: string;
  categories: Category[];
  indicators: Indicator[];
  parentAccounts: DREConfigAccount[];
}

export const DREConfigAccountModal = ({
  isOpen,
  onClose,
  editingAccount,
  onSave,
  selectedCompanyId,
  categories,
  indicators,
  parentAccounts
}: DREConfigAccountModalProps) => {
  const [accountType, setAccountType] = useState<'category' | 'calculated' | 'total' | 'flex'>('category');
  const [categoryType, setCategoryType] = useState<'revenue' | 'expense'>('revenue');
  const [accountName, setAccountName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedParentAccount, setSelectedParentAccount] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [blankAccountSign, setBlankAccountSign] = useState<'positive' | 'negative'>('positive');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (editingAccount) {
      setAccountType(editingAccount.type === 'revenue' || editingAccount.type === 'expense' ? 'category' : editingAccount.type);
      setCategoryType(editingAccount.type as 'revenue' | 'expense');
      setAccountName(editingAccount.name);
      setSelectedCategories(editingAccount.categoryIds || []);
      setSelectedIndicator(editingAccount.indicatorId || null);
      setSelectedAccounts(editingAccount.selectedAccounts || []);
      setSelectedParentAccount(editingAccount.parentAccountId || null);
      setBlankAccountSign(editingAccount.sign || 'positive');
      setAccountId(editingAccount.id);
      
      if (editingAccount.id) {
        fetchSelectedCompanies(editingAccount.id);
      }
    } else {
      resetForm();
    }
  }, [editingAccount]);

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
    }
  };

  const fetchSelectedCompanies = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('dre_config_account_companies')
        .select('company_id')
        .eq('account_id', accountId)
        .eq('is_active', true);

      if (error) throw error;
      setSelectedCompanies(data.map(item => item.company_id));
    } catch (err) {
      console.error('Erro ao carregar empresas selecionadas:', err);
    }
  };

  const resetForm = () => {
    setAccountType('category');
    setCategoryType('revenue');
    setAccountName('');
    setSelectedCategories([]);
    setSelectedIndicator(null);
    setSelectedAccounts([]);
    setSelectedParentAccount(null);
    setCategorySearch('');
    setIndicatorSearch('');
    setBlankAccountSign('positive');
    setSelectedCompanies([]);
    setAccountId(null);
    setCustomName('');
  };

  const handleSaveComponent = async (componentId: string, customName: string) => {
    try {
      const { error } = await supabase
        .from('contas_dre_componentes')
        .update({ nome_exibicao: customName })
        .eq('id', componentId);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar nome personalizado:', err);
      throw err;
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyId) {
      setNotification({ type: 'error', message: 'Selecione uma empresa antes de criar ou editar uma conta' });
      return;
    }

    try {
      let data;
      if (editingAccount?.id) {
        const { data: updatedAccount, error } = await supabase
          .from('dre_config_accounts')
          .update({
            name: accountName,
            type: accountType === 'category' ? categoryType : accountType,
            category_ids: accountType === 'category' ? selectedCategories : null,
            indicator_id: accountType === 'calculated' ? selectedIndicator : null,
            selected_accounts: accountType === 'total' ? selectedAccounts : null,
            parent_account_id: selectedParentAccount || null,
            sign: accountType === 'flex' ? blankAccountSign : null
          })
          .eq('id', editingAccount.id)
          .select()
          .single();

        if (error) throw error;
        data = updatedAccount;
      } else {
        const { data: newAccount, error: insertError } = await supabase
          .from('dre_config_accounts')
          .insert([{
            name: accountName,
            type: accountType === 'category' ? categoryType : accountType,
            category_ids: accountType === 'category' ? selectedCategories : null,
            indicator_id: accountType === 'calculated' ? selectedIndicator : null,
            selected_accounts: accountType === 'total' ? selectedAccounts : null,
            parent_account_id: selectedParentAccount || null,
            sign: accountType === 'flex' ? blankAccountSign : null,
            is_active: true
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        data = newAccount;

        const { error: linkError } = await supabase
          .from('dre_config_account_companies')
          .insert({
            account_id: data.id,
            company_id: selectedCompanyId,
            is_active: true
          });

        if (linkError) throw linkError;
      }

      if (customName && data.id) {
        await handleSaveComponent(data.id, customName);
      }

      onSave(data);
      setNotification({ type: 'success', message: 'Conta salva com sucesso!' });
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erro ao salvar conta:', err);
      setNotification({ type: 'error', message: 'Erro ao salvar conta. Verifique se todos os campos estão preenchidos corretamente.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-zinc-100">
            {editingAccount ? 'Editar Conta' : 'Nova Conta'}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Nome da Conta
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              placeholder="Nome da conta"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Tipo de Conta
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={accountType === 'category'}
                  onChange={() => setAccountType('category')}
                  className="text-blue-600"
                />
                <span className="text-zinc-300">Categoria</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={accountType === 'calculated'}
                  onChange={() => setAccountType('calculated')}
                  className="text-blue-600"
                />
                <span className="text-zinc-300">Indicador</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={accountType === 'total'}
                  onChange={() => setAccountType('total')}
                  className="text-blue-600"
                />
                <span className="text-zinc-300">Totalizador</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={accountType === 'flex'}
                  onChange={() => setAccountType('flex')}
                  className="text-blue-600"
                />
                <span className="text-zinc-300">Flexível</span>
              </label>
            </div>
          </div>

          {accountType === 'category' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Tipo de Categoria
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={categoryType === 'revenue'}
                    onChange={() => setCategoryType('revenue')}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-300">Receita</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={categoryType === 'expense'}
                    onChange={() => setCategoryType('expense')}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-300">Despesa</span>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Categorias
                </label>
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Buscar categorias..."
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 mb-2"
                />
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories
                    .filter(c => 
                      c.type === categoryType &&
                      c.name.toLowerCase().includes(categorySearch.toLowerCase())
                    )
                    .map(category => (
                      <div key={category.id} className="flex flex-col gap-2 p-2 hover:bg-zinc-800 rounded-lg">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, category.id]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                              }
                            }}
                            className="text-blue-600"
                          />
                          <span className="text-zinc-300">{category.code} - {category.name}</span>
                        </label>
                        {selectedCategories.includes(category.id) && (
                          <input
                            type="text"
                            placeholder="Nome personalizado (opcional)"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="ml-6 px-3 py-1 bg-zinc-700 rounded text-zinc-300 text-sm"
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {accountType === 'calculated' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Indicador
              </label>
              <input
                type="text"
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                placeholder="Buscar indicadores..."
                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 mb-2"
              />
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {indicators
                  .filter(i => 
                    i.name.toLowerCase().includes(indicatorSearch.toLowerCase())
                  )
                  .map(indicator => (
                    <div key={indicator.id} className="flex flex-col gap-2 p-2 hover:bg-zinc-800 rounded-lg">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectedIndicator === indicator.id}
                          onChange={() => setSelectedIndicator(indicator.id)}
                          className="text-blue-600"
                        />
                        <span className="text-zinc-300">{indicator.code} - {indicator.name}</span>
                      </label>
                      {selectedIndicator === indicator.id && (
                        <input
                          type="text"
                          placeholder="Nome personalizado (opcional)"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="ml-6 px-3 py-1 bg-zinc-700 rounded text-zinc-300 text-sm"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {accountType === 'total' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Contas para Totalizar
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {parentAccounts
                  .filter(acc => 
                    acc.type !== 'total' &&
                    acc.type !== 'flex'
                  )
                  .map(account => (
                    <label key={account.id} className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                          }
                        }}
                        className="text-blue-600"
                      />
                      <span className="text-zinc-300">{account.code} - {account.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {accountType === 'flex' && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Sinal da Conta
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={blankAccountSign === 'positive'}
                    onChange={() => setBlankAccountSign('positive')}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-300">Positivo (+)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={blankAccountSign === 'negative'}
                    onChange={() => setBlankAccountSign('negative')}
                    className="text-blue-600"
                  />
                  <span className="text-zinc-300">Negativo (-)</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Conta Pai (Opcional)
            </label>
            <select
              value={selectedParentAccount || ''}
              onChange={(e) => setSelectedParentAccount(e.target.value || null)}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="">Nenhuma (Conta Principal)</option>
              {parentAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!accountName || (accountType === 'category' && selectedCategories.length === 0) || (accountType === 'calculated' && !selectedIndicator) || (accountType === 'total' && selectedAccounts.length === 0)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingAccount ? 'Salvar' : 'Adicionar'}
            </button>
          </div>

          {accountId && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Empresas
              </label>
              <div className="flex flex-wrap gap-2">
                {companies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => handleToggleCompany(company.id)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      selectedCompanies.includes(company.id)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700/50 text-zinc-400'
                    }`}
                  >
                    {company.trading_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { DREConfigAccountModal }
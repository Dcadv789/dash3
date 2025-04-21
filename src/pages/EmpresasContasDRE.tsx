import React, { useState, useEffect } from 'react';
import { Copy, ChevronDown, ChevronRight, Plus, Minus, Equal } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  trading_name: string;
}

interface DREAccount {
  id: string;
  nome: string;
  tipo: 'simples' | 'composta' | 'formula' | 'indicador' | 'soma_indicadores';
  simbolo: '+' | '-' | '=' | null;
  ordem_padrao: number;
  visivel: boolean;
  isSelected?: boolean;
  contas_secundarias?: DRESecondaryAccount[];
  componentes?: DREComponent[];
}

interface DRESecondaryAccount {
  id: string;
  nome: string;
  ordem: number;
  isSelected?: boolean;
  componentes?: DREComponent[];
}

interface DREComponent {
  id: string;
  referencia_tipo: 'categoria' | 'indicador';
  referencia_id: string;
  peso: number;
  ordem: number;
  isSelected?: boolean;
  categoria?: {
    name: string;
    code: string;
  };
  indicador?: {
    name: string;
    code: string;
  };
}

export const EmpresasContasDRE = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [contas, setContas] = useState<DREAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      setLoading(true);
      fetchContas();
    } else {
      setLoading(false);
      setContas([]);
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, trading_name')
        .eq('is_active', true)
        .order('trading_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      setError('Erro ao carregar empresas');
      console.error('Erro:', err);
    }
  };

  const fetchContas = async () => {
    try {
      const { data: mainAccounts, error: mainError } = await supabase
        .from('contas_dre_modelo')
        .select(`
          *,
          contas_secundarias:dre_contas_secundarias(
            id,
            nome,
            ordem,
            componentes:contas_dre_componentes(
              id,
              referencia_tipo,
              referencia_id,
              peso,
              ordem,
              categoria:categories!contas_dre_componentes_referencia_id_fkey(name, code),
              indicador:indicators(name, code)
            )
          ),
          componentes:contas_dre_componentes(
            id,
            referencia_tipo,
            referencia_id,
            peso,
            ordem,
            categoria:categories!contas_dre_componentes_referencia_id_fkey(name, code),
            indicador:indicators(name, code)
          )
        `)
        .order('ordem_padrao');

      if (mainError) throw mainError;

      // Fetch existing selections for the company
      const { data: empresaContas, error: empresaError } = await supabase
        .from('dre_empresa_componentes')
        .select('*')
        .eq('empresa_id', selectedCompanyId);

      if (empresaError) throw empresaError;

      const processedAccounts = mainAccounts?.map(account => ({
        ...account,
        isSelected: empresaContas?.some(ec => ec.dre_conta_principal_id === account.id) || false,
        contas_secundarias: account.contas_secundarias?.map(secondary => ({
          ...secondary,
          isSelected: empresaContas?.some(ec => 
            ec.dre_conta_principal_id === account.id && 
            ec.dre_conta_secundaria_id === secondary.id
          ) || false,
          componentes: secondary.componentes?.map(comp => ({
            ...comp,
            isSelected: empresaContas?.some(ec =>
              ec.dre_conta_principal_id === account.id &&
              ec.dre_conta_secundaria_id === secondary.id &&
              ec.componente_id === comp.id
            ) || false
          }))
        })),
        componentes: account.componentes?.map(comp => ({
          ...comp,
          isSelected: empresaContas?.some(ec =>
            ec.dre_conta_principal_id === account.id &&
            ec.componente_id === comp.id
          ) || false
        }))
      }));

      setContas(processedAccounts || []);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
      setError('Erro ao carregar contas do DRE');
    } finally {
      setLoading(false);
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

  const toggleMainAccount = async (accountId: string) => {
    try {
      const account = contas.find(c => c.id === accountId);
      if (!account) return;

      if (account.isSelected) {
        // Remove account and all its components
        const { error } = await supabase
          .from('dre_empresa_componentes')
          .delete()
          .eq('empresa_id', selectedCompanyId)
          .eq('dre_conta_principal_id', accountId);

        if (error) throw error;
      } else {
        // Add account and its direct components
        const componentsToAdd = account.componentes?.map(comp => ({
          empresa_id: selectedCompanyId,
          dre_conta_principal_id: accountId,
          componente_id: comp.id
        })) || [];

        if (componentsToAdd.length > 0) {
          const { error } = await supabase
            .from('dre_empresa_componentes')
            .insert(componentsToAdd);

          if (error) throw error;
        }
      }

      await fetchContas();
    } catch (err) {
      console.error('Erro ao alterar seleção da conta:', err);
      setError('Erro ao alterar seleção da conta');
    }
  };

  const toggleSecondaryAccount = async (mainAccountId: string, secondaryId: string) => {
    try {
      const mainAccount = contas.find(c => c.id === mainAccountId);
      const secondary = mainAccount?.contas_secundarias?.find(s => s.id === secondaryId);
      if (!mainAccount || !secondary) return;

      if (secondary.isSelected) {
        // Remove secondary account and its components
        const { error } = await supabase
          .from('dre_empresa_componentes')
          .delete()
          .eq('empresa_id', selectedCompanyId)
          .eq('dre_conta_principal_id', mainAccountId)
          .eq('dre_conta_secundaria_id', secondaryId);

        if (error) throw error;
      } else {
        // Add secondary account and its components
        const componentsToAdd = secondary.componentes?.map(comp => ({
          empresa_id: selectedCompanyId,
          dre_conta_principal_id: mainAccountId,
          dre_conta_secundaria_id: secondaryId,
          componente_id: comp.id
        })) || [];

        if (componentsToAdd.length > 0) {
          const { error } = await supabase
            .from('dre_empresa_componentes')
            .insert(componentsToAdd);

          if (error) throw error;
        }
      }

      await fetchContas();
    } catch (err) {
      console.error('Erro ao alterar seleção da conta secundária:', err);
      setError('Erro ao alterar seleção da conta secundária');
    }
  };

  const toggleComponent = async (mainAccountId: string, componentId: string, secondaryId?: string) => {
    try {
      const mainAccount = contas.find(c => c.id === mainAccountId);
      if (!mainAccount) return;

      let component;
      if (secondaryId) {
        component = mainAccount.contas_secundarias
          ?.find(s => s.id === secondaryId)
          ?.componentes?.find(c => c.id === componentId);
      } else {
        component = mainAccount.componentes?.find(c => c.id === componentId);
      }

      if (!component) return;

      const query = supabase
        .from('dre_empresa_componentes')
        .delete()
        .eq('empresa_id', selectedCompanyId)
        .eq('dre_conta_principal_id', mainAccountId)
        .eq('componente_id', componentId);

      // Only add the secondary account condition if it exists
      if (secondaryId) {
        query.eq('dre_conta_secundaria_id', secondaryId);
      } else {
        query.is('dre_conta_secundaria_id', null);
      }

      if (component.isSelected) {
        // Remove component
        const { error } = await query;
        if (error) throw error;
      } else {
        // Add component
        const { error } = await supabase
          .from('dre_empresa_componentes')
          .insert({
            empresa_id: selectedCompanyId,
            dre_conta_principal_id: mainAccountId,
            dre_conta_secundaria_id: secondaryId || null,
            componente_id: componentId
          });

        if (error) throw error;
      }

      await fetchContas();
    } catch (err) {
      console.error('Erro ao alterar seleção do componente:', err);
      setError('Erro ao alterar seleção do componente');
    }
  };

  const getSymbolIcon = (simbolo: string | null) => {
    switch (simbolo) {
      case '+': return <Plus size={16} className="text-green-400" />;
      case '-': return <Minus size={16} className="text-red-400" />;
      default: return <Equal size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">DRE por Empresa</h1>
          <p className="text-zinc-400 mt-1">Configure as contas do DRE para cada empresa</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="w-full md:w-96">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Empresa
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
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
      </div>

      {loading ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando...</p>
        </div>
      ) : selectedCompanyId ? (
        <div className="space-y-4">
          {contas.map(conta => (
            <div key={conta.id} className="bg-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAccountExpansion(conta.id)}
                    className="p-1 hover:bg-zinc-800 rounded-lg"
                  >
                    {expandedAccounts.has(conta.id) ? (
                      <ChevronDown size={20} className="text-zinc-400" />
                    ) : (
                      <ChevronRight size={20} className="text-zinc-400" />
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    {getSymbolIcon(conta.simbolo)}
                    <span className="text-zinc-100 font-medium">{conta.nome}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleMainAccount(conta.id)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    conta.isSelected
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {conta.isSelected ? 'Selecionada' : 'Selecionar'}
                </button>
              </div>

              {expandedAccounts.has(conta.id) && (
                <div className="mt-4 ml-8 space-y-4">
                  {/* Componentes diretos */}
                  {conta.componentes?.map(componente => (
                    <div key={componente.id} className="bg-zinc-800/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 font-mono text-sm">
                            {componente.referencia_tipo === 'categoria'
                              ? componente.categoria?.code
                              : componente.indicador?.code}
                          </span>
                          <span className="text-zinc-100">
                            {componente.referencia_tipo === 'categoria'
                              ? componente.categoria?.name
                              : componente.indicador?.name}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleComponent(conta.id, componente.id)}
                          className={`px-2 py-1 rounded text-sm ${
                            componente.isSelected
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                          }`}
                        >
                          {componente.isSelected ? 'Selecionado' : 'Selecionar'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Contas secundárias */}
                  {conta.contas_secundarias?.map(secundaria => (
                    <div key={secundaria.id} className="bg-zinc-800/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-zinc-100 font-medium">{secundaria.nome}</span>
                        <button
                          onClick={() => toggleSecondaryAccount(conta.id, secundaria.id)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            secundaria.isSelected
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                          }`}
                        >
                          {secundaria.isSelected ? 'Selecionada' : 'Selecionar'}
                        </button>
                      </div>

                      {/* Componentes da conta secundária */}
                      <div className="space-y-2 ml-4">
                        {secundaria.componentes?.map(componente => (
                          <div key={componente.id} className="bg-zinc-800/30 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-400 font-mono text-sm">
                                  {componente.referencia_tipo === 'categoria'
                                    ? componente.categoria?.code
                                    : componente.indicador?.code}
                                </span>
                                <span className="text-zinc-100">
                                  {componente.referencia_tipo === 'categoria'
                                    ? componente.categoria?.name
                                    : componente.indicador?.name}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleComponent(conta.id, componente.id, secundaria.id)}
                                className={`px-2 py-1 rounded text-sm ${
                                  componente.isSelected
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                                }`}
                              >
                                {componente.isSelected ? 'Selecionado' : 'Selecionar'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Selecione uma empresa para configurar o DRE</p>
        </div>
      )}
    </div>
  );
};
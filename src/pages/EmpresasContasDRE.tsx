import React, { useState, useEffect } from 'react';
import { Copy, ChevronDown, ChevronRight, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  trading_name: string;
  name: string;
}

interface DreConta {
  id: string;
  nome: string;
  tipo: 'simples' | 'composta' | 'formula' | 'indicador' | 'soma_indicadores';
  simbolo: '+' | '-' | '=' | null;
  ordem_padrao: number;
  visivel: boolean;
}

interface DreContaSecundaria {
  id: string;
  nome: string;
  dre_conta_principal_id: string;
  ordem: number;
}

interface DreComponente {
  id: string;
  conta_dre_modelo_id: string;
  dre_conta_secundaria_id: string | null;
  referencia_tipo: 'categoria' | 'indicador';
  referencia_id: string;
  peso: number;
  ordem: number;
  referencia_nome?: string;
}

interface DreEmpresaComponente {
  id: string;
  empresa_id: string;
  dre_conta_principal_id: string | null;
  dre_conta_secundaria_id: string | null;
  componente_id: string;
}

interface ContaExpandida extends DreConta {
  isExpanded?: boolean;
  componentesDiretos: DreComponente[];
  contasSecundarias: ContaSecundariaExpandida[];
}

interface ContaSecundariaExpandida extends DreContaSecundaria {
  isExpanded?: boolean;
  componentes: DreComponente[];
}

export const EmpresasContasDRE = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [contas, setContas] = useState<ContaExpandida[]>([]);
  const [empresaComponentes, setEmpresaComponentes] = useState<DreEmpresaComponente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromCompanyId, setCopyFromCompanyId] = useState<string>('');
  const [copyToCompanyId, setCopyToCompanyId] = useState<string>('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      setLoading(true); // Ativar loading ao selecionar empresa
      fetchContas();
      fetchEmpresaComponentes();
    } else {
      setLoading(false); // Desativar loading quando não há empresa selecionada
      setContas([]); // Limpar contas
      setEmpresaComponentes([]); // Limpar componentes
    }
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
      setError('Erro ao carregar empresas');
      console.error('Erro:', err);
    }
  };

  const fetchContas = async () => {
    try {
      // Buscar contas principais
      const { data: contasData, error: contasError } = await supabase
        .from('contas_dre_modelo')
        .select('*')
        .order('ordem_padrao');

      if (contasError) throw contasError;

      // Buscar contas secundárias
      const { data: secundariasData, error: secundariasError } = await supabase
        .from('dre_contas_secundarias')
        .select('*')
        .order('ordem');

      if (secundariasError) throw secundariasError;

      // Buscar componentes
      const { data: componentesData, error: componentesError } = await supabase
        .from('contas_dre_componentes')
        .select(`
          *,
          categoria:categories(name),
          indicador:indicators(name)
        `);

      if (componentesError) throw componentesError;

      // Processar componentes para incluir nome da referência
      const componentesProcessados = componentesData.map(comp => ({
        ...comp,
        referencia_nome: comp.referencia_tipo === 'categoria' 
          ? comp.categoria?.name 
          : comp.indicador?.name
      }));

      // Montar estrutura hierárquica
      const contasExpandidas: ContaExpandida[] = contasData.map(conta => {
        const contasSecundarias = secundariasData
          .filter(sec => sec.dre_conta_principal_id === conta.id)
          .map(sec => ({
            ...sec,
            isExpanded: true,
            componentes: componentesProcessados.filter(
              comp => comp.dre_conta_secundaria_id === sec.id
            )
          }));

        const componentesDiretos = componentesProcessados.filter(
          comp => comp.conta_dre_modelo_id === conta.id && !comp.dre_conta_secundaria_id
        );

        return {
          ...conta,
          isExpanded: true,
          componentesDiretos,
          contasSecundarias
        };
      });

      setContas(contasExpandidas);
    } catch (err) {
      setError('Erro ao carregar estrutura do DRE');
      console.error('Erro:', err);
    }
  };

  const fetchEmpresaComponentes = async () => {
    try {
      const { data, error } = await supabase
        .from('dre_empresa_componentes')
        .select('*')
        .eq('empresa_id', selectedCompanyId)
        .eq('is_active', true);

      if (error) throw error;
      setEmpresaComponentes(data || []);
    } catch (err) {
      setError('Erro ao carregar componentes da empresa');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComponente = async (
    componenteId: string,
    contaPrincipalId: string | null = null,
    contaSecundariaId: string | null = null
  ) => {
    try {
      const existingComponente = empresaComponentes.find(
        ec => ec.componente_id === componenteId &&
             ec.dre_conta_principal_id === contaPrincipalId &&
             ec.dre_conta_secundaria_id === contaSecundariaId
      );

      if (existingComponente) {
        // Remover componente
        const { error } = await supabase
          .from('dre_empresa_componentes')
          .delete()
          .eq('id', existingComponente.id);

        if (error) throw error;

        setEmpresaComponentes(empresaComponentes.filter(ec => ec.id !== existingComponente.id));
      } else {
        // Adicionar componente
        const { data, error } = await supabase
          .from('dre_empresa_componentes')
          .insert({
            empresa_id: selectedCompanyId,
            dre_conta_principal_id: contaPrincipalId,
            dre_conta_secundaria_id: contaSecundariaId,
            componente_id: componenteId,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        setEmpresaComponentes([...empresaComponentes, data]);
      }

      setSuccess('Configuração atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao atualizar componente');
      console.error('Erro:', err);
    }
  };

  const handleCopyStructure = async () => {
    if (!copyFromCompanyId || !copyToCompanyId) return;

    try {
      setLoading(true);

      // Buscar componentes da empresa origem
      const { data: sourceComponents, error: sourceError } = await supabase
        .from('dre_empresa_componentes')
        .select('*')
        .eq('empresa_id', copyFromCompanyId)
        .eq('is_active', true);

      if (sourceError) throw sourceError;

      // Remover componentes existentes da empresa destino
      const { error: deleteError } = await supabase
        .from('dre_empresa_componentes')
        .delete()
        .eq('empresa_id', copyToCompanyId);

      if (deleteError) throw deleteError;

      // Inserir novos componentes
      if (sourceComponents && sourceComponents.length > 0) {
        const newComponents = sourceComponents.map(comp => ({
          empresa_id: copyToCompanyId,
          dre_conta_principal_id: comp.dre_conta_principal_id,
          dre_conta_secundaria_id: comp.dre_conta_secundaria_id,
          componente_id: comp.componente_id,
          is_active: true
        }));

        const { error: insertError } = await supabase
          .from('dre_empresa_componentes')
          .insert(newComponents);

        if (insertError) throw insertError;
      }

      setShowCopyModal(false);
      setCopyFromCompanyId('');
      setCopyToCompanyId('');
      setSuccess('Estrutura copiada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

      if (selectedCompanyId === copyToCompanyId) {
        await fetchEmpresaComponentes();
      }
    } catch (err) {
      setError('Erro ao copiar estrutura');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const isComponenteSelected = (
    componenteId: string,
    contaPrincipalId: string | null = null,
    contaSecundariaId: string | null = null
  ): boolean => {
    return empresaComponentes.some(
      ec => ec.componente_id === componenteId &&
           ec.dre_conta_principal_id === contaPrincipalId &&
           ec.dre_conta_secundaria_id === contaSecundariaId
    );
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

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">DRE por Empresa</h1>
          <p className="text-zinc-400 mt-1">Configure as contas do DRE para cada empresa</p>
        </div>
        <button
          onClick={() => setShowCopyModal(true)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-2"
        >
          <Copy size={20} />
          Copiar Estrutura
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <Check size={20} className="text-green-400" />
          <p className="text-green-400">{success}</p>
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

      {selectedCompanyId ? (
        <div className="space-y-4">
          {contas.map(conta => (
            <div key={conta.id} className="bg-zinc-900 rounded-xl p-6">
              {/* Conta Principal */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setContas(contas.map(c => 
                    c.id === conta.id ? { ...c, isExpanded: !c.isExpanded } : c
                  ))}
                  className="p-1 hover:bg-zinc-800 rounded-lg"
                >
                  {conta.isExpanded ? (
                    <ChevronDown size={20} className="text-zinc-400" />
                  ) : (
                    <ChevronRight size={20} className="text-zinc-400" />
                  )}
                </button>
                <span className="text-zinc-100 font-medium">{conta.nome}</span>
              </div>

              {conta.isExpanded && (
                <div className="ml-8 space-y-4">
                  {/* Componentes Diretos */}
                  {conta.componentesDiretos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">Componentes Diretos</h4>
                      {conta.componentesDiretos.map(componente => (
                        <label
                          key={componente.id}
                          className="flex items-center gap-2 p-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isComponenteSelected(componente.id, conta.id)}
                            onChange={() => handleToggleComponente(componente.id, conta.id)}
                            className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                          />
                          <span className="text-zinc-300">
                            {componente.referencia_nome}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Contas Secundárias */}
                  {conta.contasSecundarias.map(secundaria => (
                    <div key={secundaria.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setContas(contas.map(c => ({
                            ...c,
                            contasSecundarias: c.id === conta.id
                              ? c.contasSecundarias.map(s => 
                                  s.id === secundaria.id 
                                    ? { ...s, isExpanded: !s.isExpanded }
                                    : s
                                )
                              : c.contasSecundarias
                          })))}
                          className="p-1 hover:bg-zinc-800 rounded-lg"
                        >
                          {secundaria.isExpanded ? (
                            <ChevronDown size={16} className="text-zinc-400" />
                          ) : (
                            <ChevronRight size={16} className="text-zinc-400" />
                          )}
                        </button>
                        <span className="text-zinc-200">{secundaria.nome}</span>
                      </div>

                      {secundaria.isExpanded && (
                        <div className="ml-6 space-y-2">
                          {secundaria.componentes.map(componente => (
                            <label
                              key={componente.id}
                              className="flex items-center gap-2 p-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isComponenteSelected(componente.id, null, secundaria.id)}
                                onChange={() => handleToggleComponente(componente.id, null, secundaria.id)}
                                className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                              />
                              <span className="text-zinc-300">
                                {componente.referencia_nome}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
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

      {/* Modal de Cópia */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-zinc-100">Copiar Estrutura</h3>
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyFromCompanyId('');
                  setCopyToCompanyId('');
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Copiar de:
                </label>
                <select
                  value={copyFromCompanyId}
                  onChange={(e) => setCopyFromCompanyId(e.target.value)}
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
                  Copiar para:
                </label>
                <select
                  value={copyToCompanyId}
                  onChange={(e) => setCopyToCompanyId(e.target.value)}
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

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyFromCompanyId('');
                  setCopyToCompanyId('');
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyStructure}
                disabled={!copyFromCompanyId || !copyToCompanyId || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Copiando...' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
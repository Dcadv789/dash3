import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, Save } from 'lucide-react';
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
  ordem_padrao: number;
  visivel: boolean;
}

interface EmpresaConta {
  id: string;
  empresa_id: string;
  conta_dre_modelo_id: string;
  ordem: number;
  visivel: boolean;
}

export const EmpresasContasDRE = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [dreContas, setDreContas] = useState<DreConta[]>([]);
  const [empresasContas, setEmpresasContas] = useState<EmpresaConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
    fetchDreContas();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmpresasContas();
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

  const fetchDreContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_dre_modelo')
        .select('*')
        .order('ordem_padrao');

      if (error) throw error;
      setDreContas(data || []);
    } catch (err) {
      setError('Erro ao carregar contas do DRE');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresasContas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas_contas_dre')
        .select('*')
        .eq('empresa_id', selectedCompanyId);

      if (error) throw error;
      setEmpresasContas(data || []);
    } catch (err) {
      setError('Erro ao carregar configurações da empresa');
      console.error('Erro:', err);
    }
  };

  const handleToggleConta = async (contaId: string, checked: boolean) => {
    try {
      setSaving(true);
      const existingConta = empresasContas.find(
        ec => ec.conta_dre_modelo_id === contaId
      );

      if (checked && !existingConta) {
        // Criar nova relação
        const { error } = await supabase
          .from('empresas_contas_dre')
          .insert({
            empresa_id: selectedCompanyId,
            conta_dre_modelo_id: contaId,
            ordem: dreContas.find(c => c.id === contaId)?.ordem_padrao || 0,
            visivel: true
          });

        if (error) throw error;
      } else if (!checked && existingConta) {
        // Atualizar visibilidade
        const { error } = await supabase
          .from('empresas_contas_dre')
          .update({ visivel: false })
          .eq('id', existingConta.id);

        if (error) throw error;
      }

      await fetchEmpresasContas();
      setSuccess('Configuração atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao atualizar configuração');
      console.error('Erro:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleOrderChange = async (contaId: string, newOrder: number) => {
    try {
      setSaving(true);
      const existingConta = empresasContas.find(
        ec => ec.conta_dre_modelo_id === contaId
      );

      if (existingConta) {
        const { error } = await supabase
          .from('empresas_contas_dre')
          .update({ ordem: newOrder })
          .eq('id', existingConta.id);

        if (error) throw error;

        await fetchEmpresasContas();
        setSuccess('Ordem atualizada com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Erro ao atualizar ordem');
      console.error('Erro:', err);
    } finally {
      setSaving(false);
    }
  };

  const isContaActive = (contaId: string): boolean => {
    const empresaConta = empresasContas.find(
      ec => ec.conta_dre_modelo_id === contaId
    );
    return empresaConta?.visivel || false;
  };

  const getContaOrder = (contaId: string): number => {
    const empresaConta = empresasContas.find(
      ec => ec.conta_dre_modelo_id === contaId
    );
    return empresaConta?.ordem || 0;
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
          <h1 className="text-2xl font-bold text-zinc-100">Configuração de DRE por Empresa</h1>
          <p className="text-zinc-400 mt-1">Gerencie quais contas do DRE cada empresa utiliza</p>
        </div>
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
          {dreContas.map(conta => (
            <div key={conta.id} className="bg-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isContaActive(conta.id)}
                      onChange={(e) => handleToggleConta(conta.id, e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                    />
                    <span className="text-zinc-100 font-medium">{conta.nome}</span>
                  </label>
                  <span className="text-sm text-zinc-500">
                    Tipo: {conta.tipo}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Ordem
                    </label>
                    <input
                      type="number"
                      value={getContaOrder(conta.id)}
                      onChange={(e) => handleOrderChange(conta.id, parseInt(e.target.value))}
                      className="w-full px-3 py-1 bg-zinc-800 rounded text-zinc-100 text-sm"
                      disabled={!isContaActive(conta.id)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Selecione uma empresa para configurar o DRE</p>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Save size={16} className="animate-spin" />
          Salvando...
        </div>
      )}
    </div>
  );
};
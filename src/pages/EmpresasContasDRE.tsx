import React, { useState, useEffect } from 'react';
import { Copy, ChevronDown, ChevronRight, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  trading_name: string;
}

export const EmpresasContasDRE = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromCompanyId, setCopyFromCompanyId] = useState<string>('');
  const [copyToCompanyId, setCopyToCompanyId] = useState<string>('');

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
      const { data, error } = await supabase
        .from('contas_dre_modelo')
        .select('*')
        .order('ordem_padrao');

      if (error) throw error;
      setContas(data || []);
    } catch (err) {
      setError('Erro ao carregar contas');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

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
                <span className="text-zinc-100">{conta.nome}</span>
              </div>
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
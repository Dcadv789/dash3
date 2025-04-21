import React, { useState, useEffect } from 'react';
import { Plus, Search, SlidersHorizontal, Calculator, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category, Indicator } from '../types/financial';

interface Company {
  id: string;
  trading_name: string;
  name: string;
  is_active: boolean;
}

interface CompanyIndicator {
  id: string;
  company_id: string;
  indicator_id: string;
  is_active: boolean;
}

const OPERATION_LABELS = {
  sum: 'Soma',
  subtract: 'Subtração',
  multiply: 'Multiplicação',
  divide: 'Divisão'
};

export const Indicators = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [companyIndicators, setCompanyIndicators] = useState<CompanyIndicator[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewIndicatorModal, setShowNewIndicatorModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'manual' | 'calculated'>('all');

  useEffect(() => {
    fetchCompanies();
    fetchIndicators();
    fetchCompanyIndicators();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, trading_name, name, is_active')
        .eq('is_active', true)
        .order('trading_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas');
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
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyIndicators = async () => {
    try {
      const { data, error } = await supabase
        .from('company_indicators')
        .select('*');

      if (error) throw error;
      setCompanyIndicators(data || []);
    } catch (err) {
      console.error('Erro ao carregar indicadores das empresas:', err);
      setError('Erro ao carregar indicadores das empresas');
    }
  };

  const getIndicatorStatus = (indicatorId: string, companyId: string): boolean => {
    return companyIndicators.some(ci => 
      ci.indicator_id === indicatorId && 
      ci.company_id === companyId
    );
  };

  const handleToggleIndicatorStatus = async (indicatorId: string, companyId: string) => {
    try {
      const existingLink = companyIndicators.find(
        ci => ci.indicator_id === indicatorId && ci.company_id === companyId
      );

      if (existingLink) {
        const { error } = await supabase
          .from('company_indicators')
          .delete()
          .eq('indicator_id', indicatorId)
          .eq('company_id', companyId);

        if (error) throw error;
        setCompanyIndicators(companyIndicators.filter(
          ci => !(ci.indicator_id === indicatorId && ci.company_id === companyId)
        ));
      } else {
        const { data, error } = await supabase
          .from('company_indicators')
          .insert([{
            company_id: companyId,
            indicator_id: indicatorId,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;
        setCompanyIndicators([...companyIndicators, data]);
      }
    } catch (err) {
      console.error('Erro ao alterar status do indicador:', err);
      setError('Erro ao alterar status do indicador');
    }
  };

  const handleDeleteIndicator = async (indicatorId: string) => {
    if (!confirm('Tem certeza que deseja excluir este indicador?')) return;

    try {
      const { error } = await supabase
        .from('indicators')
        .delete()
        .eq('id', indicatorId);

      if (error) throw error;

      setIndicators(indicators.filter(ind => ind.id !== indicatorId));
      setCompanyIndicators(companyIndicators.filter(ci => ci.indicator_id !== indicatorId));
    } catch (err) {
      console.error('Erro ao excluir indicador:', err);
      setError('Erro ao excluir indicador');
    }
  };

  const filteredIndicators = indicators.filter(indicator => {
    const matchesCompany = selectedCompanyId
      ? companyIndicators.some(ci => 
          ci.indicator_id === indicator.id && 
          ci.company_id === selectedCompanyId
        )
      : true;

    const matchesSearch = searchTerm.toLowerCase() === '' ? true : 
      indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicator.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' ? true :
      indicator.type === selectedType;

    return matchesCompany && matchesSearch && matchesType;
  });

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
          <h1 className="text-2xl font-bold text-zinc-100">Indicadores</h1>
          <p className="text-zinc-400 mt-1">Gerencie os indicadores financeiros por empresa</p>
        </div>
        <button 
          onClick={() => setShowNewIndicatorModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Indicador
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar indicadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={20} className="text-zinc-400" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 min-w-[200px] appearance-none"
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

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg ${
                selectedType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedType('manual')}
              className={`px-4 py-2 rounded-lg ${
                selectedType === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setSelectedType('calculated')}
              className={`px-4 py-2 rounded-lg ${
                selectedType === 'calculated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Calculado
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Código</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Indicador</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Cálculo</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredIndicators.map((indicator) => (
                <tr key={indicator.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <span className="text-zinc-400 font-mono">{indicator.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <p className="text-zinc-100">{indicator.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {companies.map(company => (
                          <button
                            key={company.id}
                            onClick={() => handleToggleIndicatorStatus(indicator.id, company.id)}
                            className={`px-2 py-1 rounded text-xs ${
                              getIndicatorStatus(indicator.id, company.id)
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-zinc-700 text-zinc-400'
                            }`}
                          >
                            {company.trading_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      indicator.type === 'manual'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {indicator.type === 'manual' ? 'Manual' : 'Calculado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {indicator.type === 'calculated' && (
                      <div className="flex items-center gap-2">
                        <Calculator size={16} className="text-zinc-500" />
                        <span>
                          {indicator.calculation_type === 'category' ? 'Categorias' : 'Indicadores'} - {OPERATION_LABELS[indicator.operation!]}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowNewIndicatorModal(true)}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteIndicator(indicator.id)}
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
    </div>
  );
};
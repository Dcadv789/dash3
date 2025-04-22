import React, { useState, useEffect } from 'react';
import { Plus, Search, SlidersHorizontal, Calculator, Edit, Trash2, Power, Building2, X, Check } from 'lucide-react';
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
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'manual' | 'calculated'>('all');
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);

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

  const handleCreateIndicator = async () => {
    try {
      // Encontrar o próximo código disponível
      const existingCodes = indicators
        .map(i => parseInt(i.code.replace('I', '')))
        .sort((a, b) => a - b);
      
      let nextCode = 1;
      for (const code of existingCodes) {
        if (code !== nextCode) break;
        nextCode++;
      }
      
      const formattedCode = `I${String(nextCode).padStart(4, '0')}`;
      
      setEditingIndicator({
        id: '',
        code: formattedCode,
        name: 'Novo Indicador',
        type: 'manual',
        is_active: true,
        calculation_type: null,
        operation: null,
        source_ids: []
      });
      setShowIndicatorModal(true);
    } catch (err) {
      console.error('Erro ao criar indicador:', err);
      setError('Erro ao criar indicador');
    }
  };

  const handleSaveIndicator = async () => {
    if (!editingIndicator) return;

    try {
      if (editingIndicator.id) {
        // Atualizar indicador existente
        const { error } = await supabase
          .from('indicators')
          .update({
            name: editingIndicator.name,
            type: editingIndicator.type,
            calculation_type: editingIndicator.calculation_type,
            operation: editingIndicator.operation,
            source_ids: editingIndicator.source_ids,
            is_active: editingIndicator.is_active
          })
          .eq('id', editingIndicator.id);

        if (error) throw error;
      } else {
        // Criar novo indicador
        const { data, error } = await supabase
          .from('indicators')
          .insert([{
            code: editingIndicator.code,
            name: editingIndicator.name,
            type: editingIndicator.type,
            calculation_type: editingIndicator.calculation_type,
            operation: editingIndicator.operation,
            source_ids: editingIndicator.source_ids,
            is_active: editingIndicator.is_active
          }])
          .select()
          .single();

        if (error) throw error;
      }

      await fetchIndicators();
      setShowIndicatorModal(false);
      setEditingIndicator(null);
    } catch (err) {
      console.error('Erro ao salvar indicador:', err);
      setError('Erro ao salvar indicador');
    }
  };

  const handleToggleStatus = async (indicator: Indicator) => {
    try {
      const { error } = await supabase
        .from('indicators')
        .update({ is_active: !indicator.is_active })
        .eq('id', indicator.id);

      if (error) throw error;
      await fetchIndicators();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      setError('Erro ao alterar status');
    }
  };

  const handleToggleCompany = async (indicatorId: string, companyId: string) => {
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
      console.error('Erro ao alterar vínculo com empresa:', err);
      setError('Erro ao alterar vínculo com empresa');
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
          onClick={handleCreateIndicator}
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
                <tr key={indicator.id} className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${!indicator.is_active && 'opacity-50'}`}>
                  <td className="px-6 py-4">
                    <span className="text-zinc-400 font-mono">{indicator.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <p className="text-zinc-100">{indicator.name}</p>
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
                        onClick={() => {
                          setSelectedIndicator(indicator);
                          setShowCompanyModal(true);
                        }}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
                        title="Selecionar Empresas"
                      >
                        <Building2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(indicator)}
                        className={`p-2 hover:bg-zinc-700 rounded-lg transition-colors ${
                          indicator.is_active ? 'text-green-400' : 'text-red-400'
                        }`}
                        title={indicator.is_active ? 'Desativar' : 'Ativar'}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingIndicator(indicator);
                          setShowIndicatorModal(true);
                        }}
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

      {/* Modal de Seleção de Empresas */}
      {showCompanyModal && selectedIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                Selecionar Empresas
              </h2>
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  setSelectedIndicator(null);
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {companies.map(company => (
                <label
                  key={company.id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={companyIndicators.some(
                      ci => ci.indicator_id === selectedIndicator.id && ci.company_id === company.id
                    )}
                    onChange={() => handleToggleCompany(selectedIndicator.id, company.id)}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                  />
                  <span className="text-zinc-300">{company.trading_name}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  setSelectedIndicator(null);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Criação de Indicador */}
      {showIndicatorModal && editingIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                {editingIndicator.id ? 'Editar Indicador' : 'Novo Indicador'}
              </h2>
              <button
                onClick={() => {
                  setShowIndicatorModal(false);
                  setEditingIndicator(null);
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={editingIndicator.code}
                  disabled
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100 opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editingIndicator.name}
                  onChange={(e) => setEditingIndicator({ ...editingIndicator, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo
                </label>
                <select
                  value={editingIndicator.type}
                  onChange={(e) => setEditingIndicator({
                    ...editingIndicator,
                    type: e.target.value as 'manual' | 'calculated',
                    calculation_type: e.target.value === 'manual' ? null : 'category',
                    operation: e.target.value === 'manual' ? null : 'sum'
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="manual">Manual</option>
                  <option value="calculated">Calculado</option>
                </select>
              </div>

              {editingIndicator.type === 'calculated' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Tipo de Cálculo
                    </label>
                    <select
                      value={editingIndicator.calculation_type || 'category'}
                      onChange={(e) => setEditingIndicator({
                        ...editingIndicator,
                        calculation_type: e.target.value as 'category' | 'indicator'
                      })}
                      className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                    >
                      <option value="category">Categorias</option>
                      <option value="indicator">Indicadores</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Operação
                    </label>
                    <select
                      value={editingIndicator.operation || 'sum'}
                      onChange={(e) => setEditingIndicator({
                        ...editingIndicator,
                        operation: e.target.value as 'sum' | 'subtract' | 'multiply' | 'divide'
                      })}
                      className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                    >
                      {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingIndicator.is_active}
                    onChange={(e) => setEditingIndicator({
                      ...editingIndicator,
                      is_active: e.target.checked
                    })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                  />
                  <span className="text-zinc-400">Indicador Ativo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowIndicatorModal(false);
                  setEditingIndicator(null);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveIndicator}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
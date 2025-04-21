import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingData?: {
    id: string;
    empresa_id: string;
    ano: number;
    mes: string;
    categoria_id: string | null;
    indicador_id: string | null;
    valor: number;
  } | null;
}

interface Company {
  id: string;
  trading_name: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Indicator {
  id: string;
  name: string;
  code: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ManualEntryModal = ({ isOpen, onClose, onSave, editingData }: ManualEntryModalProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    empresa_id: '',
    ano: new Date().getFullYear(),
    mes: MONTHS[new Date().getMonth()],
    tipo: 'categoria' as 'categoria' | 'indicador',
    referencia_id: '',
    valor: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      fetchCategories();
      fetchIndicators();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingData) {
      setFormData({
        empresa_id: editingData.empresa_id,
        ano: editingData.ano,
        mes: editingData.mes,
        tipo: editingData.categoria_id ? 'categoria' : 'indicador',
        referencia_id: editingData.categoria_id || editingData.indicador_id || '',
        valor: editingData.valor
      });
    }
  }, [editingData]);

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
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, code')
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
        .select('id, name, code')
        .order('code');

      if (error) throw error;
      setIndicators(data || []);
    } catch (err) {
      console.error('Erro ao carregar indicadores:', err);
      setError('Erro ao carregar indicadores');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        empresa_id: formData.empresa_id,
        ano: formData.ano,
        mes: formData.mes,
        categoria_id: formData.tipo === 'categoria' ? formData.referencia_id : null,
        indicador_id: formData.tipo === 'indicador' ? formData.referencia_id : null,
        valor: formData.valor
      };

      if (editingData) {
        const { error } = await supabase
          .from('dados_brutos')
          .update(payload)
          .eq('id', editingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dados_brutos')
          .insert([payload]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {editingData ? 'Editar Registro' : 'Novo Registro'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Empresa
            </label>
            <select
              value={formData.empresa_id}
              onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Ano
              </label>
              <input
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                min={2000}
                max={2100}
                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Mês
              </label>
              <select
                value={formData.mes}
                onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
              >
                {MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Tipo
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.tipo === 'categoria'}
                  onChange={() => setFormData({ ...formData, tipo: 'categoria', referencia_id: '' })}
                  className="text-blue-600"
                />
                <span className="text-zinc-300">Categoria</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.tipo === 'indicador'}
                  onChange={() => setFormData({ ...formData, tipo: 'indicador', referencia_id: '' })}
                  className="text-blue-600"
                />
                <span className="text-zinc-300">Indicador</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              {formData.tipo === 'categoria' ? 'Categoria' : 'Indicador'}
            </label>
            <select
              value={formData.referencia_id}
              onChange={(e) => setFormData({ ...formData, referencia_id: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="">Selecione...</option>
              {formData.tipo === 'categoria' ? (
                categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.code} - {category.name}
                  </option>
                ))
              ) : (
                indicators.map(indicator => (
                  <option key={indicator.id} value={indicator.id}>
                    {indicator.code} - {indicator.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Valor
            </label>
            <input
              type="number"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
              min={0}
              step="0.01"
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !formData.empresa_id || !formData.referencia_id || formData.valor <= 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
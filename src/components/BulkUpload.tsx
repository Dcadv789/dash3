import React, { useState } from 'react';
import { Upload, AlertCircle, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  trading_name: string;
}

interface UploadData {
  categoria_id?: string;
  indicador_id?: string;
  valor: number;
}

interface UploadResult {
  success: number;
  errors: number;
  data: {
    name: string;
    valor: number;
    error?: string;
  }[];
}

export const BulkUpload = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  React.useEffect(() => {
    fetchCompanies();
  }, []);

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

  const processFile = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<UploadData>(firstSheet);

          const results: UploadResult = {
            success: 0,
            errors: 0,
            data: []
          };

          // Buscar categorias e indicadores para validação
          const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type');

          const { data: indicators } = await supabase
            .from('indicators')
            .select('id, name');

          const categoriesMap = new Map(categories?.map(c => [c.id, c]) || []);
          const indicatorsMap = new Map(indicators?.map(i => [i.id, i]) || []);

          for (const row of rows) {
            try {
              // Validações
              if (!row.valor || row.valor <= 0) {
                throw new Error('Valor inválido');
              }

              if ((!row.categoria_id && !row.indicador_id) || (row.categoria_id && row.indicador_id)) {
                throw new Error('Deve ter apenas categoria OU indicador');
              }

              let finalValue = row.valor;
              let name = '';

              if (row.categoria_id) {
                const category = categoriesMap.get(row.categoria_id);
                if (!category) throw new Error('Categoria não encontrada');
                
                name = category.name;
                // Ajusta o sinal com base no tipo da categoria
                if (category.type === 'expense') {
                  finalValue = -row.valor;
                }
              } else if (row.indicador_id) {
                const indicator = indicatorsMap.get(row.indicador_id);
                if (!indicator) throw new Error('Indicador não encontrado');
                name = indicator.name;
              }

              // Inserir no banco
              const { error: insertError } = await supabase
                .from('dados_brutos')
                .insert({
                  empresa_id: selectedCompany,
                  ano: selectedYear,
                  mes: selectedMonth,
                  categoria_id: row.categoria_id,
                  indicador_id: row.indicador_id,
                  valor: finalValue
                });

              if (insertError) throw insertError;

              results.success++;
              results.data.push({ name, valor: finalValue });
            } catch (err) {
              results.errors++;
              results.data.push({
                name: row.categoria_id || row.indicador_id || 'Desconhecido',
                valor: row.valor,
                error: err instanceof Error ? err.message : 'Erro desconhecido'
              });
            }
          }

          setResult(results);
        } catch (err) {
          setError('Erro ao processar arquivo');
          console.error('Erro:', err);
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Erro ao ler arquivo');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Empresa
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
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
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Ano
          </label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            min={2000}
            max={2100}
            className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Mês
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
          >
            {MONTHS.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedCompany && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Arquivo (.xlsx ou .csv)
          </label>
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-700 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-zinc-400" />
              <div className="flex text-sm text-zinc-400">
                <label className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400">
                  <span>Selecione um arquivo</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                    }}
                  />
                </label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-zinc-500">
                XLSX ou CSV até 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Check size={20} className="text-green-400" />
                <span className="text-zinc-300">
                  Registros inseridos: {result.success}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-red-400" />
                <span className="text-zinc-300">
                  Registros com erro: {result.errors}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((item, index) => (
                  <tr key={index} className="border-b border-zinc-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-zinc-300">
                      {item.valor.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.error ? (
                        <span className="text-red-400">{item.error}</span>
                      ) : (
                        <span className="text-green-400">Sucesso</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
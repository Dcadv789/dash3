import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

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
}

interface DREData {
  accountId: string;
  name: string;
  value: number;
  type: string;
  symbol: string;
  order: number;
  isExpanded?: boolean;
  children?: DREData[];
  monthlyValues: { [key: string]: number };
}

interface SystemUser {
  id: string;
  role: string;
  company_id: string | null;
  has_all_companies_access: boolean;
}

interface RawData {
  valor: number;
  category?: {
    type: 'revenue' | 'expense';
  };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_ABBREVIATIONS: { [key: string]: string } = {
  'Janeiro': 'Jan',
  'Fevereiro': 'Fev',
  'Março': 'Mar',
  'Abril': 'Abr',
  'Maio': 'Mai',
  'Junho': 'Jun',
  'Julho': 'Jul',
  'Agosto': 'Ago',
  'Setembro': 'Set',
  'Outubro': 'Out',
  'Novembro': 'Nov',
  'Dezembro': 'Dez'
};

export const DREVisualizacao = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [dreData, setDreData] = useState<DREData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.has_all_companies_access) {
        fetchCompanies();
      } else if (currentUser.company_id) {
        setSelectedCompanyId(currentUser.company_id);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedCompanyId && selectedYear && selectedMonth) {
      fetchDREData();
    }
  }, [selectedCompanyId, selectedYear, selectedMonth]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select('id, role, company_id, has_all_companies_access')
        .eq('auth_user_id', user?.id)
        .single();

      if (userError) throw userError;
      setCurrentUser(userData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Erro ao carregar dados do usuário');
    }
  };

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

  const getLast12Months = () => {
    const months = [];
    const currentMonthIndex = MONTHS.indexOf(selectedMonth);
    const currentYear = selectedYear;

    for (let i = 11; i >= 0; i--) {
      let monthIndex = currentMonthIndex - i;
      let year = currentYear;

      if (monthIndex < 0) {
        monthIndex += 12;
        year--;
      }

      months.push({
        month: MONTHS[monthIndex],
        year: year
      });
    }

    return months;
  };

  const calculateAccountValue = (account: DREAccount, rawData: RawData[]): number => {
    let totalValue = 0;

    rawData.forEach(data => {
      // Se for receita, mantém positivo
      if (data.category?.type === 'revenue') {
        totalValue += data.valor;
      }
      // Se for despesa, torna negativo
      else if (data.category?.type === 'expense') {
        totalValue -= data.valor;
      }
      // Se não tiver categoria (ex: indicador), usa o valor como está
      else {
        totalValue += data.valor;
      }
    });

    return totalValue;
  };

  const fetchDREData = async () => {
    try {
      setLoading(true);
      setError(null);

      const months = getLast12Months();

      // Buscar contas do DRE
      const { data: accounts, error: accountsError } = await supabase
        .from('contas_dre_modelo')
        .select('*')
        .eq('visivel', true)
        .order('ordem_padrao');

      if (accountsError) throw accountsError;

      // Buscar dados brutos para os últimos 12 meses
      const monthlyData = await Promise.all(
        months.map(async ({ month, year }) => {
          const { data, error } = await supabase
            .from('dados_brutos')
            .select(`
              id,
              categoria_id,
              indicador_id,
              valor,
              mes,
              ano,
              category:categories(type)
            `)
            .eq('empresa_id', selectedCompanyId)
            .eq('ano', year)
            .eq('mes', month);

          if (error) throw error;
          return { month, year, data: data || [] };
        })
      );

      // Processar os dados
      const processedData = accounts?.map(account => {
        const monthlyValues: { [key: string]: number } = {};
        let totalValue = 0;

        monthlyData.forEach(({ month, year, data }) => {
          const monthKey = `${month}-${year}`;
          const value = calculateAccountValue(account, data);
          monthlyValues[monthKey] = value;
          totalValue += value;
        });

        return {
          accountId: account.id,
          name: account.nome,
          symbol: account.simbolo || '=',
          type: account.tipo,
          order: account.ordem_padrao,
          monthlyValues,
          value: totalValue,
          isExpanded: true
        };
      }) || [];

      setDreData(processedData);
    } catch (err) {
      console.error('Erro ao carregar dados do DRE:', err);
      setError('Erro ao carregar dados do DRE');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getValueColor = (value: number, symbol: string) => {
    if (symbol === '+') return value >= 0 ? 'text-green-400' : 'text-red-400';
    if (symbol === '-') return value <= 0 ? 'text-green-400' : 'text-red-400';
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  const months = getLast12Months();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">
              Demonstrativo de Resultados
            </h1>
            <p className="text-zinc-400 mt-1">
              Visualize o DRE por período
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="text-zinc-500" size={20} />
            <span className="text-zinc-400">
              {selectedMonth} de {selectedYear}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentUser?.has_all_companies_access && (
            <div>
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
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
            >
              {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
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
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados do DRE...</p>
        </div>
      ) : !selectedCompanyId ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Selecione uma empresa para visualizar o DRE</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                    Conta
                  </th>
                  {months.map(({ month, year }) => (
                    <th key={`${month}-${year}`} className="px-3 py-4 text-right text-sm font-semibold text-zinc-400">
                      {`${MONTH_ABBREVIATIONS[month]}/${year.toString().slice(2)}`}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-400">
                    Acumulado
                  </th>
                </tr>
              </thead>
              <tbody>
                {dreData.map((item) => (
                  <tr key={item.accountId} className="border-b border-zinc-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={getValueColor(item.value, item.symbol)}>
                          {item.symbol}
                        </span>
                        <span className="text-zinc-300">{item.name}</span>
                      </div>
                    </td>
                    {months.map(({ month, year }) => {
                      const value = item.monthlyValues[`${month}-${year}`] || 0;
                      return (
                        <td key={`${month}-${year}`} className="px-3 py-4 text-right">
                          <span className={getValueColor(value, item.symbol)}>
                            {formatCurrency(value)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right">
                      <span className={getValueColor(item.value, item.symbol)}>
                        {formatCurrency(item.value)}
                      </span>
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
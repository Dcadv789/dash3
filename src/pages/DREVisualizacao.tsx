import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronRight, FileText, Plus, Minus, Equal } from 'lucide-react';

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

interface DRESecondaryAccount {
  id: string;
  nome: string;
  ordem: number;
  componentes: DREComponent[];
}

interface DREComponent {
  id: string;
  referencia_tipo: 'categoria' | 'indicador';
  referencia_id: string;
  peso: number;
  ordem: number;
  categoria?: {
    name: string;
    code: string;
    type: 'revenue' | 'expense';
  };
  indicador?: {
    name: string;
    code: string;
  };
  monthlyValues: { [key: string]: number };
}

interface DREData {
  accountId: string;
  name: string;
  symbol: string;
  type: string;
  order: number;
  isExpanded?: boolean;
  components: DREComponent[];
  secondaryAccounts: DRESecondaryAccount[];
  monthlyValues: { [key: string]: number };
}

interface SystemUser {
  id: string;
  role: string;
  company_id: string | null;
  has_all_companies_access: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_ABBREVIATIONS: { [key: string]: string } = {
  'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar',
  'Abril': 'Abr', 'Maio': 'Mai', 'Junho': 'Jun',
  'Julho': 'Jul', 'Agosto': 'Ago', 'Setembro': 'Set',
  'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez'
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
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedSecondaryAccounts, setExpandedSecondaryAccounts] = useState<Set<string>>(new Set());
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

  const fetchDREData = async () => {
    try {
      setLoading(true);
      setError(null);

      const months = getLast12Months();

      const { data: selectedComponents, error: componentsError } = await supabase
        .from('dre_empresa_componentes')
        .select(`
          dre_conta_principal:contas_dre_modelo!inner(
            id,
            nome,
            tipo,
            simbolo,
            ordem_padrao
          ),
          dre_conta_secundaria:dre_contas_secundarias(
            id,
            nome,
            ordem
          ),
          componente:contas_dre_componentes!inner(
            id,
            referencia_tipo,
            referencia_id,
            peso,
            ordem,
            categoria:categories!contas_dre_componentes_referencia_id_fkey(
              id,
              name,
              code,
              type
            ),
            indicador:indicators(
              id,
              name,
              code
            )
          )
        `)
        .eq('empresa_id', selectedCompanyId)
        .eq('is_active', true)
        .order('dre_conta_principal(ordem_padrao)', { ascending: true });

      if (componentsError) throw componentsError;

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

      const accountsMap = new Map<string, DREData>();

      selectedComponents?.forEach(selection => {
        const mainAccount = selection.dre_conta_principal;
        const secondaryAccount = selection.dre_conta_secundaria;
        const component = selection.componente;

        const componentMonthlyValues: { [key: string]: number } = {};
        monthlyData.forEach(({ month, year, data }) => {
          const monthKey = `${month}-${year}`;
          const relevantData = data.filter(d => {
            if (component.referencia_tipo === 'categoria') {
              return d.categoria_id === component.categoria?.id;
            } else {
              return d.indicador_id === component.indicador?.id;
            }
          });

          const value = relevantData.reduce((sum, d) => {
            if (component.referencia_tipo === 'categoria') {
              return sum + (component.categoria?.type === 'expense' ? -d.valor : d.valor);
            }
            return sum + d.valor;
          }, 0) * (component.peso || 1);

          componentMonthlyValues[monthKey] = value;
        });

        if (!accountsMap.has(mainAccount.id)) {
          accountsMap.set(mainAccount.id, {
            accountId: mainAccount.id,
            name: mainAccount.nome,
            symbol: mainAccount.simbolo || '=',
            type: mainAccount.tipo,
            order: mainAccount.ordem_padrao,
            components: [],
            secondaryAccounts: [],
            monthlyValues: {},
            isExpanded: expandedAccounts.has(mainAccount.id)
          });
        }

        const accountData = accountsMap.get(mainAccount.id)!;

        const componentData = {
          ...component,
          monthlyValues: componentMonthlyValues
        };

        if (secondaryAccount) {
          let secAccount = accountData.secondaryAccounts.find(
            sa => sa.id === secondaryAccount.id
          );

          if (!secAccount) {
            secAccount = {
              id: secondaryAccount.id,
              nome: secondaryAccount.nome,
              ordem: secondaryAccount.ordem,
              componentes: []
            };
            accountData.secondaryAccounts.push(secAccount);
          }

          secAccount.componentes.push(componentData);
        } else {
          accountData.components.push(componentData);
        }

        Object.entries(componentMonthlyValues).forEach(([monthKey, value]) => {
          accountData.monthlyValues[monthKey] = (accountData.monthlyValues[monthKey] || 0) + value;
        });
      });

      setDreData(Array.from(accountsMap.values())
        .sort((a, b) => a.order - b.order));
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

  const toggleSecondaryAccountExpansion = (accountId: string) => {
    setExpandedSecondaryAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  if (!currentUser) {
    return (
      <div className="max-w-[1600px] mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  const months = getLast12Months();

  return (
    <div className="max-w-[1600px] mx-auto py-8">
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
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {dreData.map((account) => {
                  const hasContent = account.components.length > 0 || account.secondaryAccounts.length > 0;
                  const isExpanded = expandedAccounts.has(account.accountId);
                  const totalValue = Object.values(account.monthlyValues).reduce((sum, value) => sum + value, 0);

                  return (
                    <React.Fragment key={account.accountId}>
                      {/* Conta Principal */}
                      <tr className="border-b border-zinc-800">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasContent && (
                              <button
                                onClick={() => toggleAccountExpansion(account.accountId)}
                                className="p-1 hover:bg-zinc-700 rounded-lg"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={16} className="text-zinc-400" />
                                ) : (
                                  <ChevronRight size={16} className="text-zinc-400" />
                                )}
                              </button>
                            )}
                            {account.symbol === '+' && <Plus size={16} className="text-green-400" />}
                            {account.symbol === '-' && <Minus size={16} className="text-red-400" />}
                            {account.symbol === '=' && <Equal size={16} className="text-blue-400" />}
                            <span className="text-zinc-100 font-medium">{account.name}</span>
                          </div>
                        </td>
                        {months.map(({ month, year }) => {
                          const value = account.monthlyValues[`${month}-${year}`] || 0;
                          return (
                            <td key={`${month}-${year}`} className="px-3 py-4 text-right">
                              <span className={getValueColor(value, account.symbol)}>
                                {formatCurrency(value)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-right">
                          <span className={getValueColor(totalValue, account.symbol)}>
                            {formatCurrency(totalValue)}
                          </span>
                        </td>
                      </tr>

                      {/* Componentes diretos da conta principal */}
                      {isExpanded && account.components.map((component) => {
                        const componentTotal = Object.values(component.monthlyValues).reduce((sum, value) => sum + value, 0);
                        return (
                          <tr key={component.id} className="border-b border-zinc-800 bg-zinc-800/30">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2 pl-8">
                                <span className="text-zinc-300">
                                  {component.referencia_tipo === 'categoria' ? component.categoria?.name : component.indicador?.name}
                                </span>
                              </div>
                            </td>
                            {months.map(({ month, year }) => {
                              const value = component.monthlyValues[`${month}-${year}`] || 0;
                              return (
                                <td key={`${month}-${year}`} className="px-3 py-3 text-right">
                                  <span className={getValueColor(value, account.symbol)}>
                                    {formatCurrency(value)}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-6 py-3 text-right">
                              <span className={getValueColor(componentTotal, account.symbol)}>
                                {formatCurrency(componentTotal)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Contas Secundárias */}
                      {isExpanded && account.secondaryAccounts.map((secondaryAccount) => {
                        const isSecondaryExpanded = expandedSecondaryAccounts.has(secondaryAccount.id);
                        const secondaryTotal = secondaryAccount.componentes.reduce((sum, comp) => 
                          sum + Object.values(comp.monthlyValues).reduce((s, v) => s + v, 0), 0
                        );

                        return (
                          <React.Fragment key={secondaryAccount.id}>
                            {/* Cabeçalho da Conta Secundária */}
                            <tr className="border-b border-zinc-800 bg-zinc-800/50">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2 pl-8">
                                  <button
                                    onClick={() => toggleSecondaryAccountExpansion(secondaryAccount.id)}
                                    className="p-1 hover:bg-zinc-700 rounded-lg"
                                  >
                                    {isSecondaryExpanded ? (
                                      <ChevronDown size={16} className="text-zinc-400" />
                                    ) : (
                                      <ChevronRight size={16} className="text-zinc-400" />
                                    )}
                                  </button>
                                  <span className="text-zinc-200 font-medium">{secondaryAccount.nome}</span>
                                </div>
                              </td>
                              {months.map(({ month, year }) => {
                                const value = secondaryAccount.componentes.reduce(
                                  (sum, comp) => sum + (comp.monthlyValues[`${month}-${year}`] || 0), 0
                                );
                                return (
                                  <td key={`${month}-${year}`} className="px-3 py-3 text-right">
                                    <span className={getValueColor(value, account.symbol)}>
                                      {formatCurrency(value)}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="px-6 py-3 text-right">
                                <span className={getValueColor(secondaryTotal, account.symbol)}>
                                  {formatCurrency(secondaryTotal)}
                                </span>
                              </td>
                            </tr>

                            {/* Componentes da Conta Secundária */}
                            {isSecondaryExpanded && secondaryAccount.componentes.map((component) => {
                              const componentTotal = Object.values(component.monthlyValues).reduce((sum, value) => sum + value, 0);
                              return (
                                <tr key={component.id} className="border-b border-zinc-800 bg-zinc-800/20">
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2 pl-16">
                                      <span className="text-zinc-300">
                                        {component.referencia_tipo === 'categoria' ? component.categoria?.name : component.indicador?.name}
                                      </span>
                                    </div>
                                  </td>
                                  {months.map(({ month, year }) => {
                                    const value = component.monthlyValues[`${month}-${year}`] || 0;
                                    return (
                                      <td key={`${month}-${year}`} className="px-3 py-3 text-right">
                                        <span className={getValueColor(value, account.symbol)}>
                                          {formatCurrency(value)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                  <td className="px-6 py-3 text-right">
                                    <span className={getValueColor(componentTotal, account.symbol)}>
                                      {formatCurrency(componentTotal)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
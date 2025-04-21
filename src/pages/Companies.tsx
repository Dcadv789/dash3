import React, { useState, useEffect } from 'react';
import { Plus, Building2, Users, Calendar, FileText, Eye, Edit, Trash2, Mail, Phone, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { CompanyModal } from '../components/CompanyModal';
import { CompanyViewModal } from '../components/CompanyViewModal';
import { useAuth } from '../contexts/AuthContext';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyPartner = Database['public']['Tables']['company_partners']['Row'];

interface CompanyWithPartners extends Company {
  partners?: CompanyPartner[];
}

interface SystemUser {
  id: string;
  role: string;
  company_id: string | null;
  has_all_companies_access: boolean;
}

export const Companies = () => {
  const [companies, setCompanies] = useState<CompanyWithPartners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithPartners | null>(null);
  const [viewingCompany, setViewingCompany] = useState<CompanyWithPartners | null>(null);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (currentUser) {
      fetchCompanies();
    }
  }, [currentUser]);

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
      setLoading(true);
      
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      // If user doesn't have access to all companies, filter by their company_id
      if (currentUser && !currentUser.has_all_companies_access) {
        query = query.eq('id', currentUser.company_id);
      }

      const { data: companiesData, error: companiesError } = await query;

      if (companiesError) throw companiesError;

      const companiesWithPartners = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { data: partners } = await supabase
            .from('company_partners')
            .select('*')
            .eq('company_id', company.id)
            .eq('is_active', true);

          return {
            ...company,
            partners: partners || []
          };
        })
      );

      setCompanies(companiesWithPartners);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (companyData: any) => {
    try {
      const companyPayload = {
        id: editingCompany?.id,
        name: companyData.name,
        trading_name: companyData.tradingName,
        cnpj: companyData.cnpj,
        phone: companyData.phone,
        email: companyData.email,
        contract_start_date: companyData.contractStartDate,
        is_active: companyData.isActive
      };

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .upsert([companyPayload])
        .select()
        .single();

      if (companyError) throw companyError;

      if (company) {
        if (editingCompany) {
          await supabase
            .from('company_partners')
            .update({ is_active: false })
            .eq('company_id', company.id);
        }

        for (const partner of companyData.partners) {
          const { error: partnerError } = await supabase
            .from('company_partners')
            .insert({
              company_id: company.id,
              name: partner.name,
              cpf: partner.cpf,
              email: partner.email,
              phone: partner.phone,
              is_active: true
            });

          if (partnerError) throw partnerError;
        }
      }

      setShowModal(false);
      setEditingCompany(null);
      await fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar empresa');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);

      // Primeiro, excluímos todos os sócios da empresa
      const { error: partnersError } = await supabase
        .from('company_partners')
        .delete()
        .eq('company_id', companyId);

      if (partnersError) throw partnersError;

      // Depois, excluímos a empresa
      const { error: companyError } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (companyError) throw companyError;

      // Atualiza a lista de empresas
      await fetchCompanies();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir empresa');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const calculateMonthsAsCostumer = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffInMonths = (now.getFullYear() - start.getFullYear()) * 12 + 
      (now.getMonth() - start.getMonth());
    return Math.max(0, diffInMonths);
  };

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Gerenciamento de Empresas</h1>
          <p className="text-zinc-400 mt-1">
            {currentUser.has_all_companies_access 
              ? 'Visualize e gerencie todas as empresas do sistema'
              : 'Gerencie os dados da sua empresa'}
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Empresa
        </button>
      </div>

      {loading ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Carregando empresas...</p>
        </div>
      ) : error ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Nenhuma empresa cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => {
            const monthsAsCostumer = company.contract_start_date 
              ? calculateMonthsAsCostumer(company.contract_start_date)
              : 0;

            return (
              <div key={company.id} className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-100">{company.trading_name}</h3>
                        <p className="text-sm text-zinc-400">{company.name}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      company.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {company.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-zinc-500" />
                      <span className="text-zinc-400">CNPJ:</span>
                      <span className="text-zinc-300">{company.cnpj}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-zinc-500" />
                      <span className="text-zinc-400">Início do Contrato:</span>
                      <span className="text-zinc-300">
                        {company.contract_start_date ? formatDate(company.contract_start_date) : 'Não definido'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-zinc-500" />
                      <span className="text-zinc-400">Cliente há:</span>
                      <span className="text-zinc-300">
                        {monthsAsCostumer} {monthsAsCostumer === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} className="text-zinc-500" />
                      <span className="text-zinc-400">Sócios:</span>
                      <span className="text-zinc-300">{company.partners?.length || 0}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewingCompany(company)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCompany({
                          ...company,
                          tradingName: company.trading_name,
                          contractStartDate: company.contract_start_date || '',
                        });
                        setShowModal(true);
                      }}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCompany(company.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CompanyModal
        isOpen={showModal || editingCompany !== null}
        onClose={() => {
          setShowModal(false);
          setEditingCompany(null);
        }}
        onSave={handleSaveCompany}
        editingCompany={editingCompany}
      />

      <CompanyViewModal
        isOpen={viewingCompany !== null}
        onClose={() => setViewingCompany(null)}
        company={viewingCompany}
      />
    </div>
  );
};
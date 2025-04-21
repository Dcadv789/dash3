import React, { useState, useEffect } from 'react';
import { Copy, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CategoryGroup, Category, CompanyCategory } from '../types/financial';
import { useAuth } from '../contexts/AuthContext';
import { CategorySection } from '../components/categories/CategorySection';
import { CopyModal } from '../components/categories/CopyModal';

interface Company {
  id: string;
  trading_name: string;
  name: string;
  is_active: boolean;
}

type CategoryFilter = 'all' | 'revenue' | 'expense';

export const Categories = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyCategories, setCompanyCategories] = useState<CompanyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromCompanyId, setCopyFromCompanyId] = useState<string>('');
  const [copyToCompanyId, setCopyToCompanyId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchCompanies();
    fetchCategoryGroups();
    fetchCategories();
    fetchAllCompanyCategories();
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

  const fetchCategoryGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategoryGroups(data || []);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
      setError('Erro ao carregar grupos de categorias');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('code');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setError('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCompanyCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('company_categories')
        .select('*');

      if (error) throw error;
      setCompanyCategories(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias das empresas:', err);
      setError('Erro ao carregar categorias das empresas');
    }
  };

  const handleCreateGroup = async (type: 'revenue' | 'expense') => {
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .insert([{ name: 'Novo Grupo', type }])
        .select()
        .single();

      if (error) throw error;
      setCategoryGroups([...categoryGroups, data]);
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
      setError('Erro ao criar grupo');
    }
  };

  const handleEditGroup = async (groupId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('category_groups')
        .update({ name: newName })
        .eq('id', groupId);

      if (error) throw error;

      setCategoryGroups(categoryGroups.map(group =>
        group.id === groupId ? { ...group, name: newName } : group
      ));
    } catch (err) {
      console.error('Erro ao atualizar grupo:', err);
      setError('Erro ao atualizar grupo');
    }
  };

  const handleCreateCategory = async (
    type: 'revenue' | 'expense',
    groupId: string | null = null
  ) => {
    try {
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .insert([{ 
          name: 'Nova Categoria', 
          type, 
          group_id: groupId,
          value: 0
        }])
        .select()
        .single();

      if (categoryError) throw categoryError;

      if (category) {
        setCategories([...categories, category]);
      }
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
      setError('Erro ao criar categoria');
    }
  };

  const handleUpdateCategory = async (categoryId: string, name: string, groupId: string | null) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name, group_id: groupId })
        .eq('id', categoryId);

      if (error) throw error;
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, name, group_id: groupId } : cat
      ));
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      setError('Erro ao atualizar categoria');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      setCategories(categories.filter(cat => cat.id !== categoryId));
      setCompanyCategories(companyCategories.filter(cc => cc.category_id !== categoryId));
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      setError('Erro ao excluir categoria');
    }
  };

  const handleToggleCategoryStatus = async (categoryId: string, companyId: string) => {
    try {
      const existingLink = companyCategories.find(
        cc => cc.category_id === categoryId && cc.company_id === companyId
      );

      if (existingLink) {
        // Remove o vínculo
        const { error } = await supabase
          .from('company_categories')
          .delete()
          .eq('category_id', categoryId)
          .eq('company_id', companyId);

        if (error) throw error;
        setCompanyCategories(companyCategories.filter(
          cc => !(cc.category_id === categoryId && cc.company_id === companyId)
        ));
      } else {
        // Cria novo vínculo
        const { data, error } = await supabase
          .from('company_categories')
          .insert([{
            company_id: companyId,
            category_id: categoryId,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;
        setCompanyCategories([...companyCategories, data]);
      }
    } catch (err) {
      console.error('Erro ao alterar status da categoria:', err);
      setError('Erro ao alterar status da categoria');
    }
  };

  const handleCopyCategories = async () => {
    if (!copyFromCompanyId || !copyToCompanyId) return;

    try {
      const { data: sourceCategories, error: sourceError } = await supabase
        .from('company_categories')
        .select(`
          category_id,
          categories (*)
        `)
        .eq('company_id', copyFromCompanyId);

      if (sourceError) throw sourceError;

      const newLinks = sourceCategories?.map(sc => ({
        company_id: copyToCompanyId,
        category_id: sc.category_id,
        is_active: true
      }));

      if (newLinks && newLinks.length > 0) {
        const { error: insertError } = await supabase
          .from('company_categories')
          .insert(newLinks);

        if (insertError) throw insertError;
      }

      setShowCopyModal(false);
      setCopyFromCompanyId('');
      setCopyToCompanyId('');
      fetchAllCompanyCategories();
    } catch (err) {
      console.error('Erro ao copiar categorias:', err);
      setError('Erro ao copiar categorias');
    }
  };

  const getCategoryStatus = (categoryId: string, companyId: string): boolean => {
    return companyCategories.some(cc => 
      cc.category_id === categoryId && 
      cc.company_id === companyId
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

  const filteredCategories = categories.filter(cat => {
    const matchesCompany = selectedCompanyId
      ? companyCategories.some(cc => 
          cc.category_id === cat.id && 
          cc.company_id === selectedCompanyId
        )
      : true;

    const matchesType = categoryFilter === 'all'
      ? true
      : cat.type === categoryFilter;

    return matchesCompany && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Cabeçalho */}
      <div className="bg-zinc-900 rounded-xl p-8 mb-8">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Categorias</h1>
              <p className="text-zinc-400 mt-2">Gerencie as categorias financeiras por empresa</p>
            </div>

            <button
              onClick={() => setShowCopyModal(true)}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-3"
            >
              <Copy size={20} />
              Copiar Categorias
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Filtrar por Empresa
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-zinc-800 text-zinc-100 rounded-lg px-4 py-3 w-full appearance-none"
              >
                <option value="">Todas as empresas</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.trading_name} - {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Tipo
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-4 py-3 rounded-lg ${
                    categoryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setCategoryFilter('revenue')}
                  className={`px-4 py-3 rounded-lg ${
                    categoryFilter === 'revenue'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  Receitas
                </button>
                <button
                  onClick={() => setCategoryFilter('expense')}
                  className={`px-4 py-3 rounded-lg ${
                    categoryFilter === 'expense'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  Despesas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="space-y-8">
        {(categoryFilter === 'all' || categoryFilter === 'revenue') && (
          <CategorySection
            title="Receitas"
            type="revenue"
            groups={categoryGroups}
            categories={filteredCategories}
            companies={companies}
            onCreateGroup={handleCreateGroup}
            onCreateCategory={handleCreateCategory}
            onEditGroup={handleEditGroup}
            onToggleStatus={handleToggleCategoryStatus}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            getCategoryStatus={getCategoryStatus}
          />
        )}

        {(categoryFilter === 'all' || categoryFilter === 'expense') && (
          <CategorySection
            title="Despesas"
            type="expense"
            groups={categoryGroups}
            categories={filteredCategories}
            companies={companies}
            onCreateGroup={handleCreateGroup}
            onCreateCategory={handleCreateCategory}
            onEditGroup={handleEditGroup}
            onToggleStatus={handleToggleCategoryStatus}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            getCategoryStatus={getCategoryStatus}
          />
        )}
      </div>

      <CopyModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        companies={companies}
        copyFromCompanyId={copyFromCompanyId}
        copyToCompanyId={copyToCompanyId}
        onCopyFromChange={setCopyFromCompanyId}
        onCopyToChange={setCopyToCompanyId}
        onCopy={handleCopyCategories}
      />
    </div>
  );
};
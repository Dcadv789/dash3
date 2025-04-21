import React, { useState, useEffect } from 'react';
import { Plus, PencilIcon, Trash2, Save, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DreConta {
  id: string;
  nome: string;
  tipo: 'simples' | 'composta' | 'formula' | 'indicador' | 'soma_indicadores';
  simbolo: '+' | '-' | '=' | null;
  ordem_padrao: number;
  visivel: boolean;
}

interface DreContaSecundaria {
  id: string;
  nome: string;
  dre_conta_principal_id: string;
  ordem: number;
  empresa_ids: string[];
}

interface DreComponente {
  id: string;
  conta_dre_modelo_id: string;
  dre_conta_secundaria_id: string | null;
  referencia_tipo: 'categoria' | 'indicador' | 'conta';
  referencia_id: string;
  peso: number;
  ordem: number;
}

interface Referencia {
  id: string;
  nome: string;
  codigo?: string;
}

const SIMBOLOS = [
  { value: '+', label: '+ (Receita)', color: 'text-green-400' },
  { value: '-', label: '- (Despesa)', color: 'text-red-400' },
  { value: '=', label: '= (Resultado)', color: 'text-blue-400' }
];

export const DreModelConfig = () => {
  const [contas, setContas] = useState<DreConta[]>([]);
  const [contasSecundarias, setContasSecundarias] = useState<DreContaSecundaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingConta, setEditingConta] = useState<DreConta | null>(null);
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  
  const [showSecundariaModal, setShowSecundariaModal] = useState(false);
  const [editingContaSecundaria, setEditingContaSecundaria] = useState<DreContaSecundaria | null>(null);
  
  const [categorias, setCategorias] = useState<Referencia[]>([]);
  const [indicadores, setIndicadores] = useState<Referencia[]>([]);
  
  const [componentes, setComponentes] = useState<DreComponente[]>([]);
  const [showComponenteModal, setShowComponenteModal] = useState(false);
  const [editingComponente, setEditingComponente] = useState<DreComponente | null>(null);
  const [selectedContaSecundariaId, setSelectedContaSecundariaId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'simples' as DreConta['tipo'],
    simbolo: '+' as '+' | '-' | '=' | null,
    ordem_padrao: 0,
    visivel: true
  });

  const [secundariaData, setSecundariaData] = useState({
    nome: '',
    ordem: 0,
    empresa_ids: [] as string[]
  });

  const [componenteData, setComponenteData] = useState({
    referencia_tipo: 'categoria' as DreComponente['referencia_tipo'],
    referencia_id: '',
    peso: 1,
    ordem: 0
  });

  useEffect(() => {
    fetchContas();
    fetchCategorias();
    fetchIndicadores();
  }, []);

  useEffect(() => {
    if (selectedContaId) {
      fetchContasSecundarias(selectedContaId);
      fetchComponentes(selectedContaId);
    }
  }, [selectedContaId]);

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

  const fetchContasSecundarias = async (contaId: string) => {
    try {
      const { data, error } = await supabase
        .from('dre_contas_secundarias')
        .select('*')
        .eq('dre_conta_principal_id', contaId)
        .order('ordem');

      if (error) throw error;
      setContasSecundarias(data || []);
    } catch (err) {
      console.error('Erro ao carregar contas secundárias:', err);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, code')
        .order('code');

      if (error) throw error;
      setCategorias(data.map(cat => ({ id: cat.id, nome: cat.name, codigo: cat.code })));
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('indicators')
        .select('id, name, code')
        .order('code');

      if (error) throw error;
      setIndicadores(data.map(ind => ({ id: ind.id, nome: ind.name, codigo: ind.code })));
    } catch (err) {
      console.error('Erro ao carregar indicadores:', err);
    }
  };

  const fetchComponentes = async (contaId: string) => {
    try {
      const { data, error } = await supabase
        .from('contas_dre_componentes')
        .select('*')
        .eq('conta_dre_modelo_id', contaId)
        .order('ordem');

      if (error) throw error;
      setComponentes(data || []);
    } catch (err) {
      console.error('Erro ao carregar componentes:', err);
    }
  };

  const handleSaveConta = async () => {
    try {
      const contaData = editingConta ? {
        ...formData,
        id: editingConta.id
      } : formData;

      const { data, error } = await supabase
        .from('contas_dre_modelo')
        .upsert([contaData])
        .select()
        .single();

      if (error) throw error;

      await fetchContas();
      setShowModal(false);
      setEditingConta(null);
      setFormData({
        nome: '',
        tipo: 'simples',
        simbolo: '+',
        ordem_padrao: 0,
        visivel: true
      });
      setSuccess('Conta salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao salvar conta');
      console.error('Erro:', err);
    }
  };

  const handleSaveContaSecundaria = async () => {
    if (!selectedContaId) return;

    try {
      setLoading(true);

      const contaSecundariaPayload = {
        nome: secundariaData.nome,
        dre_conta_principal_id: selectedContaId,
        ordem: secundariaData.ordem,
        empresa_ids: secundariaData.empresa_ids
      };

      if (editingContaSecundaria) {
        const { error } = await supabase
          .from('dre_contas_secundarias')
          .update(contaSecundariaPayload)
          .eq('id', editingContaSecundaria.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dre_contas_secundarias')
          .insert([contaSecundariaPayload]);

        if (error) throw error;
      }

      await fetchContasSecundarias(selectedContaId);
      setShowSecundariaModal(false);
      setEditingContaSecundaria(null);
      setSecundariaData({
        nome: '',
        ordem: 0,
        empresa_ids: []
      });
      setSuccess('Conta secundária salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao salvar conta secundária');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComponente = async () => {
    if (!selectedContaId) return;

    try {
      setLoading(true);

      const componentePayload = {
        conta_dre_modelo_id: selectedContaId,
        dre_conta_secundaria_id: selectedContaSecundariaId,
        referencia_tipo: componenteData.referencia_tipo,
        referencia_id: componenteData.referencia_id,
        peso: componenteData.peso,
        ordem: componenteData.ordem
      };

      if (editingComponente) {
        const { error } = await supabase
          .from('contas_dre_componentes')
          .update(componentePayload)
          .eq('id', editingComponente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contas_dre_componentes')
          .insert([componentePayload]);

        if (error) throw error;
      }

      await fetchComponentes(selectedContaId);
      setShowComponenteModal(false);
      setEditingComponente(null);
      setComponenteData({
        referencia_tipo: 'categoria',
        referencia_id: '',
        peso: 1,
        ordem: 0
      });
      setSuccess('Componente salvo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao salvar componente');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConta = async (contaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('contas_dre_modelo')
        .delete()
        .eq('id', contaId);

      if (error) throw error;

      await fetchContas();
      if (selectedContaId === contaId) {
        setSelectedContaId(null);
        setComponentes([]);
      }
      setSuccess('Conta excluída com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao excluir conta');
      console.error('Erro:', err);
    }
  };

  const handleDeleteContaSecundaria = async (contaSecundariaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta secundária?')) return;

    try {
      const { error } = await supabase
        .from('dre_contas_secundarias')
        .delete()
        .eq('id', contaSecundariaId);

      if (error) throw error;

      if (selectedContaId) {
        await fetchContasSecundarias(selectedContaId);
      }
      setSuccess('Conta secundária excluída com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao excluir conta secundária');
      console.error('Erro:', err);
    }
  };

  const handleDeleteComponente = async (componenteId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este componente?')) return;

    try {
      const { error } = await supabase
        .from('contas_dre_componentes')
        .delete()
        .eq('id', componenteId);

      if (error) throw error;

      if (selectedContaId) {
        await fetchComponentes(selectedContaId);
      }
      setSuccess('Componente excluído com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao excluir componente');
      console.error('Erro:', err);
    }
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
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Configuração do DRE</h1>
          <p className="text-zinc-400 mt-1">Gerencie as contas e componentes do DRE</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Conta Principal
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Main content */}
      <div className="bg-zinc-900 rounded-xl p-6">
        {/* Contas principais */}
        {contas.map(conta => (
          <div key={conta.id} className="mb-4">
            <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedContaId(selectedContaId === conta.id ? null : conta.id)}
                  className="p-1 hover:bg-zinc-700 rounded-lg"
                >
                  {selectedContaId === conta.id ? (
                    <ChevronDown size={20} className="text-zinc-400" />
                  ) : (
                    <ChevronRight size={20} className="text-zinc-400" />
                  )}
                </button>
                <span className="text-zinc-100 font-medium">{conta.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedContaId(conta.id);
                    setShowSecundariaModal(true);
                  }}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-sm"
                >
                  Adicionar Conta Secundária
                </button>
                <button
                  onClick={() => {
                    setSelectedContaId(conta.id);
                    setShowComponenteModal(true);
                  }}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-sm"
                >
                  Adicionar Componente
                </button>
                <button
                  onClick={() => {
                    setEditingConta(conta);
                    setFormData({
                      nome: conta.nome,
                      tipo: conta.tipo,
                      simbolo: conta.simbolo,
                      ordem_padrao: conta.ordem_padrao,
                      visivel: conta.visivel
                    });
                    setShowModal(true);
                  }}
                  className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
                >
                  <PencilIcon size={16} />
                </button>
                <button
                  onClick={() => handleDeleteConta(conta.id)}
                  className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Contas secundárias e componentes */}
            {selectedContaId === conta.id && (
              <div className="ml-8 mt-2 space-y-2">
                {/* Componentes diretos */}
                {componentes
                  .filter(comp => comp.conta_dre_modelo_id === conta.id && !comp.dre_conta_secundaria_id)
                  .map(componente => (
                    <div key={componente.id} className="bg-zinc-800/50 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-zinc-300">
                        {componente.referencia_tipo === 'categoria' && 
                          categorias.find(c => c.id === componente.referencia_id)?.nome}
                        {componente.referencia_tipo === 'indicador' && 
                          indicadores.find(i => i.id === componente.referencia_id)?.nome}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingComponente(componente);
                            setComponenteData({
                              referencia_tipo: componente.referencia_tipo,
                              referencia_id: componente.referencia_id,
                              peso: componente.peso,
                              ordem: componente.ordem
                            });
                            setShowComponenteModal(true);
                          }}
                          className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
                        >
                          <PencilIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteComponente(componente.id)}
                          className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Contas secundárias */}
                {contasSecundarias
                  .filter(cs => cs.dre_conta_principal_id === conta.id)
                  .map(contaSecundaria => (
                    <div key={contaSecundaria.id} className="bg-zinc-800/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-200">{contaSecundaria.nome}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingContaSecundaria(contaSecundaria);
                              setSecundariaData({
                                nome: contaSecundaria.nome,
                                ordem: contaSecundaria.ordem,
                                empresa_ids: contaSecundaria.empresa_ids
                              });
                              setShowSecundariaModal(true);
                            }}
                            className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
                          >
                            <PencilIcon size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteContaSecundaria(contaSecundaria.id)}
                            className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Componentes da conta secundária */}
                      <div className="ml-4 space-y-2">
                        {componentes
                          .filter(comp => comp.dre_conta_secundaria_id === contaSecundaria.id)
                          .map(componente => (
                            <div key={componente.id} className="bg-zinc-800/30 p-2 rounded-lg flex items-center justify-between">
                              <span className="text-zinc-400">
                                {componente.referencia_tipo === 'categoria' && 
                                  categorias.find(c => c.id === componente.referencia_id)?.nome}
                                {componente.referencia_tipo === 'indicador' && 
                                  indicadores.find(i => i.id === componente.referencia_id)?.nome}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingComponente(componente);
                                    setComponenteData({
                                      referencia_tipo: componente.referencia_tipo,
                                      referencia_id: componente.referencia_id,
                                      peso: componente.peso,
                                      ordem: componente.ordem
                                    });
                                    setSelectedContaSecundariaId(contaSecundaria.id);
                                    setShowComponenteModal(true);
                                  }}
                                  className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400"
                                >
                                  <PencilIcon size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteComponente(componente.id)}
                                  className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Conta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingConta(null);
                  setFormData({
                    nome: '',
                    tipo: 'simples',
                    simbolo: '+',
                    ordem_padrao: 0,
                    visivel: true
                  });
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as DreConta['tipo'] })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="simples">Simples</option>
                  <option value="composta">Composta</option>
                  <option value="formula">Fórmula</option>
                  <option value="indicador">Indicador</option>
                  <option value="soma_indicadores">Soma de Indicadores</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Símbolo
                </label>
                <select
                  value={formData.simbolo || ''}
                  onChange={(e) => setFormData({ ...formData, simbolo: e.target.value as '+' | '-' | '=' | null })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="">Selecione um símbolo</option>
                  {SIMBOLOS.map(simbolo => (
                    <option key={simbolo.value} value={simbolo.value} className={simbolo.color}>
                      {simbolo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Ordem Padrão
                </label>
                <input
                  type="number"
                  value={formData.ordem_padrao}
                  onChange={(e) => setFormData({ ...formData, ordem_padrao: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.visivel}
                    onChange={(e) => setFormData({ ...formData, visivel: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
                  />
                  <span className="text-zinc-400">Visível</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingConta(null);
                  setFormData({
                    nome: '',
                    tipo: 'simples',
                    simbolo: '+',
                    ordem_padrao: 0,
                    visivel: true
                  });
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConta}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
              >
                <Save size={16} className="inline-block mr-2" />
                {editingConta ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conta Secundária */}
      {showSecundariaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                {editingContaSecundaria ? 'Editar Conta Secundária' : 'Nova Conta Secundária'}
              </h2>
              <button
                onClick={() => {
                  setShowSecundariaModal(false);
                  setEditingContaSecundaria(null);
                  setSecundariaData({
                    nome: '',
                    ordem: 0,
                    empresa_ids: []
                  });
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={secundariaData.nome}
                  onChange={(e) => setSecundariaData({ ...secundariaData, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  value={secundariaData.ordem}
                  onChange={(e) => setSecundariaData({ ...secundariaData, ordem: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSecundariaModal(false);
                  setEditingContaSecundaria(null);
                  setSecundariaData({
                    nome: '',
                    ordem: 0,
                    empresa_ids: []
                  });
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContaSecundaria}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
              >
                <Save size={16} className="inline-block mr-2" />
                {editingContaSecundaria ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Componente */}
      {showComponenteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">
                {editingComponente ? 'Editar Componente' : 'Novo Componente'}
              </h2>
              <button
                onClick={() => {
                  setShowComponenteModal(false);
                  setEditingComponente(null);
                  setComponenteData({
                    referencia_tipo: 'categoria',
                    referencia_id: '',
                    peso: 1,
                    ordem: 0
                  });
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo de Referência
                </label>
                <select
                  value={componenteData.referencia_tipo}
                  onChange={(e) => setComponenteData({
                    ...componenteData,
                    referencia_tipo: e.target.value as DreComponente['referencia_tipo'],
                    referencia_id: ''
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="categoria">Categoria</option>
                  <option value="indicador">Indicador</option>
                  <option value="conta">Conta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Referência
                </label>
                <select
                  value={componenteData.referencia_id}
                  onChange={(e) => setComponenteData({
                    ...componenteData,
                    referencia_id: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                >
                  <option value="">Selecione...</option>
                  {componenteData.referencia_tipo === 'categoria' && categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.codigo} - {cat.nome}
                    </option>
                  ))}
                  {componenteData.referencia_tipo === 'indicador' && indicadores.map(ind => (
                    <option key={ind.id} value={ind.id}>
                      {ind.codigo} - {ind.nome}
                    </option>
                  ))}
                  {componenteData.referencia_tipo === 'conta' && contas.map(conta => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Peso
                </label>
                <input
                  type="number"
                  value={componenteData.peso}
                  onChange={(e) => setComponenteData({
                    ...componenteData,
                    peso: parseFloat(e.target.value)
                  })}
                  step="0.01"
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  value={componenteData.ordem}
                  onChange={(e) => setComponenteData({
                    ...componenteData,
                    ordem: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 rounded-lg text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowComponenteModal(false);
                  setEditingComponente(null);
                  setComponenteData({
                    referencia_tipo: 'categoria',
                    referencia_id: '',
                    peso: 1,
                    ordem: 0
                  });
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveComponente}
                disabled={!componenteData.referencia_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} className="inline-block mr-2" />
                {editingComponente ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
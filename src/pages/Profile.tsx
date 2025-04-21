import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, PencilIcon, Camera, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_id: string;
  user_role: string | null;
  avatar_url: string | null;
  company_name?: string;
  created_at: string;
}

export const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      if (!user) {
        setProfileData(null);
        return;
      }

      const { data: userDataArray, error: userError } = await supabase
        .from('system_users')
        .select(`
          id,
          name,
          email,
          phone,
          company_id,
          user_role,
          avatar_url,
          created_at,
          companies (
            trading_name
          )
        `)
        .eq('auth_user_id', user.id);

      if (userError) throw userError;

      // Check if we have any data
      if (!userDataArray || userDataArray.length === 0) {
        setProfileData(null);
        setError('Perfil não encontrado');
        return;
      }

      // Get the first user profile
      const userData = userDataArray[0];

      setProfileData({
        ...userData,
        company_name: userData.companies?.trading_name || 'Empresa não definida'
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do perfil');
      console.error('Erro:', err);
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileData) return;

    try {
      // Upload da imagem para o storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from('system_users')
        .update({ avatar_url: publicUrl })
        .eq('id', profileData.id);

      if (updateError) throw updateError;

      setProfileData({
        ...profileData,
        avatar_url: publicUrl
      });
    } catch (err) {
      setError('Erro ao atualizar imagem');
      console.error('Erro:', err);
    }
  };

  const handleSave = async () => {
    if (!profileData) return;

    try {
      const updates = {
        name: profileData.name,
        phone: profileData.phone,
        user_role: profileData.user_role
      };

      const { error } = await supabase
        .from('system_users')
        .update(updates)
        .eq('id', profileData.id);

      if (error) throw error;

      setIsEditing(false);
      await fetchProfileData();
    } catch (err) {
      setError('Erro ao salvar alterações');
      console.error('Erro:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-6">
          <p className="text-zinc-400 text-center">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-zinc-900 rounded-xl p-6">
          <p className="text-zinc-400 text-center">
            {error || 'Erro ao carregar perfil'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-zinc-900 rounded-xl p-6">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                {profileData.avatar_url ? (
                  <img 
                    src={profileData.avatar_url} 
                    alt="Foto de perfil" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-zinc-400" />
                )}
              </div>
              {isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="text-2xl font-bold text-zinc-100 bg-zinc-800 rounded px-2 py-1"
                />
              ) : (
                <h1 className="text-2xl font-bold text-zinc-100">{profileData.name}</h1>
              )}
              <p className="text-zinc-400">{profileData.user_role || 'Cargo não definido'}</p>
            </div>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              <PencilIcon size={16} />
              Editar Perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchProfileData();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <Save size={16} />
                Salvar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Informações Pessoais</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="text-zinc-500" size={20} />
                <span className="text-zinc-300">{profileData.email}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="text-zinc-500" size={20} />
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.phone || ''}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="flex-1 bg-zinc-800 rounded px-3 py-2 text-zinc-300"
                    placeholder="Seu telefone"
                  />
                ) : (
                  <span className="text-zinc-300">{profileData.phone || 'Não informado'}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <User className="text-zinc-500" size={20} />
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.user_role || ''}
                    onChange={(e) => setProfileData({ ...profileData, user_role: e.target.value })}
                    className="flex-1 bg-zinc-800 rounded px-3 py-2 text-zinc-300"
                    placeholder="Seu cargo"
                  />
                ) : (
                  <span className="text-zinc-300">{profileData.user_role || 'Cargo não definido'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Informações Profissionais</h2>
            
            <div className="flex items-center gap-3">
              <Building className="text-zinc-500" size={20} />
              <span className="text-zinc-300">{profileData.company_name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="text-zinc-500" size={20} />
              <span className="text-zinc-300">
                Desde {new Date(profileData.created_at).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { X, Building2, Users, Calendar, FileText, Mail, Phone, Clock, Hash } from 'lucide-react';
import { Company } from '../types/company';

interface CompanyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

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

export const CompanyViewModal = ({ isOpen, onClose, company }: CompanyViewModalProps) => {
  if (!isOpen || !company) return null;

  const monthsAsCostumer = company.contract_start_date 
    ? calculateMonthsAsCostumer(company.contract_start_date)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">{company.trading_name}</h2>
              <p className="text-sm text-zinc-400">{company.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Hash size={20} className="text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">Código</p>
                  <p className="text-zinc-200 font-mono">{company.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileText size={20} className="text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">CNPJ</p>
                  <p className="text-zinc-200">{company.cnpj}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Mail size={20} className="text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">Email</p>
                  <p className="text-zinc-200">{company.email || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone size={20} className="text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">Telefone</p>
                  <p className="text-zinc-200">{company.phone || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">Data de Início do Contrato</p>
                  <p className="text-zinc-200">
                    {company.contract_start_date ? formatDate(company.contract_start_date) : 'Não definido'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={20} className="text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">Tempo como Cliente</p>
                  <p className="text-zinc-200">
                    {monthsAsCostumer} {monthsAsCostumer === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {company.partners && company.partners.length > 0 && (
            <div className="border-t border-zinc-800 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-zinc-500" />
                <h3 className="text-lg font-medium text-zinc-300">Sócios</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company.partners.map((partner) => (
                  <div key={partner.id} className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-zinc-200 font-medium">{partner.name}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-zinc-400">CPF: {partner.cpf}</p>
                      <p className="text-zinc-400">Email: {partner.email || 'Não informado'}</p>
                      <p className="text-zinc-400">Telefone: {partner.phone || 'Não informado'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
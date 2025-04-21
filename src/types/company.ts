export interface Company {
  id: string;
  name: string;
  tradingName: string;
  cnpj: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  maxDreLevel?: number;
}

export interface Partner {
  id: string;
  name: string;
  cpf: string;
  role: string;
  ownershipPercentage: number;
}

export interface NewCompanyData {
  name: string;
  tradingName: string;
  cnpj: string;
  phone: string;
  email: string;
  contractStartDate: string;
  isActive: boolean;
  partners: Partner[];
}
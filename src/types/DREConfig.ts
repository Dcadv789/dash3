export interface DREConfigAccount {
  id: string;
  code: string;
  name: string;
  type: 'revenue' | 'expense' | 'total' | 'flex';
  displayOrder: number;
  companyId: string;
  isEditing?: boolean;
  categoryIds?: string[];
  indicatorId?: string;
  selectedAccounts?: string[];
  parentAccountId?: string | null;
  isActive: boolean;
  isExpanded?: boolean;
  level?: number;
  sign?: 'positive' | 'negative';
}
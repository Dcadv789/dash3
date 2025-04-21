import React from 'react';
import { FolderPlus } from 'lucide-react';
import { CategoryGroup } from './CategoryGroup';
import { CategoryGroup as CategoryGroupType, Category } from '../../types/financial';

interface Company {
  id: string;
  trading_name: string;
  name: string;
}

interface CategorySectionProps {
  title: string;
  type: 'revenue' | 'expense';
  groups: CategoryGroupType[];
  categories: Category[];
  companies: Company[];
  onCreateGroup: (type: 'revenue' | 'expense') => void;
  onCreateCategory: (type: 'revenue' | 'expense', groupId?: string) => void;
  onEditGroup: (groupId: string, newName: string) => void;
  onToggleStatus: (categoryId: string, companyId: string) => void;
  onUpdateCategory: (categoryId: string, name: string, groupId: string | null) => void;
  onDeleteCategory: (categoryId: string) => void;
  getCategoryStatus: (categoryId: string, companyId: string) => boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  type,
  groups,
  categories,
  companies,
  onCreateGroup,
  onCreateCategory,
  onEditGroup,
  onToggleStatus,
  onUpdateCategory,
  onDeleteCategory,
  getCategoryStatus,
}) => {
  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
        <button
          onClick={() => onCreateGroup(type)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-2"
        >
          <FolderPlus size={16} />
          Novo Grupo
        </button>
      </div>

      <div className="space-y-4">
        {groups
          .filter(group => group.type === type)
          .map(group => {
            const groupCategories = categories.filter(
              cat => cat.group_id === group.id
            );

            return (
              <CategoryGroup
                key={group.id}
                groupName={group.name}
                groupId={group.id}
                categories={groupCategories}
                companies={companies}
                allGroups={groups}
                onAddCategory={(groupId) => onCreateCategory(type, groupId)}
                onEditGroup={onEditGroup}
                onToggleStatus={onToggleStatus}
                onUpdateCategory={onUpdateCategory}
                onDeleteCategory={onDeleteCategory}
                getCategoryStatus={getCategoryStatus}
              />
            );
          })}

        <CategoryGroup
          groupName="Sem Grupo"
          categories={categories.filter(cat => cat.type === type && !cat.group_id)}
          companies={companies}
          allGroups={groups}
          onAddCategory={() => onCreateCategory(type)}
          onEditGroup={() => {}}
          onToggleStatus={onToggleStatus}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          getCategoryStatus={getCategoryStatus}
        />
      </div>
    </div>
  );
};
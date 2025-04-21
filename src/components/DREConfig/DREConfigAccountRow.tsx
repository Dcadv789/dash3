import React from 'react';
import { Plus, Minus, Equal, Power, PencilIcon, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { DREConfigAccount } from '../../types/DREConfig';

interface DREConfigAccountRowProps {
  account: DREConfigAccount;
  level: number;
  onToggleExpansion: (accountId: string) => void;
  onToggleStatus: (accountId: string) => void;
  onStartEditing: (account: DREConfigAccount) => void;
  onMoveAccount: (accountId: string, direction: 'up' | 'down') => void;
  onDelete: (accountId: string) => void;
  childAccounts: DREConfigAccount[];
}

const TYPE_LABELS = {
  revenue: 'Receita',
  expense: 'Despesa',
  total: 'Totalizador',
  flex: 'Flexível'
};

export const DREConfigAccountRow = ({
  account,
  level,
  onToggleExpansion,
  onToggleStatus,
  onStartEditing,
  onMoveAccount,
  onDelete,
  childAccounts
}: DREConfigAccountRowProps) => {
  const hasChildren = childAccounts.length > 0;

  return (
    <React.Fragment>
      <tr className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${!account.isActive && 'opacity-50'}`}>
        <td className="px-6 py-4 w-48">
          <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren ? (
              <button
                onClick={() => onToggleExpansion(account.id)}
                className="p-1 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
              >
                {account.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="w-6" />
            )}
            <span className="text-zinc-400 font-mono">{account.code}</span>
          </div>
        </td>
        <td className="px-2 py-4">
          <div className="flex items-center gap-2">
            {account.type === 'revenue' && <Plus size={16} className="text-green-400" />}
            {account.type === 'expense' && <Minus size={16} className="text-red-400" />}
            {account.type === 'total' && <Equal size={16} className="text-blue-400" />}
            {account.type === 'flex' && (account.sign === 'positive' ? 
              <Plus size={16} className="text-zinc-400" /> : 
              <Minus size={16} className="text-zinc-400" />
            )}
            <span className="text-zinc-100">{account.name}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-3 py-1 rounded-full text-xs ${
            account.type === 'revenue' ? 'bg-green-500/20 text-green-400' :
            account.type === 'expense' ? 'bg-red-500/20 text-red-400' :
            account.type === 'total' ? 'bg-blue-500/20 text-blue-400' :
            'bg-zinc-500/20 text-zinc-400'
          }`}>
            {TYPE_LABELS[account.type]}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onToggleStatus(account.id)}
              className={`p-1 hover:bg-zinc-700 rounded-lg transition-colors ${
                account.isActive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              <Power size={16} />
            </button>
            <button
              onClick={() => onStartEditing(account)}
              className="p-1 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
            >
              <PencilIcon size={16} />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-1 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => onMoveAccount(account.id, 'up')}
              className="p-1 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={() => onMoveAccount(account.id, 'down')}
              className="p-1 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
            >
              <ArrowDown size={16} />
            </button>
          </div>
        </td>
      </tr>
      {account.isExpanded && childAccounts.map(childAccount => (
        <DREConfigAccountRow
          key={childAccount.id}
          account={childAccount}
          level={level + 1}
          onToggleExpansion={onToggleExpansion}
          onToggleStatus={onToggleStatus}
          onStartEditing={onStartEditing}
          onMoveAccount={onMoveAccount}
          onDelete={onDelete}
          childAccounts={[]}
        />
      ))}
    </React.Fragment>
  );
};
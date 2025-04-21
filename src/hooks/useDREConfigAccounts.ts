import { useState, useEffect } from 'react';
import { DREConfigAccount } from '../types/DREConfig';

const loadFromStorage = (key: string, defaultValue: any) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const saveToStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const useDREConfigAccounts = (selectedCompanyId: string) => {
  const [accounts, setAccounts] = useState<DREConfigAccount[]>(() => 
    loadFromStorage('dreconfig_accounts', [])
  );

  useEffect(() => {
    saveToStorage('dreconfig_accounts', accounts);
  }, [accounts]);

  const getChildAccounts = (accountId: string): DREConfigAccount[] => {
    return accounts.filter(acc => 
      acc.parentAccountId === accountId && 
      acc.companyId === selectedCompanyId
    );
  };

  const moveAccount = (accountId: string, direction: 'up' | 'down') => {
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    const account = accounts[accountIndex];
    
    if (!account) return;

    const siblingAccounts = accounts.filter(acc => 
      acc.parentAccountId === account.parentAccountId && 
      acc.companyId === selectedCompanyId
    ).sort((a, b) => a.displayOrder - b.displayOrder);

    const currentIndex = siblingAccounts.findIndex(acc => acc.id === accountId);
    
    if (direction === 'up' && currentIndex > 0) {
      const temp = siblingAccounts[currentIndex - 1].displayOrder;
      siblingAccounts[currentIndex - 1].displayOrder = account.displayOrder;
      siblingAccounts[currentIndex].displayOrder = temp;
    } else if (direction === 'down' && currentIndex < siblingAccounts.length - 1) {
      const temp = siblingAccounts[currentIndex + 1].displayOrder;
      siblingAccounts[currentIndex + 1].displayOrder = account.displayOrder;
      siblingAccounts[currentIndex].displayOrder = temp;
    }

    setAccounts([...accounts]);
  };

  const toggleAccountStatus = (accountId: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === accountId ? { ...acc, isActive: !acc.isActive } : acc
    ));
  };

  const toggleAccountExpansion = (accountId: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === accountId ? { ...acc, isExpanded: !acc.isExpanded } : acc
    ));
  };

  const deleteAccount = (accountId: string) => {
    // Primeiro, encontre todas as contas filhas recursivamente
    const findAllChildren = (parentId: string): string[] => {
      const children = accounts.filter(acc => acc.parentAccountId === parentId);
      return children.reduce((acc, child) => [...acc, child.id, ...findAllChildren(child.id)], [] as string[]);
    };

    const childrenIds = findAllChildren(accountId);
    const allIdsToDelete = [accountId, ...childrenIds];

    // Remove a conta e todas as suas filhas
    setAccounts(accounts.filter(acc => !allIdsToDelete.includes(acc.id)));
  };

  return {
    accounts,
    setAccounts,
    getChildAccounts,
    moveAccount,
    toggleAccountStatus,
    toggleAccountExpansion,
    deleteAccount
  };
};
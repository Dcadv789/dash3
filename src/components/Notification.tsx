import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500/10' : 'bg-red-500/10';
  const borderColor = type === 'success' ? 'border-green-500/20' : 'border-red-500/20';
  const textColor = type === 'success' ? 'text-green-400' : 'text-red-400';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`${bgColor} ${borderColor} border rounded-lg px-4 py-3 shadow-lg max-w-md`}>
        <div className="flex items-center gap-3">
          <Icon className={textColor} size={20} />
          <p className={`${textColor} flex-1`}>{message}</p>
          <button onClick={onClose} className={`${textColor} hover:opacity-70`}>
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
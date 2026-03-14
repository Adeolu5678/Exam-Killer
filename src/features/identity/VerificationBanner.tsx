'use client';

import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

import { Button } from '@/shared/ui';

interface VerificationBannerProps {
  status: 'none' | 'pending' | 'verified' | 'rejected';
  onVerifyClick: () => void;
}

export function VerificationBanner({ status, onVerifyClick }: VerificationBannerProps) {
  if (status === 'verified') return null;

  const config = {
    none: {
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
      title: 'Action Required: Verify Student Identity',
      description:
        'To maintain your free trial and access premium features, please verify your student identity.',
      className: 'bg-amber-50 border-amber-200',
      action: 'Verify Now',
    },
    pending: {
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      title: 'Verification in Progress',
      description:
        'An admin is currently reviewing your identity documents. This usually takes 24-48 hours.',
      className: 'bg-blue-50 border-blue-200',
      action: null,
    },
    rejected: {
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      title: 'Verification Rejected',
      description:
        'Your identity document was rejected. Please upload a valid document to restore access.',
      className: 'bg-red-50 border-red-200',
      action: 'Try Again',
    },
  }[status];

  if (!config) return null;

  return (
    <div className={`flex items-start gap-4 rounded-lg border p-4 ${config.className}`}>
      {config.icon}
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-900">{config.title}</h4>
        <p className="mt-1 text-sm text-gray-600">{config.description}</p>
      </div>
      {config.action && (
        <Button size="sm" onClick={onVerifyClick} className="shrink-0">
          {config.action}
        </Button>
      )}
    </div>
  );
}

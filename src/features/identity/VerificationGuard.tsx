'use client';

import React from 'react';

import { VerificationForm } from './VerificationForm';

interface VerificationGuardProps {
  status: 'none' | 'pending' | 'verified' | 'rejected';
  children: React.ReactNode;
}

export function VerificationGuard({ status, children }: VerificationGuardProps) {
  if (status === 'rejected') {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Access Restricted</h2>
          <p className="mx-auto max-w-md text-gray-600">
            Your student identity verification was rejected by an admin. Access to premium features
            is temporarily disabled until you provide a valid means of verification.
          </p>
        </div>
        <div className="w-full max-w-md">
          <VerificationForm onComplete={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import { useState, useCallback } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Spinner,
} from '@/shared/ui';

interface VerificationFormProps {
  initialInstitution?: string;
  initialMatric?: string;
  onComplete: () => void;
}

export function VerificationForm({
  initialInstitution = '',
  initialMatric = '',
  onComplete,
}: VerificationFormProps) {
  const [step, setStep] = useState(1);
  const [institution, setInstitution] = useState(initialInstitution);
  const [matricNumber, setMatricNumber] = useState(initialMatric);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = async () => {
    if (step === 1) {
      if (!institution || !matricNumber) {
        setError('Please fill in all fields');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/identity/check-matric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution, matricNumber }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Identity check failed');
        }

        setStep(2);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a verification document');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('institution', institution);
      formData.append('matricNumber', matricNumber);
      formData.append('media', file);

      const res = await fetch('/api/identity/verify', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit verification');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Verify Student Identity</CardTitle>
        <CardDescription>
          {step === 1
            ? 'Enter your school details to get started.'
            : 'Upload a proof of your student status.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <Input
              label="Institution / University"
              placeholder="e.g. University of Lagos"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              disabled={loading}
            />
            <Input
              label="Matric / Student ID Number"
              placeholder="e.g. 170805011"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
              <input
                type="file"
                id="verification-media"
                className="hidden"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="verification-media" className="block cursor-pointer space-y-2">
                <div className="text-3xl">📄</div>
                <div className="text-sm font-medium">
                  {file ? file.name : 'Click to upload ID Card or Portal Screenshot'}
                </div>
                <div className="text-xs text-gray-500">PNG, JPG up to 5MB</div>
              </label>
            </div>

            <div className="rounded bg-blue-50 p-3 text-xs text-gray-500">
              <strong>Tip:</strong> Ensure your matric number (<strong>{matricNumber}</strong>) is
              clearly visible in the image.
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step === 2 && (
          <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={step === 1 ? handleNextStep : handleSubmit}
          disabled={loading}
          className="min-w-[100px]"
        >
          {loading ? <Spinner size="sm" /> : step === 1 ? 'Next' : 'Submit'}
        </Button>
      </CardFooter>
    </Card>
  );
}

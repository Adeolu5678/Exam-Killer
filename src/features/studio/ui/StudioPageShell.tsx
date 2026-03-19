'use client';

import React, { useEffect, useState } from 'react';

import { Sparkles, Info } from 'lucide-react';

import { Badge, Spinner, Card } from '@/shared/ui';

import { getNlmNotebook } from '@/features/flashcards/api/flashcardsApi';

import { StudioCard } from './StudioCard';
import { STUDIO_OUTPUTS } from '../model/types';
import { useStudio } from '../model/useStudio';

interface StudioPageShellProps {
  workspaceId: string;
}

export const StudioPageShell: React.FC<StudioPageShellProps> = ({ workspaceId }) => {
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { jobs, triggerJob } = useStudio(workspaceId, notebookId);

  useEffect(() => {
    async function loadNotebook() {
      try {
        const notebook = await getNlmNotebook(workspaceId);
        if (notebook) {
          setNotebookId(notebook.notebook_id);
        }
      } catch (error) {
        console.error('[StudioPage] Error loading notebook:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadNotebook();
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-secondary-400">Loading Studio...</p>
      </div>
    );
  }

  if (!notebookId) {
    return (
      <Card className="mx-auto flex max-w-2xl flex-col items-center justify-center border-dashed p-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <Info className="text-amber-500" size={32} />
        </div>
        <h2 className="mb-4 text-2xl font-bold">Workspace Not Linked</h2>
        <p className="text-secondary-400 mb-8 leading-relaxed">
          The Studio requires a NotebookLM connection. Please ensure you have uploaded source
          materials to this workspace first. Once content is available, the Studio will be enabled
          for generation.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Sparkles className="text-primary-500" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Studio</h1>
            <p className="text-secondary-400 mt-1">
              Generate premium multimedia summaries of your workspace content.
            </p>
          </div>
        </div>
        <Badge variant="violet" className="px-3 py-1">
          Premium Feature
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StudioCard jobType="audio" job={jobs.audio} onTrigger={triggerJob} />
        <StudioCard jobType="video" job={jobs.video} onTrigger={triggerJob} />
        <StudioCard jobType="infographic" job={jobs.infographic} onTrigger={triggerJob} />
      </div>
    </div>
  );
};

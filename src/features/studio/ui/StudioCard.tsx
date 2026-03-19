import React from 'react';

import Image from 'next/image';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  ImageIcon as ImageLucide,
  Sparkles,
  Download,
  AlertCircle,
  Loader2,
  Headphones,
} from 'lucide-react';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from '@/shared/ui';

import styles from './StudioCard.module.css';
import { STUDIO_OUTPUTS } from '../model/types';
import type { StudioJob, StudioJobType, StudioOutputConfig } from '../model/types';

interface StudioCardProps {
  jobType: StudioJobType;
  job: StudioJob;
  onTrigger: (type: StudioJobType) => void;
}

const ICON_MAP: Record<string, any> = {
  Headphones,
  Video,
  Image: ImageLucide,
};

export const StudioCard: React.FC<StudioCardProps> = ({ jobType, job, onTrigger }) => {
  const config: StudioOutputConfig = STUDIO_OUTPUTS[jobType];
  const Icon = ICON_MAP[config.icon] || Headphones;

  const isIdle = job.status === 'idle';
  const isProcessing = job.status === 'pending' || job.status === 'processing';
  const isDone = job.status === 'done';
  const isError = job.status === 'error';

  return (
    <Card className={styles.card}>
      <CardHeader>
        <div className={styles.headerRow}>
          <div className={`${styles.iconWrapper} ${styles[jobType]}`}>
            <Icon size={20} className={styles.icon} />
          </div>
          <Badge variant="outline" className={styles.estimate}>
            {config.estimatedMinutes}
          </Badge>
        </div>
        <CardTitle className={styles.title}>{config.label}</CardTitle>
        <CardDescription className={styles.description}>{config.description}</CardDescription>
      </CardHeader>

      <CardContent className={styles.content}>
        <AnimatePresence mode="wait">
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.idleState}
            >
              <div className={styles.illustration}>
                <Sparkles size={40} className={styles.sparkleIcon} />
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.processingState}
            >
              <Loader2 className={styles.spinner} />
              <p className={styles.statusText}>Generating {config.label}...</p>
              <div className={styles.progressDots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </motion.div>
          )}

          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={styles.doneState}
            >
              {jobType === 'audio' && job.result_url && (
                <div className={styles.playerWrapper}>
                  <audio controls className={styles.audioPlayer}>
                    <source src={job.result_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {jobType === 'video' && job.result_url && (
                <div className={styles.playerWrapper}>
                  <video controls className={styles.videoPlayer}>
                    <source src={job.result_url} type="video/mp4" />
                    Your browser does not support the video element.
                  </video>
                </div>
              )}

              {jobType === 'infographic' && job.result_url && (
                <div className={styles.imageWrapper}>
                  <Image
                    src={job.result_url}
                    alt={config.label}
                    fill
                    className={styles.infographicImage}
                  />
                </div>
              )}
            </motion.div>
          )}

          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.errorState}
            >
              <AlertCircle className={styles.errorIcon} />
              <p className={styles.errorText}>
                {job.error_message || 'An error occurred during generation.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className={styles.footer}>
        {isDone ? (
          <Button
            variant="outline"
            className={styles.actionButton}
            onClick={() => window.open(job.result_url!, '_blank')}
          >
            <Download size={16} className="mr-2" />
            Download
          </Button>
        ) : (
          <Button
            className={styles.actionButton}
            onClick={() => onTrigger(jobType)}
            disabled={isProcessing}
            variant={isError ? 'secondary' : 'primary'}
          >
            {isProcessing ? 'Generating...' : isError ? 'Retry' : 'Generate'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

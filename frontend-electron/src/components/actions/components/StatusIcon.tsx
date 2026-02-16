import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import type { StepStatus } from '../types';

export function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'idle':
      return <Circle className="h-4 w-4 text-slate-300 shrink-0" />;
  }
}
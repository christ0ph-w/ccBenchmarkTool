import { StatusIcon } from './StatusIcon';
import type { ValidationStep } from '../types';

export function StepList({ steps }: { steps: ValidationStep[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2 text-sm">
          <StatusIcon status={step.status} />
          <span className={step.status === 'warning' ? 'text-amber-700' : 'text-foreground'}>
            {step.label}
          </span>
          {step.detail && (
            <span
              className={`text-xs ml-auto truncate max-w-[140px] ${
                step.status === 'ok' ? 'text-muted-foreground' : 'text-amber-600 italic'
              }`}
            >
              {step.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

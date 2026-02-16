export type StepStatus = 'ok' | 'warning' | 'idle';

export interface ValidationStep {
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface SettingsItem {
  label: string;
  value: string;
}
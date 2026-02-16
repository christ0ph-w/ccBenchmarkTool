import { Settings } from 'lucide-react';
import type { SettingsItem } from '../types';

export function SettingsSummary({ items }: { items: SettingsItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 p-2 rounded bg-muted">
      <div className="flex items-center gap-1 mb-1">
        <Settings className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Current Settings</span>
      </div>
      <div className="text-xs text-foreground">
        {items.map((item, index) => (
          <span key={item.label}>
            <span className="text-muted-foreground">{item.label}:</span>{' '}
            <span className="font-medium">{item.value}</span>
            {index < items.length - 1 && (
              <span className="text-muted-foreground">, </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
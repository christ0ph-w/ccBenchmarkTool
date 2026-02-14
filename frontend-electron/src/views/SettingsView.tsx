import { Button } from '@/components/ui/button';
import { ClusteringSettingsPanel } from '@/components/settings/ClusteringSettingsPanel';
import { BenchmarkingSettingsPanel } from '@/components/settings/BenchmarkingSettingsPanel';
import { useSettingsStore } from '@/stores/settingsStore';

export function SettingsView() {
  const { clearAllSettings } = useSettingsStore();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-semibold">Configuration Settings</h2>
        <Button
          variant="outline"
          onClick={clearAllSettings}
          className="bg-destructive/10 hover:bg-destructive/20 text-destructive"
        >
          Clear All Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <ClusteringSettingsPanel />
        <BenchmarkingSettingsPanel />
      </div>
    </div>
  );
}
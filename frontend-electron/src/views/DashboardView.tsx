import { FileExplorer } from "@/components/file-explorer/FileExplorer";
import { ConsolePanel } from "@/components/console/ConsolePanel";
import { ActionsPanel } from "@/components/actions/ActionsPanel";

export function DashboardView() {
  return (
    <div className="grid grid-rows-[1fr_auto] h-full gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="min-h-0 overflow-auto">
          <FileExplorer />
        </div>
        <div className="min-h-0 overflow-auto">
          <ActionsPanel />
        </div>
      </div>

      <div className="min-h-0 overflow-auto border rounded-lg h-[25vh]">
        <ConsolePanel />
      </div>
    </div>
  );
}
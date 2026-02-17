import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, Image, FileImage, FileText } from 'lucide-react';
import { ComparisonData, ChartType } from '@/types/comparisonTypes';
import { SkipRateChart } from './charts/SkipRateChart';
import { SpeedupChart } from './charts/SpeedupChart';
import { TradeoffChart } from './charts/TradeoffChart';
import { exportChartAsSvg, exportChartAsPng, exportChartAsPdf } from '@/lib/chartExport';

interface ComparisonViewProps {
  comparison: ComparisonData;
  onBack: () => void;
}

export function ComparisonView({ comparison, onBack }: ComparisonViewProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('speedup');
  const chartRef = useRef<HTMLDivElement>(null);

  const chartTabs: { id: ChartType; label: string }[] = [
    { id: 'tradeoff', label: 'Trade-off' },
    { id: 'speedup', label: 'Speedup' },
    { id: 'skipRate', label: 'Skip Rate' },
  ];

  const handleExportJson = () => {
    const dataStr = JSON.stringify(comparison, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${comparison.comparisonId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getChartFilename = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${activeChart}_${timestamp}`;
  };

  const handleExportSvg = async () => {
    if (!chartRef.current) return;
    await exportChartAsSvg(chartRef.current, getChartFilename());
  };

  const handleExportPng = async () => {
    if (!chartRef.current) return;
    await exportChartAsPng(chartRef.current, getChartFilename());
  };

  const handleExportPdf = async () => {
    if (!chartRef.current) return;
    await exportChartAsPdf(chartRef.current, getChartFilename());
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Results
            </Button>
            <div>
              <h1 className="text-xl font-bold">Comparison</h1>
              <p className="text-sm text-muted-foreground">
                {comparison.series.length} results
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSvg} title="Export as SVG">
              <FileImage className="h-4 w-4 mr-2" />
              SVG
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPng} title="Export as PNG">
              <Image className="h-4 w-4 mr-2" />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} title="Export as PDF">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {chartTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeChart === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card className="p-6">
          <div ref={chartRef}>
            {activeChart === 'tradeoff' && (
              <TradeoffChart series={comparison.series} />
            )}
            {activeChart === 'skipRate' && (
              <SkipRateChart series={comparison.series} />
            )}
            {activeChart === 'speedup' && (
              <SpeedupChart series={comparison.series} />
            )}
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h3 className="font-semibold mb-4">Comparison Data</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Log</th>
                  <th className="text-left py-2 px-3">Config</th>
                  <th className="text-left py-2 px-3">Split</th>
                  <th className="text-right py-2 px-3">Fitness</th>
                  <th className="text-right py-2 px-3">Fitness Loss</th>
                  <th className="text-right py-2 px-3">Compute (ms)</th>
                  <th className="text-right py-2 px-3">Speedup</th>
                  <th className="text-right py-2 px-3">Skip Rate</th>
                  <th className="text-right py-2 px-3">Variants</th>
                </tr>
              </thead>
              <tbody>
                {comparison.series.map((s) => (
                  <tr key={s.benchmarkId} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{s.logName}</td>
                    <td className="py-2 px-3">{s.label}</td>
                    <td className="py-2 px-3">{s.splitType}</td>
                    <td className="py-2 px-3 text-right">{(s.avgFitness * 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right">
                      {s.fitnessLoss !== null ? `${s.fitnessLoss.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">{s.totalComputeTimeMs.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      {s.speedup !== null ? `${s.speedup.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">{s.skipRate.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right">{s.totalVariants}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
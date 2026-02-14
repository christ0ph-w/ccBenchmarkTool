import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlgorithmParameter } from '@/config/clusteringAlgorithms';
import { Checkbox } from '@/components/ui/checkbox';

interface ParameterInputProps {
  parameter: AlgorithmParameter;
  value: any;
  onChange: (value: any) => void;
  allParams?: Record<string, any>;
}

export const ParameterInput: React.FC<ParameterInputProps> = ({
  parameter,
  value,
  onChange,
  allParams = {},
}) => {
  if (parameter.condition && !parameter.condition(allParams)) {
    return null;
  }

  if (parameter.type === 'toggle') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={parameter.key}
            checked={value}
            onCheckedChange={onChange}
          />
          <Label htmlFor={parameter.key} className="font-normal cursor-pointer">
            {parameter.label}
          </Label>
        </div>
        {parameter.description && (
          <span className="text-xs text-muted-foreground block ml-6">
            {parameter.description}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={parameter.key}>
        {parameter.label}
        {parameter.description && (
          <span className="text-xs text-muted-foreground block mt-1">
            {parameter.description}
          </span>
        )}
      </Label>

      {parameter.type === 'number' && (
        <Input
          id={parameter.key}
          type="number"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step || 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || parameter.default)}
        />
      )}

      {parameter.type === 'slider' && (
        <div className="flex gap-3 items-center">
          <input
            id={parameter.key}
            type="range"
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium min-w-12 text-right">
            {parseFloat(value).toFixed(1)}
          </span>
        </div>
      )}

      {parameter.type === 'select' && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={parameter.key}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parameter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
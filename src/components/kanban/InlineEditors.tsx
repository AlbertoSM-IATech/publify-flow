import { Priority, TaskStatus } from '@/types/kanban';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Crítica', color: '#EF4444' },
  { value: 'high', label: 'Alta', color: '#FB923C' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'low', label: 'Baja', color: '#22C55E' },
];

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Sin empezar', color: '#6B7280' },
  { value: 'in_progress', label: 'En curso', color: '#3B82F6' },
  { value: 'paused', label: 'Pausado', color: '#F59E0B' },
  { value: 'waiting', label: 'En espera', color: '#8B5CF6' },
  { value: 'completed', label: 'Terminado', color: '#22C55E' },
  { value: 'archived', label: 'Archivado', color: '#6B7280' },
];

interface InlinePrioritySelectProps {
  value: Priority;
  onChange: (value: Priority) => void;
  compact?: boolean;
}

export function InlinePrioritySelect({ value, onChange, compact = false }: InlinePrioritySelectProps) {
  const currentPriority = priorityOptions.find(p => p.value === value) || priorityOptions[2];
  
  return (
    <Select value={value} onValueChange={(v: Priority) => onChange(v)}>
      <SelectTrigger 
        className={cn(
          "border-0 bg-transparent hover:bg-muted p-1",
          compact ? "h-6 w-auto min-w-0" : "h-7"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
            compact && "px-1"
          )}
          style={{
            backgroundColor: `${currentPriority.color}20`,
            color: currentPriority.color,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentPriority.color }}
          />
          {!compact && currentPriority.label}
        </span>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {priorityOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface InlineStatusSelectProps {
  value: TaskStatus;
  onChange: (value: TaskStatus) => void;
  compact?: boolean;
}

export function InlineStatusSelect({ value, onChange, compact = false }: InlineStatusSelectProps) {
  const currentStatus = statusOptions.find(s => s.value === value) || statusOptions[0];
  
  return (
    <Select value={value} onValueChange={(v: TaskStatus) => onChange(v)}>
      <SelectTrigger 
        className={cn(
          "border-0 bg-transparent hover:bg-muted p-1",
          compact ? "h-6 w-auto min-w-0" : "h-7"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
            compact && "px-1"
          )}
          style={{
            backgroundColor: `${currentStatus.color}20`,
            color: currentStatus.color,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentStatus.color }}
          />
          {!compact && currentStatus.label}
        </span>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {statusOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

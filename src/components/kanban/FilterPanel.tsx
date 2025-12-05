import { X } from 'lucide-react';
import { Filter, Priority, Tag } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  availableTags: Tag[];
}

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Crítica', color: '#EF4444' },
  { value: 'high', label: 'Alta', color: '#FB923C' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'low', label: 'Baja', color: '#22C55E' },
];

export function FilterPanel({ filter, setFilter, availableTags }: FilterPanelProps) {
  const togglePriority = (priority: Priority) => {
    if (filter.priority.includes(priority)) {
      setFilter({ ...filter, priority: filter.priority.filter(p => p !== priority) });
    } else {
      setFilter({ ...filter, priority: [...filter.priority, priority] });
    }
  };

  const toggleTag = (tagId: string) => {
    if (filter.tags.includes(tagId)) {
      setFilter({ ...filter, tags: filter.tags.filter(t => t !== tagId) });
    } else {
      setFilter({ ...filter, tags: [...filter.tags, tagId] });
    }
  };

  const clearFilters = () => {
    setFilter({
      priority: [],
      tags: [],
      assignee: null,
      dueDate: { from: null, to: null },
      search: '',
    });
  };

  const hasFilters = filter.priority.length > 0 || filter.tags.length > 0 || filter.assignee;

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-foreground">Filtros activos</h4>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Priority Filter */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Prioridad</label>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => togglePriority(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  filter.priority.includes(opt.value)
                    ? "border-transparent"
                    : "border-border bg-card hover:bg-muted"
                )}
                style={filter.priority.includes(opt.value) ? {
                  backgroundColor: `${opt.color}20`,
                  color: opt.color,
                  borderColor: opt.color,
                } : {}}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  filter.tags.includes(tag.id)
                    ? "border-transparent"
                    : "border-border bg-card hover:bg-muted"
                )}
                style={filter.tags.includes(tag.id) ? {
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                  borderColor: tag.color,
                } : {}}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

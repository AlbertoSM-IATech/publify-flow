import { X, Globe, Archive, User, Calendar, Tag as TagIcon, AlertCircle } from 'lucide-react';
import { Filter, Priority, Tag, TaskStatus } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Complete list of Amazon marketplaces for filtering
const AMAZON_MARKETS = [
  { value: '.com', label: 'Amazon.com', region: '🇺🇸' },
  { value: '.ca', label: 'Amazon.ca', region: '🇨🇦' },
  { value: '.com.mx', label: 'Amazon.com.mx', region: '🇲🇽' },
  { value: '.com.br', label: 'Amazon.com.br', region: '🇧🇷' },
  { value: '.co.uk', label: 'Amazon.co.uk', region: '🇬🇧' },
  { value: '.de', label: 'Amazon.de', region: '🇩🇪' },
  { value: '.fr', label: 'Amazon.fr', region: '🇫🇷' },
  { value: '.es', label: 'Amazon.es', region: '🇪🇸' },
  { value: '.it', label: 'Amazon.it', region: '🇮🇹' },
  { value: '.nl', label: 'Amazon.nl', region: '🇳🇱' },
  { value: '.se', label: 'Amazon.se', region: '🇸🇪' },
  { value: '.pl', label: 'Amazon.pl', region: '🇵🇱' },
  { value: '.com.tr', label: 'Amazon.com.tr', region: '🇹🇷' },
  { value: '.ae', label: 'Amazon.ae', region: '🇦🇪' },
  { value: '.sa', label: 'Amazon.sa', region: '🇸🇦' },
  { value: '.in', label: 'Amazon.in', region: '🇮🇳' },
  { value: '.co.jp', label: 'Amazon.co.jp', region: '🇯🇵' },
  { value: '.com.au', label: 'Amazon.com.au', region: '🇦🇺' },
  { value: '.sg', label: 'Amazon.sg', region: '🇸🇬' },
];

interface CompactFilterPanelProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  availableTags: Tag[];
  uniqueAssignees: string[];
}

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
];

export function CompactFilterPanel({ filter, setFilter, availableTags, uniqueAssignees }: CompactFilterPanelProps) {
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

  const setMarket = (market: string | null) => {
    setFilter({ ...filter, market: market === 'all' ? null : market });
  };

  const setAssignee = (assignee: string | null) => {
    setFilter({ ...filter, assignee: assignee === 'all' ? null : assignee });
  };

  const toggleShowArchived = () => {
    setFilter({ ...filter, showArchived: !filter.showArchived });
  };

  const clearFilters = () => {
    setFilter({
      priority: [],
      tags: [],
      assignee: null,
      dueDate: { from: null, to: null },
      search: '',
      market: null,
      showArchived: false,
    });
  };

  const hasFilters = filter.priority.length > 0 || filter.tags.length > 0 || filter.assignee || filter.market || filter.showArchived || filter.dueDate.from || filter.dueDate.to;
  const activeFilterCount = filter.priority.length + filter.tags.length + (filter.assignee ? 1 : 0) + (filter.market ? 1 : 0) + (filter.dueDate.from || filter.dueDate.to ? 1 : 0);

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-foreground">Filtros</h4>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Limpiar ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* 6-Column Grid of Dropdowns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Priority Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-between h-9",
                filter.priority.length > 0 && "border-primary bg-primary/5"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {filter.priority.length > 0 
                    ? `${filter.priority.length} prioridad${filter.priority.length > 1 ? 'es' : ''}`
                    : 'Prioridad'}
                </span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => togglePriority(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                    filter.priority.includes(opt.value)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Tags Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-between h-9",
                filter.tags.length > 0 && "border-primary bg-primary/5"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <TagIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {filter.tags.length > 0 
                    ? `${filter.tags.length} etiqueta${filter.tags.length > 1 ? 's' : ''}`
                    : 'Etiquetas'}
                </span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableTags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No hay etiquetas</p>
              ) : (
                availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                      filter.tags.includes(tag.id)
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span 
                      className="truncate"
                      style={{ color: filter.tags.includes(tag.id) ? tag.color : undefined }}
                    >
                      {tag.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Market Dropdown */}
        <Select value={filter.market || 'all'} onValueChange={setMarket}>
          <SelectTrigger className={cn(
            "h-9",
            filter.market && "border-primary bg-primary/5"
          )}>
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {filter.market || 'Mercado'}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los mercados</SelectItem>
            {AMAZON_MARKETS.map(market => (
              <SelectItem key={market.value} value={market.value}>
                <span className="flex items-center gap-1.5">
                  <span>{market.region}</span>
                  <span>{market.value}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee Dropdown */}
        <Select value={filter.assignee || 'all'} onValueChange={setAssignee}>
          <SelectTrigger className={cn(
            "h-9",
            filter.assignee && "border-primary bg-primary/5"
          )}>
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {filter.assignee || 'Asignado'}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueAssignees.map(assignee => (
              <SelectItem key={assignee} value={assignee}>
                {assignee}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-between h-9",
                (filter.dueDate.from || filter.dueDate.to) && "border-primary bg-primary/5"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Fechas</span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={filter.dueDate.from ? filter.dueDate.from.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilter({
                    ...filter,
                    dueDate: { ...filter.dueDate, from: e.target.value ? new Date(e.target.value) : null }
                  })}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={filter.dueDate.to ? filter.dueDate.to.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFilter({
                    ...filter,
                    dueDate: { ...filter.dueDate, to: e.target.value ? new Date(e.target.value) : null }
                  })}
                  className="h-8"
                />
              </div>
              {(filter.dueDate.from || filter.dueDate.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setFilter({
                    ...filter,
                    dueDate: { from: null, to: null }
                  })}
                >
                  Limpiar fechas
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Show Archived Toggle */}
        <div className={cn(
          "flex items-center justify-between px-3 rounded-md border h-9",
          filter.showArchived ? "border-primary bg-primary/5" : "border-border"
        )}>
          <span className="flex items-center gap-2 text-sm">
            <Archive className="w-4 h-4" />
            <span className="hidden lg:inline">Archivadas</span>
          </span>
          <Switch
            checked={filter.showArchived}
            onCheckedChange={toggleShowArchived}
            className="scale-75"
          />
        </div>
      </div>
    </div>
  );
}

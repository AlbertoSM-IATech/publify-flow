import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, Calendar, Tag, User, Clock, Trash2, Copy, MoreHorizontal,
  CheckSquare, Plus, AlertCircle, FileText, Archive, Circle,
  Search, Layout, Edit3, Palette, CheckCircle, Upload,
  TrendingUp, Megaphone, Settings, Check, Folder, Globe, GripVertical,
  Link, Lock, AlertTriangle
} from 'lucide-react';
import { Task, Column, Tag as TagType, Priority, TaskStatus } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  layout: <Layout className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  edit: <Edit3 className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  'check-circle': <CheckCircle className="w-4 h-4" />,
  upload: <Upload className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  megaphone: <Megaphone className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  check: <Check className="w-4 h-4" />,
  folder: <Folder className="w-4 h-4" />,
};

const AMAZON_MARKETS = [
  { value: 'none', label: 'Sin mercado' },
  { value: '.com', label: 'Amazon.com (US)', region: '🇺🇸' },
  { value: '.ca', label: 'Amazon.ca (Canadá)', region: '🇨🇦' },
  { value: '.com.mx', label: 'Amazon.com.mx (México)', region: '🇲🇽' },
  { value: '.com.br', label: 'Amazon.com.br (Brasil)', region: '🇧🇷' },
  { value: '.co.uk', label: 'Amazon.co.uk (UK)', region: '🇬🇧' },
  { value: '.de', label: 'Amazon.de (Alemania)', region: '🇩🇪' },
  { value: '.fr', label: 'Amazon.fr (Francia)', region: '🇫🇷' },
  { value: '.es', label: 'Amazon.es (España)', region: '🇪🇸' },
  { value: '.it', label: 'Amazon.it (Italia)', region: '🇮🇹' },
  { value: '.nl', label: 'Amazon.nl (Países Bajos)', region: '🇳🇱' },
  { value: '.se', label: 'Amazon.se (Suecia)', region: '🇸🇪' },
  { value: '.pl', label: 'Amazon.pl (Polonia)', region: '🇵🇱' },
  { value: '.com.tr', label: 'Amazon.com.tr (Turquía)', region: '🇹🇷' },
  { value: '.ae', label: 'Amazon.ae (EAU)', region: '🇦🇪' },
  { value: '.sa', label: 'Amazon.sa (Arabia Saudí)', region: '🇸🇦' },
  { value: '.in', label: 'Amazon.in (India)', region: '🇮🇳' },
  { value: '.co.jp', label: 'Amazon.co.jp (Japón)', region: '🇯🇵' },
  { value: '.com.au', label: 'Amazon.com.au (Australia)', region: '🇦🇺' },
  { value: '.sg', label: 'Amazon.sg (Singapur)', region: '🇸🇬' },
];

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Sin empezar', color: '#6B7280' },
  { value: 'in_progress', label: 'En curso', color: '#3B82F6' },
  { value: 'paused', label: 'Pausado', color: '#F59E0B' },
  { value: 'waiting', label: 'En espera', color: '#8B5CF6' },
  { value: 'completed', label: 'Terminado', color: '#22C55E' },
  { value: 'archived', label: 'Archivado', color: '#6B7280' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Crítica', color: '#EF4444' },
  { value: 'high', label: 'Alta', color: '#FB923C' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'low', label: 'Baja', color: '#22C55E' },
];

interface TaskDetailPanelProps {
  task: Task;
  columns: Column[];
  availableTags: TagType[];
  allTasks: Task[]; // For dependency selection
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
  onDeleteChecklistItem: (itemId: string) => void;
  // Dependency callbacks
  onAddDependency?: (dependsOnTaskId: string) => void;
  onRemoveDependency?: (dependencyId: string) => void;
  // Dependency status
  isBlocked?: boolean;
  blockingTasks?: Task[];
  wouldCreateCycle?: (dependsOnTaskId: string) => boolean;
}

const MIN_PANEL_WIDTH = 400;
const MAX_PANEL_WIDTH = 900;
const DEFAULT_PANEL_WIDTH = 640;

// ============= Dependencies Section Component =============
interface DependenciesSectionProps {
  task: Task;
  allTasks: Task[];
  onAddDependency?: (dependsOnTaskId: string) => void;
  onRemoveDependency?: (dependencyId: string) => void;
  wouldCreateCycle?: (dependsOnTaskId: string) => boolean;
}

function DependenciesSection({
  task,
  allTasks,
  onAddDependency,
  onRemoveDependency,
  wouldCreateCycle,
}: DependenciesSectionProps) {
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleError, setCycleError] = useState<string | null>(null);

  const dependencies = task.taskDependencies || [];
  
  // Get tasks that are already dependencies
  const dependencyTaskIds = new Set(dependencies.map(d => d.dependsOnTaskId));
  
  // Filter available tasks for the dropdown
  const availableForDependency = useMemo(() => {
    return allTasks.filter(t => 
      t.id !== task.id && // Not the current task
      !dependencyTaskIds.has(t.id) && // Not already a dependency
      !t.isArchived // Not archived
    );
  }, [allTasks, task.id, dependencyTaskIds]);

  // Search filtered tasks
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return availableForDependency;
    const query = searchQuery.toLowerCase();
    return availableForDependency.filter(t => 
      t.title.toLowerCase().includes(query)
    );
  }, [availableForDependency, searchQuery]);

  const handleAddDependency = (dependsOnTaskId: string) => {
    // Check for cycles
    if (wouldCreateCycle && wouldCreateCycle(dependsOnTaskId)) {
      setCycleError('No se puede añadir: crearía un ciclo de dependencias');
      setTimeout(() => setCycleError(null), 3000);
      return;
    }
    
    onAddDependency?.(dependsOnTaskId);
    setShowAddDependency(false);
    setSearchQuery('');
    setCycleError(null);
  };

  const handleRemoveDependency = (dependencyId: string) => {
    onRemoveDependency?.(dependencyId);
  };

  // Get the task object for each dependency
  const dependencyTasks = useMemo(() => {
    return dependencies.map(dep => {
      const depTask = allTasks.find(t => t.id === dep.dependsOnTaskId);
      return { dependency: dep, task: depTask };
    }).filter(item => item.task !== undefined);
  }, [dependencies, allTasks]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link className="w-4 h-4" />
          Dependencias (prerequisitos)
        </label>
        <span className="text-xs text-muted-foreground">
          {dependencyTasks.length} {dependencyTasks.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {/* Cycle Error */}
      {cycleError && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {cycleError}
        </div>
      )}

      {/* Dependencies List */}
      {dependencyTasks.length > 0 && (
        <div className="space-y-2">
          {dependencyTasks.map(({ dependency, task: depTask }) => {
            if (!depTask) return null;
            const isCompleted = depTask.status === 'completed' || depTask.isArchived;
            return (
              <div
                key={dependency.id}
                className={cn(
                  "flex items-center gap-3 group p-2 rounded-lg transition-colors",
                  isCompleted ? "bg-muted/30" : "bg-amber-500/10 border border-amber-500/20"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <span className={cn(
                  "flex-1 text-sm truncate",
                  isCompleted && "text-muted-foreground line-through"
                )}>
                  {depTask.title}
                </span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  isCompleted 
                    ? "bg-green-500/20 text-green-600"
                    : "bg-amber-500/20 text-amber-600"
                )}>
                  {isCompleted ? 'Completada' : 'Pendiente'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemoveDependency(dependency.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dependency */}
      {showAddDependency ? (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarea..."
              className="h-8"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setShowAddDependency(false);
                setSearchQuery('');
                setCycleError(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                {availableForDependency.length === 0 
                  ? 'No hay tareas disponibles'
                  : 'No se encontraron tareas'}
              </p>
            ) : (
              filteredTasks.slice(0, 10).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleAddDependency(t.id)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm transition-colors flex items-center gap-2"
                >
                  <Circle className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate">{t.title}</span>
                </button>
              ))
            )}
            {filteredTasks.length > 10 && (
              <p className="text-xs text-muted-foreground py-1 text-center">
                +{filteredTasks.length - 10} más...
              </p>
            )}
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddDependency(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir dependencia
        </Button>
      )}

      {dependencyTasks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Esta tarea no puede completarse hasta que las tareas pendientes estén terminadas.
        </p>
      )}
    </div>
  );
}

export function TaskDetailPanel({
  task,
  columns,
  availableTags,
  allTasks,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onArchive,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddDependency,
  onRemoveDependency,
  isBlocked = false,
  blockingTasks = [],
  wouldCreateCycle,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task.id, task.title, task.description]);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${Math.min(descriptionRef.current.scrollHeight, 200)}px`;
    }
  }, [description]);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleTitleBlur = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitle(task.title);
      return;
    }
    if (trimmedTitle !== task.title) {
      onUpdate({ title: trimmedTitle });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onUpdate({ description });
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      onAddChecklistItem(newChecklistItem.trim());
      setNewChecklistItem('');
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdate({ status: newStatus });
    if (newStatus === 'archived') {
      onUpdate({ isArchived: true, status: newStatus });
    } else if (task.isArchived) {
      onUpdate({ isArchived: false, status: newStatus });
    }
  };

  // Use subtasks instead of checklist
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 
    ? (completedSubtasks / subtasks.length) * 100 
    : 0;

  const currentStatus = statusOptions.find(s => s.value === task.status) || statusOptions[0];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full bg-card border-l border-border shadow-xl z-50 animate-slide-in-right flex flex-col overflow-hidden"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group",
            "hover:bg-primary/50 transition-colors",
            isResizing && "bg-primary"
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Select
              value={task.columnId}
              onValueChange={(value) => onUpdate({ columnId: value })}
            >
              <SelectTrigger className="w-auto h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    <span className="flex items-center gap-2">
                      <span style={{ color: col.color }}>{iconMap[col.icon] || <Folder className="w-4 h-4" />}</span>
                      {col.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Blocked Badge */}
            {isBlocked && blockingTasks.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-medium">
                      <Lock className="w-3 h-3" />
                      Bloqueada
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">Depende de:</p>
                    <ul className="text-xs space-y-0.5">
                      {blockingTasks.map(bt => (
                        <li key={bt.id} className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          {bt.title}
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  {task.isArchived ? 'Desarchivar' : 'Archivar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="text-xl font-heading font-semibold border-none bg-transparent px-0 focus-visible:ring-0 h-auto"
                placeholder="Título de la tarea"
              />
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Estado
              </label>
              <Select
                value={task.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentStatus.color }}
                      />
                      {currentStatus.label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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
            </div>

            {/* Quick Properties */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Prioridad
                </label>
                <Select
                  value={task.priority}
                  onValueChange={(value: Priority) => onUpdate({ priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Asignado
                </label>
                <Input
                  value={task.assignee || ''}
                  onChange={(e) => onUpdate({ assignee: e.target.value || null })}
                  placeholder="Sin asignar"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de inicio
                </label>
                <Input
                  type="date"
                  value={task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => onUpdate({ startDate: e.target.value ? new Date(e.target.value) : null })}
                  className="w-full"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de fin
                </label>
                <Input
                  type="date"
                  value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => onUpdate({ dueDate: e.target.value ? new Date(e.target.value) : null })}
                  className="w-full"
                />
              </div>

              {/* Time Estimate */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tiempo estimado (h)
                </label>
                <Input
                  type="number"
                  value={task.estimatedTime || ''}
                  onChange={(e) => onUpdate({ estimatedTime: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </div>

              {/* Time Actual */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tiempo real (h)
                </label>
                <Input
                  type="number"
                  value={task.actualTime || ''}
                  onChange={(e) => onUpdate({ actualTime: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Market Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Mercado
              </label>
              <Select
                value={task.relatedMarket || 'none'}
                onValueChange={(value) => onUpdate({ relatedMarket: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mercado" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {AMAZON_MARKETS.map(market => (
                    <SelectItem key={market.value} value={market.value}>
                      <span className="flex items-center gap-2">
                        {market.region && <span>{market.region}</span>}
                        {market.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const isSelected = task.tags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (isSelected) {
                          onUpdate({ tags: task.tags.filter(t => t.id !== tag.id) });
                        } else {
                          onUpdate({ tags: [...task.tags, tag] });
                        }
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium border transition-all",
                        isSelected
                          ? "border-transparent"
                          : "border-border bg-transparent hover:bg-muted"
                      )}
                      style={isSelected ? {
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: tag.color,
                      } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Usa el gestor de etiquetas (icono 🏷️ en la cabecera) para crear, editar o eliminar etiquetas.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Descripción
              </label>
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Añade una descripción..."
                className="w-full min-h-[80px] max-h-[200px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ overflow: 'hidden' }}
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Subtareas
                </label>
                {subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedSubtasks}/{subtasks.length} ({Math.round(subtaskProgress)}%)
                  </span>
                )}
              </div>
              
              {subtasks.length > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      subtaskProgress === 100 ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {subtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 group p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => onToggleChecklistItem(subtask.id)}
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      subtask.completed && "line-through text-muted-foreground"
                    )}>
                      {subtask.title}
                    </span>
                    {subtask.assignedTo && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {subtask.assignedTo}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteChecklistItem(subtask.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Añadir subtarea..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklistItem();
                  }}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddChecklistItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dependencies Section */}
            <DependenciesSection
              task={task}
              allTasks={allTasks}
              onAddDependency={onAddDependency}
              onRemoveDependency={onRemoveDependency}
              wouldCreateCycle={wouldCreateCycle}
            />

            {/* Metadata */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <p>Creada: {format(new Date(task.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}</p>
              {task.startDate && <p>Inicio: {format(new Date(task.startDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>}
              {task.dueDate && <p>Fin: {format(new Date(task.dueDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
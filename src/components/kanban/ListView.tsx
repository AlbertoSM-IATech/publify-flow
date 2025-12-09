import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, Calendar, User, Tag, AlertCircle, Globe, Circle,
  Search, Layout, FileText, Edit3, Palette, CheckCircle, Upload,
  TrendingUp, Megaphone, Settings, Check, Folder, GripVertical
} from 'lucide-react';
import { Task, Column, Priority, TaskStatus } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Icon mapping for rendering column icons in list view
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-3.5 h-3.5" />,
  layout: <Layout className="w-3.5 h-3.5" />,
  'file-text': <FileText className="w-3.5 h-3.5" />,
  edit: <Edit3 className="w-3.5 h-3.5" />,
  palette: <Palette className="w-3.5 h-3.5" />,
  'check-circle': <CheckCircle className="w-3.5 h-3.5" />,
  upload: <Upload className="w-3.5 h-3.5" />,
  'trending-up': <TrendingUp className="w-3.5 h-3.5" />,
  megaphone: <Megaphone className="w-3.5 h-3.5" />,
  settings: <Settings className="w-3.5 h-3.5" />,
  check: <Check className="w-3.5 h-3.5" />,
  folder: <Folder className="w-3.5 h-3.5" />,
};

interface ListViewProps {
  tasks: Task[];
  columns: Column[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

type SortField = 'title' | 'priority' | 'dueDate' | 'createdAt' | 'status' | 'assignee' | 'market' | 'taskStatus';
type SortDirection = 'asc' | 'desc';

const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: '#EF4444' },
  high: { label: 'Alta', color: '#FB923C' },
  medium: { label: 'Media', color: '#F59E0B' },
  low: { label: 'Baja', color: '#22C55E' },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  not_started: { label: 'Sin empezar', color: '#6B7280' },
  in_progress: { label: 'En curso', color: '#3B82F6' },
  paused: { label: 'Pausado', color: '#F59E0B' },
  waiting: { label: 'En espera', color: '#8B5CF6' },
  archived: { label: 'Archivado', color: '#6B7280' },
  completed: { label: 'Terminado', color: '#22C55E' },
};

// Default column widths
const DEFAULT_WIDTHS = {
  title: 220,
  taskStatus: 110,
  status: 130,
  priority: 90,
  dueDate: 110,
  assignee: 130,
  market: 80,
  tags: 150,
};

export function ListView({ tasks, columns, onTaskClick, onUpdateTask }: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [columnWidths, setColumnWidths] = useState(DEFAULT_WIDTHS);
  const [resizing, setResizing] = useState<{ field: keyof typeof DEFAULT_WIDTHS; startX: number; startWidth: number } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter out archived tasks
  const activeTasks = tasks.filter(task => !task.isArchived);

  const sortedTasks = [...activeTasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'status':
        const colA = columns.findIndex(c => c.id === a.columnId);
        const colB = columns.findIndex(c => c.id === b.columnId);
        comparison = colA - colB;
        break;
      case 'assignee':
        const assigneeA = a.assignee || '';
        const assigneeB = b.assignee || '';
        comparison = assigneeA.localeCompare(assigneeB);
        break;
      case 'market':
        const marketA = a.relatedMarket || '';
        const marketB = b.relatedMarket || '';
        comparison = marketA.localeCompare(marketB);
        break;
      case 'taskStatus':
        comparison = (a.status || 'not_started').localeCompare(b.status || 'not_started');
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, field: keyof typeof DEFAULT_WIDTHS) => {
    e.preventDefault();
    setResizing({
      field,
      startX: e.clientX,
      startWidth: columnWidths[field],
    });
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    
    const deltaX = e.clientX - resizing.startX;
    const newWidth = Math.max(60, resizing.startWidth + deltaX);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizing.field]: newWidth,
    }));
  }, [resizing]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  // Add event listeners for resize
  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  const SortHeader = ({ 
    field, 
    children, 
    width,
    resizable = true 
  }: { 
    field: SortField; 
    children: React.ReactNode;
    width: number;
    resizable?: boolean;
  }) => (
    <th
      className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider relative group"
      style={{ width, minWidth: 80 }}
    >
      <div 
        className="px-4 py-3 cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
        onClick={() => handleSort(field)}
      >
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
      {resizable && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-border/50 opacity-0 group-hover:opacity-100 hover:bg-primary transition-all"
          onMouseDown={(e) => handleResizeStart(e, field as keyof typeof DEFAULT_WIDTHS)}
        />
      )}
    </th>
  );

  const getColumnById = (columnId: string) => columns.find(c => c.id === columnId);

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
            <thead className="bg-muted/50">
              <tr>
                <SortHeader field="title" width={columnWidths.title}>Tarea</SortHeader>
                <SortHeader field="status" width={columnWidths.status}>Estado</SortHeader>
                <SortHeader field="priority" width={columnWidths.priority}>Prioridad</SortHeader>
                <SortHeader field="dueDate" width={columnWidths.dueDate}>Fecha límite</SortHeader>
                <SortHeader field="assignee" width={columnWidths.assignee}>Asignado</SortHeader>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  style={{ width: columnWidths.tags, minWidth: 80 }}
                >
                  Etiquetas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedTasks.map(task => {
                const column = getColumnById(task.columnId);
                return (
                  <tr
                    key={task.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => onTaskClick(task)}
                  >
                    <td className="px-4 py-3" style={{ width: columnWidths.title }}>
                      <div className="max-w-full">
                        <p className="font-medium text-foreground truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ width: columnWidths.status }}>
                      {column && (
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${column.color}15`, color: column.color }}
                        >
                          {iconMap[column.icon] || <Folder className="w-3.5 h-3.5" />}
                          <span className="truncate max-w-[80px]">{column.title}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ width: columnWidths.priority }}>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${priorityConfig[task.priority].color}20`,
                          color: priorityConfig[task.priority].color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: priorityConfig[task.priority].color }}
                        />
                        {priorityConfig[task.priority].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground" style={{ width: columnWidths.dueDate }}>
                      {task.dueDate ? (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(task.dueDate), "d MMM yyyy", { locale: es })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ width: columnWidths.assignee }}>
                      {task.assignee ? (
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                            {task.assignee.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-sm text-foreground truncate">{task.assignee}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ width: columnWidths.tags }}>
                      <div className="flex flex-wrap gap-1">
                        {task.tags.length > 0 ? (
                          task.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[70px]"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">—</span>
                        )}
                        {task.tags.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            +{task.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {sortedTasks.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No hay tareas que mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}
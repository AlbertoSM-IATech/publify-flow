import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, User, Tag, AlertCircle } from 'lucide-react';
import { Task, Column, Priority } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ListViewProps {
  tasks: Task[];
  columns: Column[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

type SortField = 'title' | 'priority' | 'dueDate' | 'createdAt' | 'status';
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

export function ListView({ tasks, columns, onTaskClick, onUpdateTask }: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
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
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const getColumnById = (columnId: string) => columns.find(c => c.id === columnId);

  return (
    <div className="h-full overflow-auto scrollbar-thin p-6">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <SortHeader field="title">Tarea</SortHeader>
              <SortHeader field="status">Estado</SortHeader>
              <SortHeader field="priority">Prioridad</SortHeader>
              <SortHeader field="dueDate">Fecha límite</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Asignado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {column && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted">
                        <span>{column.icon}</span>
                        {column.title}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {task.dueDate ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(task.dueDate), "d MMM yyyy", { locale: es })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                          {task.assignee.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm text-foreground">{task.assignee}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {task.tags.length > 0 ? (
                        task.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
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
        
        {sortedTasks.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No hay tareas que mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}

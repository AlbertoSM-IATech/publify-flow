import { Calendar, CheckSquare, Paperclip, AlertCircle, GripVertical, Circle } from 'lucide-react';
import { Task, Priority, TaskStatus } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRef } from 'react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  critical: { label: 'Crítica', className: 'priority-critical' },
  high: { label: 'Alta', className: 'priority-high' },
  medium: { label: 'Media', className: 'priority-medium' },
  low: { label: 'Baja', className: 'priority-low' },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  not_started: { label: 'Sin empezar', color: '#6B7280' },
  in_progress: { label: 'En curso', color: '#3B82F6' },
  paused: { label: 'Pausado', color: '#F59E0B' },
  waiting: { label: 'En espera', color: '#8B5CF6' },
  archived: { label: 'Archivado', color: '#6B7280' },
  completed: { label: 'Terminado', color: '#22C55E' },
};

export function TaskCard({ task, onClick, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const completedChecklist = task.checklist.filter(item => item.completed).length;
  const totalChecklist = task.checklist.length;
  const checklistProgress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;
  
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date()));
  const isDueSoon = task.dueDate && !isOverdue && isBefore(new Date(task.dueDate), new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/x-task-id', task.id);
    
    // Create custom drag image
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardRef.current, rect.width / 2, 20);
    }
    
    // Call parent immediately to set draggedTaskId state
    onDragStart(e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragEnd();
  };

  const status = statusConfig[task.status] || statusConfig.not_started;

  return (
    <div
      ref={cardRef}
      className={cn(
        "kanban-card select-none cursor-pointer",
        isDragging && "opacity-50 ring-2 ring-primary/50"
      )}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Header with drag handle and tags */}
      <div className="flex items-center gap-2 mb-2 -mt-1">
        <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
        {/* Status badge */}
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
          style={{ 
            backgroundColor: `${status.color}20`,
            color: status.color 
          }}
        >
          <Circle className="w-2 h-2" style={{ fill: status.color }} />
          {status.label}
        </span>
        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {task.tags.slice(0, 2).map(tag => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[80px]"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-foreground mb-2 line-clamp-2">{task.title}</h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Checklist Progress */}
      {totalChecklist > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedChecklist}/{totalChecklist}
            </span>
            <span>{Math.round(checklistProgress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <span className={cn(
            "status-badge border",
            priorityConfig[task.priority].className
          )}>
            {priorityConfig[task.priority].label}
          </span>

          {/* Market */}
          {task.relatedMarket && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {task.relatedMarket}
            </span>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <span className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue && "text-destructive",
              isDueSoon && !isOverdue && "text-amber-500",
              !isOverdue && !isDueSoon && "text-muted-foreground"
            )}>
              {isOverdue && <AlertCircle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              {format(new Date(task.dueDate), 'd MMM', { locale: es })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
          
          {/* Assignee Avatar */}
          {task.assignee && (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

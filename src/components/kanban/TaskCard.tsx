import { Calendar, CheckSquare, MessageSquare, Paperclip, AlertCircle } from 'lucide-react';
import { Task, Priority } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

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

export function TaskCard({ task, onClick, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const completedChecklist = task.checklist.filter(item => item.completed).length;
  const totalChecklist = task.checklist.length;
  const checklistProgress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;
  
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date()));
  const isDueSoon = task.dueDate && !isOverdue && isBefore(new Date(task.dueDate), new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

  return (
    <div
      className={cn(
        "kanban-card animate-fade-in",
        isDragging && "dragging"
      )}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(tag => (
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
          ))}
        </div>
      )}

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

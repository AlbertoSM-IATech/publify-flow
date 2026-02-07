import { useState } from 'react';
import {
  Calendar, CheckSquare, Paperclip, AlertCircle, GripVertical,
  Lock, Archive, CornerUpLeft, MoreVertical, ExternalLink,
  ArrowRight, CheckCircle2, Trash2
} from 'lucide-react';
import { Task, Priority, TaskStatus, Column } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRef } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { InlinePrioritySelect, InlineStatusSelect } from './InlineEditors';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isBlocked?: boolean;
  blockingTasks?: Task[];
  onArchive?: () => void;
  showArchiveButton?: boolean;
  // Restore (for Archivado column)
  showRestoreButton?: boolean;
  restoreTargetColumns?: Column[];
  onRestoreToColumn?: (targetColumnId: string) => void;
  // Inline editing
  onUpdateStatus?: (status: TaskStatus) => void;
  onUpdatePriority?: (priority: Priority) => void;
  // Context menu actions
  onMarkCompleted?: () => void;
  onDelete?: () => void;
  onMoveToColumn?: (columnId: string) => void;
  availableColumns?: Column[];
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

export function TaskCard({
  task, onClick, onDragStart, onDragEnd, isDragging,
  isBlocked = false, blockingTasks = [],
  onArchive, showArchiveButton = false,
  showRestoreButton = false, restoreTargetColumns = [], onRestoreToColumn,
  onUpdateStatus, onUpdatePriority,
  onMarkCompleted, onDelete, onMoveToColumn, availableColumns = [],
}: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Use subtasks for progress calculation
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date()));
  const isDueSoon = task.dueDate && !isOverdue && isBefore(new Date(task.dueDate), new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
  const isCompleted = task.status === 'completed' || subtaskProgress === 100;

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/x-task-id', task.id);
    
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardRef.current, rect.width / 2, 20);
    }
    
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
        "kanban-card select-none cursor-pointer relative group/card",
        isDragging && "opacity-50 ring-2 ring-primary/50",
        isBlocked && "ring-1 ring-amber-500/50"
      )}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Blocked Badge */}
      {isBlocked && blockingTasks.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute -top-1 -right-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-medium shadow-sm">
                <Lock className="w-2.5 h-2.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium mb-1 text-xs">Bloqueada por:</p>
              <ul className="text-xs space-y-0.5">
                {blockingTasks.slice(0, 3).map(bt => (
                  <li key={bt.id} className="truncate">• {bt.title}</li>
                ))}
                {blockingTasks.length > 3 && (
                  <li className="text-muted-foreground">+{blockingTasks.length - 3} más</li>
                )}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Context Menu (three-dot) */}
      <div className={cn(
        "absolute top-2 right-2 z-10 transition-opacity",
        menuOpen ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
      )}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-muted/80"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick(); }}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir detalles
            </DropdownMenuItem>

            {/* Move to… submenu */}
            {onMoveToColumn && availableColumns.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Mover a…
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-52">
                    {availableColumns
                      .filter(col => col.id !== task.columnId)
                      .map(col => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onMoveToColumn(col.id);
                          }}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: col.color }}
                          />
                          <span className="truncate">{col.title}</span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            <DropdownMenuSeparator />

            {/* Mark completed */}
            {onMarkCompleted && !isCompleted && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMarkCompleted(); }}>
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Marcar como completada
              </DropdownMenuItem>
            )}

            {/* Archive */}
            {onArchive && isCompleted && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(); }}>
                <Archive className="w-4 h-4 mr-2" />
                Archivar
              </DropdownMenuItem>
            )}

            {/* Delete */}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header with drag handle and status */}
      <div className="flex items-center gap-2 mb-2 -mt-1">
        <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
        {/* Inline Status Select */}
        {onUpdateStatus ? (
          <InlineStatusSelect
            value={task.status}
            onChange={onUpdateStatus}
            compact
          />
        ) : (
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
            style={{ 
              backgroundColor: `${status.color}20`,
              color: status.color 
            }}
          >
            {status.label}
          </span>
        )}
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
      <h4 className="font-medium text-foreground mb-2 line-clamp-2 pr-6">{task.title}</h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Subtask Progress */}
      {totalSubtasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedSubtasks}/{totalSubtasks}
            </span>
            <span>{Math.round(subtaskProgress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                subtaskProgress === 100 ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          {/* Inline Priority Select */}
          {onUpdatePriority ? (
            <InlinePrioritySelect
              value={task.priority}
              onChange={onUpdatePriority}
              compact
            />
          ) : (
            <span className={cn(
              "status-badge border",
              priorityConfig[task.priority].className
            )}>
              {priorityConfig[task.priority].label}
            </span>
          )}

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

          {/* Restore Button */}
          {showRestoreButton && onRestoreToColumn && restoreTargetColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-50">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Restaurar a…
                </div>
                <DropdownMenuSeparator />
                {restoreTargetColumns.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreToColumn(col.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="truncate">{col.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Archive Button (inline on card) */}
          {showArchiveButton && onArchive && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive();
                    }}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Archivar tarea</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

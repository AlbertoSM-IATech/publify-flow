import { useState, useRef } from 'react';
import { 
  MoreHorizontal, Plus, GripVertical, Pencil, Trash2, EyeOff,
  Search, Layout, FileText, Edit3, Palette, CheckCircle, Upload,
  TrendingUp, Megaphone, Settings, Check, Folder
} from 'lucide-react';
import { Column, Task } from '@/types/kanban';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onOpenNewTaskDialog: () => void;
  onUpdateColumn: (updates: Partial<Column>) => void;
  onDeleteColumn: () => void;
  onMoveTask: (taskId: string, columnId: string, index: number) => void;
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onColumnDragStart: (e: React.DragEvent) => void;
  onColumnDragEnd: () => void;
  onColumnDrop: (e: React.DragEvent) => void;
  isDraggingColumn: boolean;
  isAnyTaskDragging: boolean;
  wouldExceedWipLimit?: boolean;
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onOpenNewTaskDialog,
  onUpdateColumn,
  onDeleteColumn,
  onMoveTask,
  draggedTaskId,
  onDragStart,
  onDragEnd,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDrop,
  isDraggingColumn,
  isAnyTaskDragging,
  wouldExceedWipLimit = false,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const tasksContainerRef = useRef<HTMLDivElement>(null);

  const handleTitleSave = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle) {
      onUpdateColumn({ title: trimmedTitle });
    } else {
      setEditTitle(column.title);
    }
    setIsEditing(false);
  };

  // Improved drop zone calculation - position above or below based on mouse position
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle task drags
    if (!draggedTaskId) return;
    
    e.dataTransfer.dropEffect = 'move';
    
    const container = tasksContainerRef.current;
    if (!container) return;
    
    const mouseY = e.clientY;
    
    // Find the correct index based on mouse Y relative to each card's center
    let newIndex = tasks.length;
    const taskElements = container.querySelectorAll('[data-task-id]');
    
    for (let i = 0; i < taskElements.length; i++) {
      const el = taskElements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      
      // If mouse is above the center of this card, insert before it
      if (mouseY < cardCenter) {
        newIndex = i;
        break;
      }
    }
    
    setDropIndex(newIndex);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get task ID from dataTransfer as fallback, or use the state
    const taskId = draggedTaskId || e.dataTransfer.getData('application/x-task-id') || e.dataTransfer.getData('text/plain');
    
    if (taskId && dropIndex !== null) {
      onMoveTask(taskId, column.id, dropIndex);
    }
    setDropIndex(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    const rect = columnRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDropIndex(null);
      }
    }
  };

  // BUG FIX: Column drag handlers - completely separate from task drag
  const handleColumnDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    // Prevent column drag if a task is being dragged
    if (isAnyTaskDragging) {
      e.preventDefault();
      return;
    }
    onColumnDragStart(e);
  };

  // BUG FIX: Only accept column drops when no task is being dragged
  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAnyTaskDragging && isDraggingColumn === false) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleColumnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only handle column drops, not task drops
    if (!draggedTaskId) {
      onColumnDrop(e);
    }
  };

  const isOverWipLimit = column.wipLimit !== null && tasks.length >= column.wipLimit;
  const showWipWarning = wouldExceedWipLimit && draggedTaskId !== null;
  const columnIcon = iconMap[column.icon] || <Folder className="w-4 h-4" />;

  // Visual indicator for column drop target
  const [isColumnDropTarget, setIsColumnDropTarget] = useState(false);

  return (
    <div
      ref={columnRef}
      className={cn(
        "kanban-column transition-all duration-200 overflow-hidden relative",
        isDraggingColumn && "opacity-50 scale-95 ring-2 ring-primary/50",
        isColumnDropTarget && !isDraggingColumn && !isAnyTaskDragging && "ring-2 ring-primary/50",
        showWipWarning && "ring-2 ring-destructive/50 bg-destructive/5"
      )}
      onDragOver={(e) => {
        handleColumnDragOver(e);
        if (!isAnyTaskDragging && !isDraggingColumn) {
          setIsColumnDropTarget(true);
        }
      }}
      onDrop={(e) => {
        handleColumnDrop(e);
        setIsColumnDropTarget(false);
      }}
      onDragLeave={(e) => {
        handleDragLeave(e);
        setIsColumnDropTarget(false);
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle - only this element is draggable for columns */}
          <div
            draggable
            onDragStart={handleColumnDragStart}
            onDragEnd={onColumnDragEnd}
            className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div 
            className="flex items-center justify-center w-6 h-6 rounded flex-shrink-0"
            style={{ backgroundColor: `${column.color}20`, color: column.color }}
          >
            {columnIcon}
          </div>
          
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setEditTitle(column.title);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm font-medium"
              autoFocus
            />
          ) : (
            <h3
              className="font-heading font-semibold text-foreground cursor-pointer hover:text-primary transition-colors text-sm truncate"
              onClick={() => setIsEditing(true)}
            >
              {column.title}
            </h3>
          )}
          
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
            isOverWipLimit
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}>
            {tasks.length}
            {column.wipLimit && `/${column.wipLimit}`}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateColumn({ isHidden: true })}>
              <EyeOff className="w-4 h-4 mr-2" />
              Ocultar columna
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar columna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks Container */}
      <div
        ref={tasksContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin min-h-[100px] pb-2"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        {tasks.map((task, index) => (
          <div key={task.id} data-task-id={task.id} className="relative py-1">
            {/* Drop indicator BEFORE this task */}
            {dropIndex === index && draggedTaskId && draggedTaskId !== task.id && (
              <div className="absolute -top-0.5 left-0 right-0 h-1 bg-primary rounded-full z-20 shadow-[0_0_8px_hsl(var(--primary))]" />
            )}
            <TaskCard
              task={task}
              onClick={() => onTaskClick(task)}
              onDragStart={(e) => onDragStart(e, task.id)}
              onDragEnd={onDragEnd}
              isDragging={draggedTaskId === task.id}
            />
          </div>
        ))}
        
        {/* Drop zone at the end */}
        {draggedTaskId && (
          <div
            className={cn(
              "min-h-[48px] rounded-lg transition-all border-2 border-dashed mt-1",
              dropIndex === tasks.length
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30"
            )}
          />
        )}
      </div>

      {/* Add Task Button */}
      <Button
        variant="ghost"
        className="w-full mt-2 justify-start text-muted-foreground hover:text-foreground flex-shrink-0"
        onClick={onOpenNewTaskDialog}
      >
        <Plus className="w-4 h-4 mr-2" />
        Añadir tarea
      </Button>
    </div>
  );
}

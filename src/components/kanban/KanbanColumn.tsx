import { useState } from 'react';
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
  onAddTask: (task: Partial<Task>) => void;
  onUpdateColumn: (updates: Partial<Column>) => void;
  onDeleteColumn: () => void;
  onMoveTask: (taskId: string, columnId: string, index: number) => void;
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onColumnDragStart: (e: React.DragEvent) => void;
  onColumnDragEnd: () => void;
  onColumnDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
  onUpdateColumn,
  onDeleteColumn,
  onMoveTask,
  draggedTaskId,
  onDragStart,
  onDragEnd,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDrop,
  isDragging,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleTitleSave = () => {
    if (editTitle.trim()) {
      onUpdateColumn({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask({ title: newTaskTitle.trim() });
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTaskId) {
      setDropIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTaskId) {
      onMoveTask(draggedTaskId, column.id, index);
    }
    setDropIndex(null);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const isOverWipLimit = column.wipLimit !== null && tasks.length >= column.wipLimit;
  const columnIcon = iconMap[column.icon] || <Folder className="w-4 h-4" />;

  return (
    <div
      className={cn(
        "kanban-column transition-all duration-200",
        isDragging && "opacity-50 scale-95"
      )}
      draggable
      onDragStart={onColumnDragStart}
      onDragEnd={onColumnDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onColumnDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 group">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab transition-opacity" />
          <div 
            className="flex items-center justify-center w-6 h-6 rounded"
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
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="h-7 text-sm font-medium"
              autoFocus
            />
          ) : (
            <h3
              className="font-heading font-semibold text-foreground cursor-pointer hover:text-primary transition-colors text-sm"
              onClick={() => setIsEditing(true)}
            >
              {column.title}
            </h3>
          )}
          
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
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
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
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

      {/* Tasks */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin space-y-2 min-h-[100px]"
        onDragLeave={handleDragLeave}
      >
        {tasks.map((task, index) => (
          <div key={task.id}>
            {dropIndex === index && (
              <div className="h-1 bg-primary rounded-full mb-2 animate-pulse" />
            )}
            <div
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <TaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                onDragStart={(e) => onDragStart(e, task.id)}
                onDragEnd={onDragEnd}
                isDragging={draggedTaskId === task.id}
              />
            </div>
          </div>
        ))}
        
        {/* Drop zone at the end */}
        <div
          className="h-20"
          onDragOver={(e) => handleDragOver(e, tasks.length)}
          onDrop={(e) => handleDrop(e, tasks.length)}
        >
          {dropIndex === tasks.length && (
            <div className="h-1 bg-primary rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Add Task */}
      {isAddingTask ? (
        <div className="mt-2 space-y-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Título de la tarea..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') {
                setIsAddingTask(false);
                setNewTaskTitle('');
              }
            }}
            autoFocus
            className="bg-card"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddTask} className="flex-1">
              Añadir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full mt-2 justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir tarea
        </Button>
      )}
    </div>
  );
}

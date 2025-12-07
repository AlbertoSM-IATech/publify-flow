import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Globe } from 'lucide-react';
import { Task, Priority, Column, Tag } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarViewProps {
  tasks: Task[];
  columns: Column[];
  availableTags: Tag[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string, task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const priorityColors: Record<Priority, string> = {
  critical: 'hsl(0 84% 60%)',
  high: 'hsl(24 94% 59%)',
  medium: 'hsl(38 92% 50%)',
  low: 'hsl(142 71% 45%)',
};

const priorityLabels: Record<Priority, string> = {
  critical: 'C',
  high: 'A',
  medium: 'M',
  low: 'B',
};

export function CalendarView({ 
  tasks, 
  columns, 
  availableTags,
  onTaskClick, 
  onAddTask, 
  onUpdateTask 
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), date));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `calendar-task:${taskId}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTaskId) {
      onUpdateTask(draggedTaskId, { dueDate: date });
      setDraggedTaskId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddDialog(true);
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim() && selectedDate) {
      const firstColumn = columns[0];
      if (firstColumn) {
        onAddTask(firstColumn.id, {
          title: newTaskTitle.trim(),
          dueDate: selectedDate,
        });
      }
      setNewTaskTitle('');
      setShowAddDialog(false);
      setSelectedDate(null);
    }
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h2 className="text-xl font-heading font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden flex flex-col min-h-0">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
          {weekDays.map(weekDay => (
            <div
              key={weekDay}
              className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
            >
              {weekDay}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isCurrentDay = isToday(date);

            return (
              <div
                key={index}
                className={cn(
                  "border-b border-r border-border p-1.5 transition-colors relative group",
                  !isCurrentMonth && "bg-muted/30",
                  "hover:bg-muted/50"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                      !isCurrentMonth && "text-muted-foreground",
                      isCurrentDay && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDateClick(date)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Task list with enhanced display */}
                <div className="space-y-0.5 overflow-y-auto max-h-[calc(100%-24px)] scrollbar-thin">
                  {dayTasks.map(task => (
                    <button
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        "w-full text-left px-1.5 py-1 rounded text-xs transition-all",
                        "hover:ring-1 hover:ring-primary/50 cursor-grab active:cursor-grabbing",
                        draggedTaskId === task.id && "opacity-50 scale-95"
                      )}
                      style={{
                        backgroundColor: `${priorityColors[task.priority]}15`,
                        borderLeft: `3px solid ${priorityColors[task.priority]}`,
                      }}
                    >
                      {/* Title */}
                      <div className="font-medium truncate text-foreground">
                        {task.title}
                      </div>
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {/* Priority badge */}
                        <span 
                          className="text-[10px] font-bold px-1 rounded"
                          style={{ 
                            backgroundColor: `${priorityColors[task.priority]}30`,
                            color: priorityColors[task.priority]
                          }}
                        >
                          {priorityLabels[task.priority]}
                        </span>
                        
                        {/* Market */}
                        {task.relatedMarket && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" />
                            {task.relatedMarket}
                          </span>
                        )}
                        
                        {/* Tags (first 2) */}
                        {task.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            className="text-[10px] px-1 rounded"
                            style={{
                              backgroundColor: `${tag.color}25`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {task.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{task.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {dayTasks.length > 4 && (
                    <span className="text-[10px] text-muted-foreground px-1.5 block">
                      +{dayTasks.length - 4} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Nueva tarea para {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Título de la tarea..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') setShowAddDialog(false);
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                Añadir tarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

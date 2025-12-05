import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Task, Priority, Column } from '@/types/kanban';
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

export function CalendarView({ tasks, columns, onTaskClick, onAddTask, onUpdateTask }: CalendarViewProps) {
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
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
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
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden flex flex-col">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-border">
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
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isCurrentDay = isToday(date);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] border-b border-r border-border p-2 transition-colors",
                  !isCurrentMonth && "bg-muted/30",
                  "hover:bg-muted/50"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !isCurrentMonth && "text-muted-foreground",
                      isCurrentDay && "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 hover:opacity-100 group-hover:opacity-100"
                    onClick={() => handleDateClick(date)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate transition-all",
                        "hover:opacity-80 cursor-grab active:cursor-grabbing",
                        draggedTaskId === task.id && "opacity-50"
                      )}
                      style={{
                        backgroundColor: `${priorityColors[task.priority]}20`,
                        color: priorityColors[task.priority],
                      }}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-xs text-muted-foreground px-1.5">
                      +{dayTasks.length - 3} más
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
            <DialogTitle>
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
              <Button onClick={handleAddTask}>
                Añadir tarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

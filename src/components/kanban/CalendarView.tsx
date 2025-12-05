import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, Priority } from '@/types/kanban';
import { Button } from '@/components/ui/button';
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
  onTaskClick: (task: Task) => void;
}

const priorityColors: Record<Priority, string> = {
  critical: '#EF4444',
  high: '#FB923C',
  medium: '#F59E0B',
  low: '#22C55E',
};

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-foreground">
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
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
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
                  "min-h-[100px] border-b border-r border-border p-2",
                  !isCurrentMonth && "bg-muted/30"
                )}
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
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate transition-all hover:opacity-80"
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
    </div>
  );
}

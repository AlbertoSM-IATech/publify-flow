import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Globe, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Task, Priority, Column, Tag } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  addYears,
  subYears,
  setMonth,
  setYear,
  isSameMonth,
  isSameDay,
  isToday,
  getYear,
  differenceInDays,
  isWithinInterval,
  isBefore,
  isAfter,
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

// HSL values for priority colors
const priorityColorsHSL: Record<Priority, string> = {
  critical: '0 84% 60%',
  high: '24 94% 59%',
  medium: '38 92% 50%',
  low: '142 71% 45%',
};

const priorityColors: Record<Priority, string> = {
  critical: `hsl(${priorityColorsHSL.critical})`,
  high: `hsl(${priorityColorsHSL.high})`,
  medium: `hsl(${priorityColorsHSL.medium})`,
  low: `hsl(${priorityColorsHSL.low})`,
};

const priorityLabels: Record<Priority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

  // Calculate number of weeks for square cells
  const numWeeks = Math.ceil(days.length / 7);

  const weeks = useMemo(() => {
    return Array.from({ length: numWeeks }, (_, w) => days.slice(w * 7, w * 7 + 7));
  }, [days, numWeeks]);

  // Filter out archived tasks and get tasks with date ranges for multi-day spanning
  const tasksWithDates = useMemo(() => {
    return tasks
      .filter(task => !task.isArchived && (task.dueDate || task.startDate))
      .map(task => {
        const taskStart = task.startDate ? new Date(task.startDate) : 
                          task.dueDate ? new Date(task.dueDate) : new Date();
        const taskEnd = task.dueDate ? new Date(task.dueDate) : taskStart;
        return {
          ...task,
          taskStart,
          taskEnd,
          spanDays: Math.max(1, differenceInDays(taskEnd, taskStart) + 1),
        };
      });
  }, [tasks]);

  const singleDayTasks = useMemo(() => {
    return tasksWithDates.filter(t => t.spanDays === 1);
  }, [tasksWithDates]);

  type TaskWithDates = (typeof tasksWithDates)[number];
  type Segment = {
    id: string;
    task: TaskWithDates;
    startCol: number;
    span: number;
    lane: number;
    weekIndex: number;
    segmentStart: Date;
    segmentEnd: Date;
  };

  const multiDaySegmentsByWeek = useMemo(() => {
    const byWeek = new Map<number, Segment[]>();

    const multi = tasksWithDates.filter(t => t.spanDays > 1);
    weeks.forEach((weekDays, weekIndex) => {
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];

      const segments: Omit<Segment, 'lane'>[] = [];
      for (const t of multi) {
        // intersection check
        if (isAfter(t.taskStart, weekEnd) || isBefore(t.taskEnd, weekStart)) continue;
        const segmentStart = isBefore(t.taskStart, weekStart) ? weekStart : t.taskStart;
        const segmentEnd = isAfter(t.taskEnd, weekEnd) ? weekEnd : t.taskEnd;

        const startCol = Math.max(0, Math.min(6, differenceInDays(segmentStart, weekStart)));
        const span = Math.max(1, Math.min(7 - startCol, differenceInDays(segmentEnd, segmentStart) + 1));
        segments.push({
          id: `${t.id}:${weekIndex}:${startCol}:${span}`,
          task: t,
          startCol,
          span,
          weekIndex,
          segmentStart,
          segmentEnd,
        });
      }

      // lane packing (greedy)
      segments.sort((a, b) => a.startCol - b.startCol || a.span - b.span);
      const laneEnd: number[] = [];
      const withLanes: Segment[] = segments.map(seg => {
        let lane = 0;
        while (lane < laneEnd.length) {
          if (seg.startCol > laneEnd[lane]) break;
          lane++;
        }
        if (lane === laneEnd.length) laneEnd.push(-1);
        laneEnd[lane] = seg.startCol + seg.span - 1;
        return { ...seg, lane };
      });

      byWeek.set(weekIndex, withLanes);
    });

    return byWeek;
  }, [tasksWithDates, weeks]);

  // Get tasks that are active on a specific date (start, span, or end)
  const getTasksForDate = (date: Date) => {
    return tasksWithDates.filter(task => {
      if (task.spanDays === 1) {
        return isSameDay(task.taskEnd, date);
      }
      return isWithinInterval(date, { start: task.taskStart, end: task.taskEnd });
    });
  };

  // Check if date is the start of a task
  const isTaskStart = (task: typeof tasksWithDates[0], date: Date) => {
    return isSameDay(task.taskStart, date);
  };

  // Check if date is the end of a task
  const isTaskEnd = (task: typeof tasksWithDates[0], date: Date) => {
    return isSameDay(task.taskEnd, date);
  };

  // Get how many days the task spans from this date to end of week or task end
  const getSpanForDate = (task: typeof tasksWithDates[0], date: Date, dayIndex: number) => {
    const daysUntilEndOfWeek = 7 - (dayIndex % 7);
    const daysUntilTaskEnd = differenceInDays(task.taskEnd, date) + 1;
    return Math.min(daysUntilEndOfWeek, daysUntilTaskEnd);
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
      const task = tasksWithDates.find(t => t.id === draggedTaskId);
      if (task) {
        const daysDiff = differenceInDays(task.taskEnd, task.taskStart);
        onUpdateTask(draggedTaskId, { 
          startDate: date,
          dueDate: addDays(date, daysDiff),
        });
      }
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
      const firstColumn = columns.find(c => c.id !== 'archived');
      if (firstColumn) {
        onAddTask(firstColumn.id, {
          title: newTaskTitle.trim(),
          dueDate: selectedDate,
          startDate: selectedDate,
        });
      }
      setNewTaskTitle('');
      setShowAddDialog(false);
      setSelectedDate(null);
    }
  };

  // Month selector handler
  const handleMonthChange = (monthIndex: string) => {
    setCurrentMonth(setMonth(currentMonth, parseInt(monthIndex)));
  };

  // Year selector handler
  const handleYearChange = (year: string) => {
    setCurrentMonth(setYear(currentMonth, parseInt(year)));
  };

  // Generate year options (current year ± 10 years)
  const currentYear = getYear(new Date());
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header with Month/Year Selectors */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <Select 
            value={currentMonth.getMonth().toString()} 
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select 
            value={getYear(currentMonth).toString()} 
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
            title="Año anterior"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
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
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
            title="Año siguiente"
          >
            <ChevronsRight className="w-4 h-4" />
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
        <div className="flex-1 overflow-y-auto">
          <div
            className="grid grid-cols-7"
            style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(0, 1fr))` }}
          >
            {days.map((date, index) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isCurrentDay = isToday(date);
              const daySingleTasks = singleDayTasks.filter(t => isSameDay(t.taskEnd, date));

              return (
                <div
                  key={index}
                  className={cn(
                    "border-b border-r border-border p-1 transition-colors relative group flex flex-col min-h-0",
                    !isCurrentMonth && "bg-muted/30",
                    "hover:bg-muted/50"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-0.5 flex-shrink-0">
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

                  {/* Single-day tasks only (multi-day rendered as week overlays) */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin space-y-0.5">
                    {daySingleTasks.map(task => (
                      <TooltipProvider key={task.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onTaskClick(task)}
                              className={cn(
                                "w-full px-1 py-0.5 rounded text-left text-xs transition-all cursor-grab active:cursor-grabbing",
                                "hover:ring-1 hover:ring-primary/50",
                                draggedTaskId === task.id && "opacity-50 scale-95"
                              )}
                              style={{
                                backgroundColor: `hsl(${priorityColorsHSL[task.priority]} / 0.3)`,
                                border: `1px solid ${priorityColors[task.priority]}`,
                              }}
                            >
                              <span className="font-medium truncate block text-foreground text-[10px]">
                                {task.title}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{task.title}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className="px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: `hsl(${priorityColorsHSL[task.priority]} / 0.3)`,
                                    color: priorityColors[task.priority],
                                  }}
                                >
                                  {priorityLabels[task.priority]}
                                </span>
                                {task.relatedMarket && (
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    {task.relatedMarket}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week overlays for multi-day tasks */}
          <div className="-mt-[calc(100%)] pointer-events-none">
            <div
              className="grid grid-cols-7"
              style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(0, 1fr))` }}
            >
              {weeks.map((weekDays, weekIndex) => {
                const segments = multiDaySegmentsByWeek.get(weekIndex) || [];
                const laneCount = segments.reduce((m, s) => Math.max(m, s.lane + 1), 0);

                return (
                  <div
                    key={weekIndex}
                    className="col-span-7 relative border-b border-border"
                    style={{
                      // reserve a small top band for bars; does not affect day cell sizing
                      minHeight: 0,
                    }}
                  >
                    <div
                      className="absolute inset-0 grid"
                      style={{
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gridAutoRows: '18px',
                        padding: '24px 4px 4px 4px',
                        gap: '2px 4px',
                      }}
                    >
                      {segments.map(seg => {
                        const isStartInWeek = isSameDay(seg.segmentStart, seg.task.taskStart);
                        const isEndInWeek = isSameDay(seg.segmentEnd, seg.task.taskEnd);
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            className={cn(
                              'pointer-events-auto text-left text-[10px] font-medium truncate px-1.5 py-0.5 rounded transition-all',
                              'hover:ring-1 hover:ring-primary/50'
                            )}
                            onClick={() => onTaskClick(seg.task)}
                            style={{
                              gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                              gridRow: `${seg.lane + 1}`,
                              backgroundColor: `hsl(${priorityColorsHSL[seg.task.priority]} / 0.3)`,
                              border: `1px solid ${priorityColors[seg.task.priority]}`,
                              borderRadius: isStartInWeek && isEndInWeek ? '4px' : isStartInWeek ? '4px 0 0 4px' : isEndInWeek ? '0 4px 4px 0' : '0',
                            }}
                            title={seg.task.title}
                          >
                            {seg.task.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Nueva tarea para {selectedDate && format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
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

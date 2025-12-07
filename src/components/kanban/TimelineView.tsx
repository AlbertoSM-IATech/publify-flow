import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, GripVertical } from 'lucide-react';
import { Task, Priority, Column } from '@/types/kanban';
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
  differenceInDays,
  isSameDay,
  isWithinInterval,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineViewProps {
  tasks: Task[];
  columns: Column[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const priorityColors: Record<Priority, string> = {
  critical: 'hsl(0 84% 60%)',
  high: 'hsl(24 94% 59%)',
  medium: 'hsl(38 92% 50%)',
  low: 'hsl(142 71% 45%)',
};

type ZoomLevel = 'day' | 'week' | 'month';

export function TimelineView({ tasks, columns, onTaskClick, onUpdateTask }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [draggedTask, setDraggedTask] = useState<{ id: string; type: 'move' | 'resize-start' | 'resize-end' } | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate date range based on zoom level
  const { startDate, endDate, days, dayWidth } = useMemo(() => {
    let start: Date;
    let end: Date;
    let width: number;

    switch (zoomLevel) {
      case 'day':
        start = addDays(currentDate, -7);
        end = addDays(currentDate, 21);
        width = 80;
        break;
      case 'week':
        start = startOfWeek(addWeeks(currentDate, -2), { weekStartsOn: 1 });
        end = endOfWeek(addWeeks(currentDate, 6), { weekStartsOn: 1 });
        width = 40;
        break;
      case 'month':
        start = startOfMonth(subMonths(currentDate, 1));
        end = endOfMonth(addMonths(currentDate, 2));
        width = 20;
        break;
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(addWeeks(currentDate, 4), { weekStartsOn: 1 });
        width = 40;
    }

    const daysArray: Date[] = [];
    let day = start;
    while (day <= end) {
      daysArray.push(day);
      day = addDays(day, 1);
    }

    return { startDate: start, endDate: end, days: daysArray, dayWidth: width };
  }, [currentDate, zoomLevel]);

  // Filter tasks with due dates and calculate their position
  const timelineTasks = useMemo(() => {
    return tasks
      .filter(task => task.dueDate)
      .map(task => {
        const dueDate = new Date(task.dueDate!);
        // Use createdAt as start date if no explicit start date
        const taskStartDate = task.createdAt ? new Date(task.createdAt) : addDays(dueDate, -3);
        const taskEndDate = dueDate;

        const startOffset = differenceInDays(taskStartDate, startDate);
        const duration = Math.max(1, differenceInDays(taskEndDate, taskStartDate) + 1);

        return {
          ...task,
          taskStartDate,
          taskEndDate,
          startOffset,
          duration,
        };
      })
      .filter(task => {
        // Only show tasks that are visible in the current range
        return task.startOffset + task.duration > 0 && task.startOffset < days.length;
      });
  }, [tasks, startDate, days.length]);

  // Group tasks by row to prevent overlap
  const taskRows = useMemo(() => {
    const rows: typeof timelineTasks[] = [];
    
    timelineTasks.forEach(task => {
      // Find a row where this task doesn't overlap
      let rowIndex = rows.findIndex(row => {
        return !row.some(existingTask => {
          const taskStart = task.startOffset;
          const taskEnd = task.startOffset + task.duration;
          const existingStart = existingTask.startOffset;
          const existingEnd = existingTask.startOffset + existingTask.duration;
          
          return !(taskEnd <= existingStart || taskStart >= existingEnd);
        });
      });

      if (rowIndex === -1) {
        rows.push([task]);
      } else {
        rows[rowIndex].push(task);
      }
    });

    return rows;
  }, [timelineTasks]);

  const handlePrev = () => {
    switch (zoomLevel) {
      case 'day':
        setCurrentDate(addDays(currentDate, -7));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, -2));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (zoomLevel) {
      case 'day':
        setCurrentDate(addDays(currentDate, 7));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 2));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const handleDragStart = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.stopPropagation();
    const task = timelineTasks.find(t => t.id === taskId);
    if (!task) return;

    setDraggedTask({ id: taskId, type });
    setDragStartX(e.clientX);
    setDragStartDate(type === 'resize-start' ? task.taskStartDate : task.taskEndDate);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedTask || !dragStartDate) return;

    const deltaX = e.clientX - dragStartX;
    const daysDelta = Math.round(deltaX / dayWidth);
    
    if (daysDelta === 0) return;

    const task = timelineTasks.find(t => t.id === draggedTask.id);
    if (!task) return;

    if (draggedTask.type === 'move') {
      const newDueDate = addDays(task.taskEndDate, daysDelta);
      onUpdateTask(draggedTask.id, { dueDate: newDueDate });
      setDragStartX(e.clientX);
    } else if (draggedTask.type === 'resize-end') {
      const newDueDate = addDays(dragStartDate, daysDelta);
      if (newDueDate > task.taskStartDate) {
        onUpdateTask(draggedTask.id, { dueDate: newDueDate });
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedTask(null);
    setDragStartDate(null);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div 
      className="h-full flex flex-col p-6 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Timeline
        </h2>
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['day', 'week', 'month'] as ZoomLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-all capitalize",
                  zoomLevel === level
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {level === 'day' ? 'Día' : level === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden flex flex-col min-h-0">
        {/* Date Header */}
        <div 
          ref={containerRef}
          className="flex border-b border-border flex-shrink-0 overflow-x-auto scrollbar-thin"
        >
          <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-border bg-muted/50">
            <span className="text-sm font-medium text-muted-foreground">Tarea</span>
          </div>
          <div className="flex">
            {days.map((date, index) => (
              <div
                key={index}
                className={cn(
                  "flex-shrink-0 px-1 py-2 text-center border-r border-border/50",
                  isToday(date) && "bg-primary/10",
                  isWeekend(date) && "bg-muted/30"
                )}
                style={{ width: dayWidth }}
              >
                <div className="text-[10px] text-muted-foreground uppercase">
                  {format(date, 'EEE', { locale: es })}
                </div>
                <div className={cn(
                  "text-xs font-medium",
                  isToday(date) ? "text-primary" : "text-foreground"
                )}>
                  {format(date, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {taskRows.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">No hay tareas con fecha</p>
                <p className="text-sm">Añade fechas límite a tus tareas para verlas en el timeline</p>
              </div>
            </div>
          ) : (
            taskRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex min-h-[48px] border-b border-border/50">
                {/* Task names column - shows first task of row */}
                <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-border bg-muted/20 flex items-center">
                  {row.length === 1 && (
                    <span className="text-sm truncate text-foreground">{row[0].title}</span>
                  )}
                </div>
                
                {/* Timeline area */}
                <div className="flex-1 relative">
                  {/* Day columns background */}
                  <div className="absolute inset-0 flex">
                    {days.map((date, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex-shrink-0 border-r border-border/30",
                          isToday(date) && "bg-primary/5",
                          isWeekend(date) && "bg-muted/20"
                        )}
                        style={{ width: dayWidth }}
                      />
                    ))}
                  </div>
                  
                  {/* Task bars */}
                  {row.map(task => {
                    const left = Math.max(0, task.startOffset) * dayWidth;
                    const visibleStart = Math.max(0, task.startOffset);
                    const visibleEnd = Math.min(days.length, task.startOffset + task.duration);
                    const width = (visibleEnd - visibleStart) * dayWidth;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "absolute top-1 bottom-1 rounded-md flex items-center px-2 cursor-pointer transition-all group",
                          "hover:ring-2 hover:ring-primary/50",
                          draggedTask?.id === task.id && "opacity-70 ring-2 ring-primary"
                        )}
                        style={{
                          left,
                          width: Math.max(width, dayWidth),
                          backgroundColor: `${priorityColors[task.priority]}20`,
                          borderLeft: `3px solid ${priorityColors[task.priority]}`,
                        }}
                        onClick={() => onTaskClick(task)}
                      >
                        {/* Drag handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                        </div>
                        
                        {/* Task title */}
                        <span className="text-xs font-medium truncate text-foreground ml-4">
                          {task.title}
                        </span>

                        {/* Tags */}
                        {task.tags.length > 0 && width > 100 && (
                          <div className="flex gap-1 ml-2">
                            {task.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag.id}
                                className="text-[10px] px-1 rounded"
                                style={{
                                  backgroundColor: `${tag.color}30`,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Resize handle - right */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-primary/30 rounded-r-md transition-opacity"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'resize-end')}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
        <span className="font-medium">Prioridad:</span>
        {Object.entries(priorityColors).map(([priority, color]) => (
          <div key={priority} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="capitalize">
              {priority === 'critical' ? 'Crítica' : 
               priority === 'high' ? 'Alta' : 
               priority === 'medium' ? 'Media' : 'Baja'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

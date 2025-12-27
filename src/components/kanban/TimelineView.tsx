import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, Calendar, Link } from 'lucide-react';
import { Task, Priority, Column, TaskDependency } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  format,
  addDays,
  addMonths,
  subMonths,
  differenceInDays,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfDay,
  getYear,
  setMonth,
  setYear,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineViewProps {
  tasks: Task[];
  columns: Column[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  getDependencyEdges?: () => { fromTaskId: string; toTaskId: string; fromTask: Task; toTask: Task }[];
}

const priorityColors: Record<Priority, string> = {
  critical: 'hsl(0 84% 60%)',
  high: 'hsl(24 94% 59%)',
  medium: 'hsl(38 92% 50%)',
  low: 'hsl(142 71% 45%)',
};

type ZoomLevel = 'day' | 'week' | 'month';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function TimelineView({ tasks, columns, onTaskClick, onUpdateTask, getDependencyEdges }: TimelineViewProps) {
  const [startDateInput, setStartDateInput] = useState<Date>(addDays(new Date(), -7));
  const [endDateInput, setEndDateInput] = useState<Date>(addDays(new Date(), 30));
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [draggedTask, setDraggedTask] = useState<{ id: string; type: 'move' | 'resize-start' | 'resize-end' } | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [showDependencies, setShowDependencies] = useState(true);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const taskColumnRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync horizontal scroll between header and content
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // Calculate date range and day width based on zoom level
  const { days, dayWidth } = useMemo(() => {
    let width: number;
    switch (zoomLevel) {
      case 'day':
        width = 60;
        break;
      case 'week':
        width = 30;
        break;
      case 'month':
        width = 15;
        break;
      default:
        width = 30;
    }

    const daysArray: Date[] = [];
    let day = startOfDay(startDateInput);
    const end = startOfDay(endDateInput);
    while (day <= end) {
      daysArray.push(day);
      day = addDays(day, 1);
    }

    return { days: daysArray, dayWidth: width };
  }, [startDateInput, endDateInput, zoomLevel]);

  // Filter tasks with due dates and calculate their position
  const timelineTasks = useMemo(() => {
    return tasks
      .filter(task => !task.isArchived && task.dueDate)
      .map(task => {
        const dueDate = new Date(task.dueDate!);
        // Use startDate if available, otherwise use createdAt or 3 days before due
        const taskStartDate = task.startDate 
          ? new Date(task.startDate) 
          : task.createdAt 
            ? new Date(task.createdAt) 
            : addDays(dueDate, -3);
        const taskEndDate = dueDate;

        const startOffset = differenceInDays(taskStartDate, startDateInput);
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
      })
      .sort((a, b) => a.taskStartDate.getTime() - b.taskStartDate.getTime());
  }, [tasks, startDateInput, days.length]);

  // Calculate row index for each task (for Y positioning)
  const taskRowIndex = useMemo(() => {
    const index = new Map<string, number>();
    timelineTasks.forEach((task, i) => {
      index.set(task.id, i);
    });
    return index;
  }, [timelineTasks]);

  // Get dependency edges for visualization
  const dependencyEdges = useMemo(() => {
    if (!getDependencyEdges || !showDependencies) return [];
    
    const edges = getDependencyEdges();
    // Filter to only include edges where both tasks are visible in the timeline
    return edges.filter(edge => {
      const fromIndex = taskRowIndex.get(edge.fromTaskId);
      const toIndex = taskRowIndex.get(edge.toTaskId);
      return fromIndex !== undefined && toIndex !== undefined;
    });
  }, [getDependencyEdges, showDependencies, taskRowIndex]);

  const handlePrev = () => {
    switch (zoomLevel) {
      case 'day':
        setStartDateInput(addDays(startDateInput, -7));
        setEndDateInput(addDays(endDateInput, -7));
        break;
      case 'week':
        setStartDateInput(addWeeks(startDateInput, -2));
        setEndDateInput(addWeeks(endDateInput, -2));
        break;
      case 'month':
        setStartDateInput(subMonths(startDateInput, 1));
        setEndDateInput(subMonths(endDateInput, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (zoomLevel) {
      case 'day':
        setStartDateInput(addDays(startDateInput, 7));
        setEndDateInput(addDays(endDateInput, 7));
        break;
      case 'week':
        setStartDateInput(addWeeks(startDateInput, 2));
        setEndDateInput(addWeeks(endDateInput, 2));
        break;
      case 'month':
        setStartDateInput(addMonths(startDateInput, 1));
        setEndDateInput(addMonths(endDateInput, 1));
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
      const newStartDate = addDays(task.taskStartDate, daysDelta);
      const newDueDate = addDays(task.taskEndDate, daysDelta);
      onUpdateTask(draggedTask.id, { 
        startDate: newStartDate,
        dueDate: newDueDate 
      });
      setDragStartX(e.clientX);
    } else if (draggedTask.type === 'resize-start') {
      const newStartDate = addDays(dragStartDate, daysDelta);
      if (newStartDate < task.taskEndDate) {
        onUpdateTask(draggedTask.id, { startDate: newStartDate });
      }
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

  // Generate year options
  const currentYear = getYear(new Date());
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div 
      className="h-full flex flex-col p-6 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 flex-wrap gap-4">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Timeline
        </h2>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Desde:</span>
            <Input
              type="date"
              value={format(startDateInput, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setStartDateInput(new Date(e.target.value))}
              className="w-[140px] h-8"
            />
            <span className="text-sm text-muted-foreground">Hasta:</span>
            <Input
              type="date"
              value={format(endDateInput, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setEndDateInput(new Date(e.target.value))}
              className="w-[140px] h-8"
            />
          </div>

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
            <Button variant="outline" size="sm" onClick={() => {
              setStartDateInput(addDays(new Date(), -7));
              setEndDateInput(addDays(new Date(), 30));
            }}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Show Dependencies Toggle */}
          <Button
            variant={showDependencies ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDependencies(!showDependencies)}
            className="gap-2"
          >
            <Link className="w-4 h-4" />
            Dependencias
          </Button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden flex flex-col min-h-0">
        {/* Date Header - Synced scroll with content */}
        <div className="flex border-b border-border flex-shrink-0">
          {/* Fixed task column header */}
          <div className="w-56 flex-shrink-0 px-3 py-2 border-r border-border bg-muted/50 sticky left-0 z-20">
            <span className="text-sm font-medium text-muted-foreground">Tarea</span>
          </div>
          
          {/* Scrollable date headers */}
          <div 
            ref={headerRef}
            className="flex overflow-hidden flex-1"
          >
            {days.map((date, index) => {
              const showMonthYear = index === 0 || date.getDate() === 1;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex-shrink-0 px-0.5 py-1 text-center border-r border-border/50",
                    isToday(date) && "bg-primary/10",
                    isWeekend(date) && "bg-muted/30"
                  )}
                  style={{ width: dayWidth, minWidth: dayWidth }}
                >
                  {/* Month and Year - shown at start of month */}
                  {showMonthYear && (
                    <div className="text-[9px] text-muted-foreground font-medium truncate">
                      {format(date, 'MMM yyyy', { locale: es })}
                    </div>
                  )}
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
              );
            })}
          </div>
        </div>

        {/* Task Rows */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-auto scrollbar-thin relative"
          onScroll={handleScroll}
        >
          {timelineTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-lg font-medium">No hay tareas con fecha</p>
                <p className="text-sm">Añade fechas límite a tus tareas para verlas en el timeline</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Task Rows */}
              {timelineTasks.map((task, rowIndex) => {
                const left = Math.max(0, task.startOffset) * dayWidth;
                const visibleStart = Math.max(0, task.startOffset);
                const visibleEnd = Math.min(days.length, task.startOffset + task.duration);
                const width = Math.max((visibleEnd - visibleStart) * dayWidth, dayWidth);
                
                const isHighlighted = dependencyEdges.some(
                  edge => (edge.fromTaskId === task.id || edge.toTaskId === task.id) && 
                         hoveredEdge === `${edge.fromTaskId}-${edge.toTaskId}`
                );

                return (
                  <div 
                    key={task.id} 
                    data-task-id={task.id}
                    className={cn(
                      "flex min-h-[44px] border-b border-border/50 transition-colors",
                      isHighlighted && "bg-primary/5"
                    )}
                  >
                    {/* Task name column - STICKY */}
                    <div 
                      ref={taskColumnRef}
                      className={cn(
                        "w-56 flex-shrink-0 px-3 py-2 border-r border-border bg-card flex items-center sticky left-0 z-10 transition-colors",
                        isHighlighted && "bg-primary/10"
                      )}
                    >
                      <span className="text-sm truncate text-foreground font-medium">
                        {task.title}
                      </span>
                    </div>
                    
                    {/* Timeline area */}
                    <div className="flex-1 relative min-w-0" style={{ width: days.length * dayWidth }}>
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
                            style={{ width: dayWidth, minWidth: dayWidth }}
                          />
                        ))}
                      </div>
                      
                      {/* Task bar */}
                      <div
                        className={cn(
                          "absolute top-1 bottom-1 rounded-md flex items-center px-2 cursor-pointer transition-all group",
                          "hover:ring-2 hover:ring-primary/50",
                          draggedTask?.id === task.id && "opacity-70 ring-2 ring-primary",
                          isHighlighted && "ring-2 ring-primary"
                        )}
                        style={{
                          left,
                          width: Math.max(width, dayWidth),
                          backgroundColor: `${priorityColors[task.priority]}20`,
                          borderLeft: `3px solid ${priorityColors[task.priority]}`,
                        }}
                        onClick={() => onTaskClick(task)}
                      >
                        {/* Drag handle for moving */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                        </div>
                        
                        {/* Task title */}
                        <span className="text-xs font-medium truncate text-foreground ml-4">
                          {width > 100 ? task.title : ''}
                        </span>

                        {/* Tags */}
                        {task.tags.length > 0 && width > 150 && (
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

                        {/* Resize handle - left */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-primary/30 rounded-l-md transition-opacity"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'resize-start')}
                        />

                        {/* Resize handle - right */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-primary/30 rounded-r-md transition-opacity"
                          onMouseDown={(e) => handleDragStart(e, task.id, 'resize-end')}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Dependency Arrows SVG Overlay */}
              {showDependencies && dependencyEdges.length > 0 && (
                <svg
                  ref={svgRef}
                  className="absolute top-0 left-56 pointer-events-none"
                  style={{
                    width: days.length * dayWidth,
                    height: timelineTasks.length * 44,
                  }}
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="8"
                      markerHeight="6"
                      refX="7"
                      refY="3"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 8 3, 0 6"
                        fill="hsl(var(--primary))"
                      />
                    </marker>
                    <marker
                      id="arrowhead-hover"
                      markerWidth="10"
                      markerHeight="8"
                      refX="8"
                      refY="4"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 4, 0 8"
                        fill="hsl(var(--primary))"
                      />
                    </marker>
                  </defs>
                  
                  {dependencyEdges.map(edge => {
                    const fromIndex = taskRowIndex.get(edge.fromTaskId);
                    const toIndex = taskRowIndex.get(edge.toTaskId);
                    if (fromIndex === undefined || toIndex === undefined) return null;

                    const fromTask = timelineTasks.find(t => t.id === edge.fromTaskId);
                    const toTask = timelineTasks.find(t => t.id === edge.toTaskId);
                    if (!fromTask || !toTask) return null;

                    // Calculate positions
                    const fromEndX = Math.max(0, fromTask.startOffset) * dayWidth + 
                      Math.max((Math.min(days.length, fromTask.startOffset + fromTask.duration) - Math.max(0, fromTask.startOffset)) * dayWidth, dayWidth);
                    const fromY = fromIndex * 44 + 22; // Center of row

                    const toStartX = Math.max(0, toTask.startOffset) * dayWidth;
                    const toY = toIndex * 44 + 22;

                    const edgeId = `${edge.fromTaskId}-${edge.toTaskId}`;
                    const isHovered = hoveredEdge === edgeId;

                    // Create a curved path
                    const midX = (fromEndX + toStartX) / 2;
                    const pathD = fromY === toY
                      ? `M ${fromEndX} ${fromY} L ${toStartX - 4} ${toY}`
                      : `M ${fromEndX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toStartX - 4} ${toY}`;

                    return (
                      <g key={edgeId}>
                        {/* Invisible wider path for easier hover */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={12}
                          className="pointer-events-auto cursor-pointer"
                          onMouseEnter={() => setHoveredEdge(edgeId)}
                          onMouseLeave={() => setHoveredEdge(null)}
                          onClick={() => onTaskClick(edge.toTask)}
                        />
                        {/* Visible path */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          strokeDasharray={isHovered ? "none" : "4 2"}
                          markerEnd={isHovered ? "url(#arrowhead-hover)" : "url(#arrowhead)"}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
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
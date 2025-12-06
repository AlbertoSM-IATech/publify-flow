import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, SlidersHorizontal, LayoutGrid, List, Calendar, GanttChart, Sun, Moon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKanban } from '@/hooks/useKanban';
import { KanbanColumn } from './KanbanColumn';
import { TaskDetailPanel } from './TaskDetailPanel';
import { FilterPanel } from './FilterPanel';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { NewTaskDialog } from './NewTaskDialog';
import { TagManager } from './TagManager';
import { Task, ViewType } from '@/types/kanban';
import { cn } from '@/lib/utils';

export function KanbanBoard() {
  const kanban = useKanban();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | undefined>(undefined);
  const [showTagManager, setShowTagManager] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  // Derive selectedTask from tasks array for real-time reactivity
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return kanban.tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, kanban.tasks]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleClosePanel = () => {
    setSelectedTaskId(null);
  };

  const handleOpenNewTaskDialog = (columnId?: string) => {
    setNewTaskColumnId(columnId);
    setShowNewTaskDialog(true);
  };

  // Task drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    setDraggedColumnId(null); // Ensure column drag is not active
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `task:${taskId}`);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  // Column drag handlers - completely separate from task drag
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    e.stopPropagation();
    // Only allow column drag if no task is being dragged
    if (draggedTaskId) {
      e.preventDefault();
      return;
    }
    setDraggedColumnId(columnId);
    setDraggedTaskId(null); // Ensure task drag is not active
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `column:${columnId}`);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle column drops, not task drops
    if (draggedColumnId && draggedColumnId !== targetColumnId && !draggedTaskId) {
      const targetIndex = kanban.columns.findIndex(c => c.id === targetColumnId);
      kanban.moveColumn(draggedColumnId, targetIndex);
    }
    setDraggedColumnId(null);
  };

  const viewButtons = [
    { id: 'kanban' as ViewType, icon: LayoutGrid, label: 'Kanban' },
    { id: 'list' as ViewType, icon: List, label: 'Lista' },
    { id: 'calendar' as ViewType, icon: Calendar, label: 'Calendario' },
    { id: 'timeline' as ViewType, icon: GanttChart, label: 'Timeline' },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-foreground">Tareas</h1>
            <p className="text-sm text-muted-foreground">Gestiona tu trabajo de forma visual</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowTagManager(true)}
              className="border-border"
              title="Gestionar etiquetas"
            >
              <Tag className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="border-border"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button 
              onClick={() => handleOpenNewTaskDialog()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-coral"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva tarea
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          {/* View Switcher */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            {viewButtons.map(view => (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  currentView === view.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <view.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tareas..."
              value={kanban.filter.search}
              onChange={(e) => kanban.setFilter({ ...kanban.filter, search: e.target.value })}
              className="pl-10 bg-muted border-border"
            />
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "border-border",
              showFilters && "bg-primary/10 border-primary text-primary"
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {(kanban.filter.priority.length > 0 || kanban.filter.tags.length > 0) && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {kanban.filter.priority.length + kanban.filter.tags.length}
              </span>
            )}
          </Button>

          {/* Settings */}
          <Button variant="outline" className="border-border">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <FilterPanel
            filter={kanban.filter}
            setFilter={kanban.setFilter}
            availableTags={kanban.availableTags}
          />
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'kanban' && (
          <div className="h-full overflow-x-auto scrollbar-thin">
            <div className="flex gap-4 p-6 min-w-max h-full">
              {kanban.columns.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={kanban.getTasksByColumn(column.id)}
                  onTaskClick={handleTaskClick}
                  onOpenNewTaskDialog={() => handleOpenNewTaskDialog(column.id)}
                  onUpdateColumn={(updates) => kanban.updateColumn(column.id, updates)}
                  onDeleteColumn={() => kanban.deleteColumn(column.id)}
                  onMoveTask={kanban.moveTask}
                  draggedTaskId={draggedTaskId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onColumnDragStart={(e) => handleColumnDragStart(e, column.id)}
                  onColumnDragEnd={handleColumnDragEnd}
                  onColumnDrop={(e) => handleColumnDrop(e, column.id)}
                  isDraggingColumn={draggedColumnId === column.id}
                  isAnyTaskDragging={draggedTaskId !== null}
                />
              ))}
              
              {/* Add Column Button */}
              <button
                onClick={() => kanban.addColumn('Nueva columna')}
                className="min-w-[300px] h-fit bg-muted/30 hover:bg-muted/50 border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all"
              >
                <Plus className="w-5 h-5" />
                Añadir columna
              </button>
            </div>
          </div>
        )}

        {currentView === 'list' && (
          <ListView
            tasks={kanban.getFilteredTasks()}
            columns={kanban.columns}
            onTaskClick={handleTaskClick}
            onUpdateTask={kanban.updateTask}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            tasks={kanban.getFilteredTasks()}
            columns={kanban.columns}
            onTaskClick={handleTaskClick}
            onAddTask={kanban.addTask}
            onUpdateTask={kanban.updateTask}
          />
        )}

        {currentView === 'timeline' && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <GanttChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Vista Timeline</p>
              <p className="text-sm">Próximamente disponible</p>
            </div>
          </div>
        )}
      </main>

      {/* Task Detail Panel */}
      {selectedTask && selectedTaskId && (
        <TaskDetailPanel
          key={selectedTaskId}
          task={selectedTask}
          columns={kanban.columns}
          availableTags={kanban.availableTags}
          onClose={handleClosePanel}
          onUpdate={(updates) => kanban.updateTask(selectedTaskId, updates)}
          onDelete={() => {
            kanban.deleteTask(selectedTaskId);
            handleClosePanel();
          }}
          onDuplicate={() => kanban.duplicateTask(selectedTaskId)}
          onAddChecklistItem={(text) => kanban.addChecklistItem(selectedTaskId, text)}
          onToggleChecklistItem={(itemId) => kanban.toggleChecklistItem(selectedTaskId, itemId)}
          onDeleteChecklistItem={(itemId) => kanban.deleteChecklistItem(selectedTaskId, itemId)}
        />
      )}

      {/* New Task Dialog */}
      <NewTaskDialog
        open={showNewTaskDialog}
        onOpenChange={setShowNewTaskDialog}
        columns={kanban.columns}
        availableTags={kanban.availableTags}
        onCreateTask={kanban.addTask}
        defaultColumnId={newTaskColumnId}
      />

      {/* Tag Manager */}
      <TagManager
        open={showTagManager}
        onOpenChange={setShowTagManager}
        tags={kanban.availableTags}
        onAddTag={kanban.addTag}
        onUpdateTag={kanban.updateTag}
        onDeleteTag={kanban.deleteTag}
      />
    </div>
  );
}

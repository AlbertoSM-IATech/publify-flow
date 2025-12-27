import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, LayoutGrid, List, Calendar, GanttChart, Tag, FileText, Undo2, Redo2, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKanbanReducer } from '@/hooks/kanban';
import { KanbanColumn } from './KanbanColumn';
import { TaskDetailPanel } from './TaskDetailPanel';
import { FilterPanel } from './FilterPanel';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { TimelineView } from './TimelineView';
import { NotesView } from './NotesView';
import { NewTaskDialog } from './NewTaskDialog';
import { TagManager } from './TagManager';
import { SaveIndicator } from './SaveIndicator';
import { Task, ViewType } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function KanbanBoard() {
  const kanban = useKanbanReducer();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | undefined>(undefined);
  const [showTagManager, setShowTagManager] = useState(false);

  // BUG FIX: Derive selectedTask from tasks array for real-time reactivity
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return kanban.tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, kanban.tasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleOpenNewTaskDialog = useCallback((columnId?: string) => {
    setNewTaskColumnId(columnId);
    setShowNewTaskDialog(true);
  }, []);

  // WIP Limit check wrapper for moveTask
  const handleMoveTask = useCallback((taskId: string, targetColumnId: string, targetIndex: number) => {
    const task = kanban.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Skip WIP check if moving within the same column
    if (task.columnId !== targetColumnId) {
      // Check WIP limit
      if (kanban.wouldExceedWipLimit(targetColumnId)) {
        const column = kanban.columns.find(c => c.id === targetColumnId);
        toast.error(`Límite WIP alcanzado`, {
          description: `La columna "${column?.title}" tiene un límite de ${column?.wipLimit} tareas.`,
        });
        return;
      }
    }
    
    kanban.moveTask(taskId, targetColumnId, targetIndex);
  }, [kanban]);

  // BUG FIX: Task drag handlers - completely isolated from column drag
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    setDraggedColumnId(null); // Ensure column drag is not active
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
  }, []);

  // BUG FIX: Column drag handlers - completely separate from task drag
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: string) => {
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
  }, [draggedTaskId]);

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumnId(null);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle column drops, not task drops
    if (draggedColumnId && draggedColumnId !== targetColumnId && !draggedTaskId) {
      const targetIndex = kanban.columns.findIndex(c => c.id === targetColumnId);
      kanban.moveColumn(draggedColumnId, targetIndex);
    }
    setDraggedColumnId(null);
  }, [draggedColumnId, draggedTaskId, kanban]);

  const viewButtons = [
    { id: 'kanban' as ViewType, icon: LayoutGrid, label: 'Kanban' },
    { id: 'list' as ViewType, icon: List, label: 'Lista' },
    { id: 'calendar' as ViewType, icon: Calendar, label: 'Calendario' },
    { id: 'timeline' as ViewType, icon: GanttChart, label: 'Timeline' },
    { id: 'notes' as ViewType, icon: FileText, label: 'Notas' },
  ];

  // Get visible and hidden columns
  const visibleColumns = kanban.columns.filter(c => !c.isHidden);
  const hiddenColumns = kanban.columns.filter(c => c.isHidden);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-heading font-semibold text-foreground">Tareas</h1>
              <p className="text-sm text-muted-foreground">Gestiona tu trabajo de forma visual</p>
            </div>
            {/* Save Indicator */}
            <SaveIndicator status={kanban.saveStatus} />
          </div>
          <div className="flex items-center gap-2">
            {/* Undo/Redo Buttons */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={kanban.undo}
                disabled={!kanban.canUndo}
                className="rounded-none border-r border-border h-9 w-9"
                title="Deshacer (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={kanban.redo}
                disabled={!kanban.canRedo}
                className="rounded-none h-9 w-9"
                title="Rehacer (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>
            {/* Hidden Columns Menu */}
            {hiddenColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border gap-2"
                    title="Columnas ocultas"
                  >
                    <EyeOff className="w-4 h-4" />
                    <span className="text-xs bg-muted-foreground/20 rounded-full px-1.5">
                      {hiddenColumns.length}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Columnas ocultas
                  </div>
                  <DropdownMenuSeparator />
                  {hiddenColumns.map(col => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={() => kanban.updateColumn(col.id, { isHidden: false })}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="flex-1 truncate">{col.title}</span>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

      {/* Main Content - BUG FIX: Prevent overflow issues */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'kanban' && (
          <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin">
            <div className="flex gap-4 p-6 min-w-max h-full">
              {visibleColumns.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={kanban.getTasksByColumn(column.id)}
                  onTaskClick={handleTaskClick}
                  onOpenNewTaskDialog={() => handleOpenNewTaskDialog(column.id)}
                  onUpdateColumn={(updates) => kanban.updateColumn(column.id, updates)}
                  onDeleteColumn={() => kanban.deleteColumn(column.id)}
                  onMoveTask={handleMoveTask}
                  draggedTaskId={draggedTaskId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onColumnDragStart={(e) => handleColumnDragStart(e, column.id)}
                  onColumnDragEnd={handleColumnDragEnd}
                  onColumnDrop={(e) => handleColumnDrop(e, column.id)}
                  isDraggingColumn={draggedColumnId === column.id}
                  isAnyTaskDragging={draggedTaskId !== null}
                  wouldExceedWipLimit={kanban.wouldExceedWipLimit(column.id)}
                  getTaskBlockedStatus={(taskId) => {
                    const result = kanban.isTaskBlocked(taskId);
                    return { blocked: result.blocked, blockingTasks: result.blockingTasks };
                  }}
                  shouldBlockMoveToColumn={kanban.shouldBlockMoveToColumn}
                />
              ))}
              
              {/* Add Column Button */}
              <button
                onClick={() => kanban.addColumn('Nueva columna')}
                className="min-w-[300px] h-fit bg-muted/30 hover:bg-muted/50 border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
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
            getTaskBlockedStatus={(taskId) => {
              const result = kanban.isTaskBlocked(taskId);
              return { blocked: result.blocked, blockingTasks: result.blockingTasks };
            }}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            tasks={kanban.getFilteredTasks()}
            columns={kanban.columns}
            availableTags={kanban.availableTags}
            onTaskClick={handleTaskClick}
            onAddTask={kanban.addTask}
            onUpdateTask={kanban.updateTask}
          />
        )}

        {currentView === 'timeline' && (
          <TimelineView
            tasks={kanban.getFilteredTasks()}
            columns={kanban.columns}
            onTaskClick={handleTaskClick}
            onUpdateTask={kanban.updateTask}
            getDependencyEdges={kanban.getDependencyEdges}
          />
        )}

        {currentView === 'notes' && (
          <NotesView
            notes={kanban.notes}
            onAddNote={kanban.addNote}
            onUpdateNote={kanban.updateNote}
            onDeleteNote={kanban.deleteNote}
          />
        )}
      </main>

      {/* Task Detail Panel */}
      {selectedTask && selectedTaskId && (
        <TaskDetailPanel
          key={selectedTaskId}
          task={selectedTask}
          columns={kanban.columns}
          availableTags={kanban.availableTags}
          allTasks={kanban.tasks}
          onClose={handleClosePanel}
          onUpdate={(updates) => kanban.updateTask(selectedTaskId, updates)}
          onDelete={() => {
            kanban.deleteTask(selectedTaskId);
            handleClosePanel();
          }}
          onDuplicate={() => kanban.duplicateTask(selectedTaskId)}
          onArchive={() => {
            if (selectedTask?.isArchived) {
              kanban.unarchiveTask(selectedTaskId);
            } else {
              kanban.archiveTask(selectedTaskId);
              handleClosePanel();
            }
          }}
          onAddChecklistItem={(text) => kanban.addChecklistItem(selectedTaskId, text)}
          onToggleChecklistItem={(itemId) => kanban.toggleChecklistItem(selectedTaskId, itemId)}
          onDeleteChecklistItem={(itemId) => kanban.deleteChecklistItem(selectedTaskId, itemId)}
          onAddDependency={(dependsOnTaskId) => kanban.addDependency(selectedTaskId, dependsOnTaskId)}
          onRemoveDependency={(dependencyId) => kanban.removeDependency(selectedTaskId, dependencyId)}
          isBlocked={kanban.isTaskBlocked(selectedTaskId).blocked}
          blockingTasks={kanban.isTaskBlocked(selectedTaskId).blockingTasks}
          wouldCreateCycle={(dependsOnTaskId) => kanban.wouldCreateCycle(selectedTaskId, dependsOnTaskId)}
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

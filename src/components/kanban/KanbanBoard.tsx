import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, LayoutGrid, List, Calendar, GanttChart, Tag, FileText, Undo2, Redo2, EyeOff, Eye, Archive, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useKanbanReducer } from '@/hooks/kanban';
import { KanbanColumn } from './KanbanColumn';
import { TaskDetailPanel } from './TaskDetailPanel';
import { CompactFilterPanel } from './CompactFilterPanel';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { TimelineView } from './TimelineView';
import { NotesView } from './NotesView';
import { NewTaskDialog } from './NewTaskDialog';
import { TagManager } from './TagManager';
import { SaveIndicator } from './SaveIndicator';
import { ArchivedTasksPanel } from './ArchivedTasksPanel';
import { Task, ViewType } from '@/types/kanban';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface KanbanBoardProps {
  bookId: string;
}

export function KanbanBoard({ bookId }: KanbanBoardProps) {
  const kanban = useKanbanReducer(bookId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | undefined>(undefined);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showArchivedPanel, setShowArchivedPanel] = useState(false);

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

  // Get visible and hidden columns, sorted by order
  const kanbanColumns = useMemo(() => kanban.allColumns, [kanban.allColumns]);
  const visibleColumns = useMemo(() => 
    kanbanColumns.filter(c => !c.isHidden).sort((a, b) => a.order - b.order),
    [kanbanColumns]
  );
  const hiddenColumns = useMemo(() => 
    kanbanColumns.filter(c => c.isHidden).sort((a, b) => a.order - b.order),
    [kanbanColumns]
  );

  // Check if board is empty (no tasks)
  const isEmpty = kanban.tasks.filter(t => !t.isArchived).length === 0;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-heading font-semibold text-foreground">Flujo editorial</h1>
              <p className="text-sm text-muted-foreground">
                Organiza el trabajo del libro por fases. Mueve tareas entre columnas y controla el progreso real (tareas + subtareas).
              </p>
            </div>
            {/* Save Indicator */}
            <SaveIndicator status={kanban.saveStatus} />
          </div>
          
          {/* Book Progress Indicator */}
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Progreso del libro</span>
                      <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                    </div>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={kanban.bookProgress} className="h-2 flex-1" />
                      <span className="text-sm font-semibold text-foreground w-10 text-right">
                        {kanban.bookProgress}%
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    Este porcentaje se calcula con el avance real: tareas completadas y subtareas marcadas. Las tareas archivadas no cuentan.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Archived Tasks Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchivedPanel(true)}
              className="border-border gap-2"
            >
              <Archive className="w-4 h-4" />
              Archivadas
              {kanban.getArchivedTasks().length > 0 && (
                <span className="text-xs bg-muted-foreground/20 rounded-full px-1.5">
                  {kanban.getArchivedTasks().length}
                </span>
              )}
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

          {/* Undo/Redo Buttons */}
          <div className="flex items-center border-2 border-primary/30 rounded-lg overflow-hidden bg-primary/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={kanban.undo}
              disabled={!kanban.canUndo}
              className="rounded-none border-r border-primary/30 h-9 px-3 gap-1"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Deshacer</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={kanban.redo}
              disabled={!kanban.canRedo}
              className="rounded-none h-9 px-3 gap-1"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Rehacer</span>
            </Button>
          </div>

          {/* Tags Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagManager(true)}
            className="border-border gap-2"
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Etiquetas</span>
          </Button>

          {/* Column Visibility Manager */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-border gap-2",
                  hiddenColumns.length > 0 && "border-amber-500/50 bg-amber-500/10"
                )}
                title="Gestionar columnas"
              >
                {hiddenColumns.length > 0 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs">Columnas</span>
                {hiddenColumns.length > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-600 rounded-full px-1.5">
                    {hiddenColumns.length} ocultas
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {hiddenColumns.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <EyeOff className="w-3 h-3" />
                    Columnas ocultas ({hiddenColumns.length})
                  </div>
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
                      <Eye className="w-4 h-4 text-green-500" />
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-3 h-3" />
                Columnas visibles ({visibleColumns.length})
              </div>
              {visibleColumns.map(col => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => kanban.updateColumn(col.id, { isHidden: true })}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="flex-1 truncate">{col.title}</span>
                  <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Compact Filter Panel */}
        {showFilters && (
          <CompactFilterPanel
            filter={kanban.filter}
            setFilter={kanban.setFilter}
            availableTags={kanban.availableTags}
            uniqueAssignees={kanban.getUniqueAssignees()}
          />
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'kanban' && (
          <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin">
            {isEmpty ? (
              /* Empty State */
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md p-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-heading font-semibold mb-2">Empieza por aquí.</h2>
                  <p className="text-muted-foreground mb-6">
                    Crea tu primera tarea y colócala en la fase que toque. Publify calculará el progreso automáticamente.
                  </p>
                  <Button
                    onClick={() => handleOpenNewTaskDialog()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva tarea
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 p-6 min-w-max h-full">
                {visibleColumns.map(column => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={kanban.getTasksByColumn(column.id)}
                    columnProgress={kanban.getColumnProgress(column.id)}
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
                    canArchiveTask={(taskId) => kanban.canArchive(taskId)}
                    onArchiveTask={(taskId) => {
                      kanban.archiveTask(taskId);
                      toast.success('Tarea archivada.');
                    }}
                    restoreTargetColumns={visibleColumns}
                    onRestoreTask={(taskId, targetColumnId) => {
                      const tasksInTarget = kanban.getTasksByColumn(targetColumnId).length;
                      kanban.moveTask(taskId, targetColumnId, tasksInTarget);
                      kanban.updateTask(taskId, { isArchived: false });
                      toast.success('Tarea restaurada');
                    }}
                    onUpdateTask={kanban.updateTask}
                    onDeleteTask={(taskId) => {
                      kanban.deleteTask(taskId);
                      toast.success('Tarea eliminada');
                    }}
                    onMoveTaskToColumn={(taskId, targetColumnId) => {
                      const tasksInTarget = kanban.getTasksByColumn(targetColumnId).length;
                      handleMoveTask(taskId, targetColumnId, tasksInTarget);
                    }}
                    allVisibleColumns={visibleColumns}
                  />
                ))}
                
                {/* Add Column Button */}
                <button
                  onClick={() => kanban.addColumn('Nueva columna', '')}
                  className="min-w-[300px] h-fit bg-muted/30 hover:bg-muted/50 border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  Añadir columna
                </button>
              </div>
            )}
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
            columns={visibleColumns}
            onConvertToTask={(note, columnId) => {
              kanban.addTask(columnId, {
                title: note.title,
                description: note.content || note.shortDescription || '',
                priority: note.priority,
                status: 'not_started',
              });
              toast.success('Nota convertida en tarea');
            }}
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

      {/* Archived Tasks Panel */}
      <ArchivedTasksPanel
        open={showArchivedPanel}
        onOpenChange={setShowArchivedPanel}
        archivedTasks={kanban.getArchivedTasks()}
        columns={visibleColumns}
        onRestoreTask={(taskId, targetColumnId) => {
          const tasksInTarget = kanban.getTasksByColumn(targetColumnId).length;
          kanban.moveTask(taskId, targetColumnId, tasksInTarget);
          kanban.updateTask(taskId, { isArchived: false });
          toast.success('Tarea restaurada');
        }}
        onDeleteTask={(taskId) => {
          kanban.deleteTask(taskId);
          toast.success('Tarea eliminada');
        }}
        onBulkRestore={(taskIds, targetColumnId) => {
          taskIds.forEach(taskId => {
            const tasksInTarget = kanban.getTasksByColumn(targetColumnId).length;
            kanban.moveTask(taskId, targetColumnId, tasksInTarget);
            kanban.updateTask(taskId, { isArchived: false });
          });
          toast.success(`${taskIds.length} tareas restauradas`);
        }}
        onBulkDelete={(taskIds) => {
          taskIds.forEach(taskId => kanban.deleteTask(taskId));
          toast.success(`${taskIds.length} tareas eliminadas`);
        }}
      />
    </div>
  );
}

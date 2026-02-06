import { useReducer, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Task, Column, Tag, Note, Filter, Subtask, Automation, AutomationExecution, AutomationNotification } from '@/types/kanban';
import { KanbanState, HistoryState, SaveStatus } from './kanban.types';
import { kanbanReducer } from './kanban.reducer';
import { loadKanbanState, saveKanbanState } from './kanban.storage';
import { createSeedState } from './kanban.seed';
import { wouldCreateCycle, getDependencyEdges } from './kanban.dependencies';
import { calculateTaskProgress, calculateBookProgress, calculateColumnProgress, isTaskCompleted, canArchiveTask } from './kanban.progress';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Factory to create initializer for a specific book
function createInitialHistory(bookId: string): () => HistoryState {
  return () => {
    try {
      const stored = loadKanbanState(bookId);
      const initialState = stored || createSeedState(bookId);
      
      // Ensure all tasks belong to this book
      initialState.tasks = initialState.tasks.map(task => ({
        ...task,
        relatedBook: bookId,
      }));
      
      return {
        past: [],
        present: initialState,
        future: [],
      };
    } catch (error) {
      console.error('Error loading kanban state:', error);
      return {
        past: [],
        present: createSeedState(bookId),
        future: [],
      };
    }
  };
}

export function useKanbanReducer(bookId: string) {
  // Use lazy initialization with bookId
  const [history, dispatch] = useReducer(kanbanReducer, undefined, createInitialHistory(bookId));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>('');
  const currentBookIdRef = useRef(bookId);

  const { present: state, past, future } = history;

  // Reload state if bookId changes
  useEffect(() => {
    if (currentBookIdRef.current !== bookId) {
      currentBookIdRef.current = bookId;
      const stored = loadKanbanState(bookId);
      const newState = stored || createSeedState(bookId);
      // Ensure all tasks belong to this book
      newState.tasks = newState.tasks.map(task => ({
        ...task,
        relatedBook: bookId,
      }));
      dispatch({ type: 'INIT_STATE', payload: newState });
    }
  }, [bookId]);

  // Auto-save on state changes (debounced)
  useEffect(() => {
    const stateHash = JSON.stringify({
      tasks: state.tasks,
      columns: state.columns,
      tags: state.tags,
      notes: state.notes,
      automations: state.automations,
    });

    if (stateHash === lastSavedRef.current) return;

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveKanbanState(state, bookId);
      lastSavedRef.current = stateHash;
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.tasks, state.columns, state.tags, state.notes, state.automations, bookId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ========== Actions ==========
  
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Task actions - always set relatedBook to current bookId
  const addTask = useCallback((columnId: string, task: Partial<Task>) => {
    dispatch({ 
      type: 'TASK_CREATED', 
      payload: { 
        columnId, 
        task: {
          ...task,
          relatedBook: bookId, // Always set to current book
        } 
      } 
    });
  }, [bookId]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({ type: 'TASK_UPDATED', payload: { taskId, updates } });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    dispatch({ type: 'TASK_DELETED', payload: taskId });
  }, []);

  const moveTask = useCallback((taskId: string, targetColumnId: string, targetIndex: number) => {
    dispatch({ type: 'TASK_MOVED', payload: { taskId, targetColumnId, targetIndex } });
  }, []);

  const archiveTask = useCallback((taskId: string) => {
    dispatch({ type: 'TASK_ARCHIVED', payload: taskId });
  }, []);

  const unarchiveTask = useCallback((taskId: string) => {
    dispatch({ type: 'TASK_UNARCHIVED', payload: taskId });
  }, []);

  const duplicateTask = useCallback((taskId: string) => {
    dispatch({ type: 'TASK_DUPLICATED', payload: taskId });
  }, []);

  // Subtask actions
  const addSubtask = useCallback((taskId: string, title: string, assignedTo?: string, dueDate?: Date) => {
    dispatch({ type: 'SUBTASK_CREATED', payload: { taskId, title, assignedTo, dueDate } });
  }, []);

  const updateSubtask = useCallback((taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
    dispatch({ type: 'SUBTASK_UPDATED', payload: { taskId, subtaskId, updates } });
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    dispatch({ type: 'SUBTASK_TOGGLED', payload: { taskId, subtaskId } });
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    dispatch({ type: 'SUBTASK_DELETED', payload: { taskId, subtaskId } });
  }, []);

  // Legacy checklist actions (deprecated, redirect to subtasks)
  const addChecklistItem = useCallback((taskId: string, text: string) => {
    dispatch({ type: 'CHECKLIST_ITEM_ADDED', payload: { taskId, text } });
  }, []);

  const toggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    dispatch({ type: 'CHECKLIST_ITEM_TOGGLED', payload: { taskId, itemId } });
  }, []);

  const deleteChecklistItem = useCallback((taskId: string, itemId: string) => {
    dispatch({ type: 'CHECKLIST_ITEM_DELETED', payload: { taskId, itemId } });
  }, []);

  // Column actions
  const addColumn = useCallback((title: string, subtitle: string = '') => {
    dispatch({ type: 'COLUMN_CREATED', payload: { title, subtitle } });
  }, []);

  const updateColumn = useCallback((columnId: string, updates: Partial<Column>) => {
    dispatch({ type: 'COLUMN_UPDATED', payload: { columnId, updates } });
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    dispatch({ type: 'COLUMN_DELETED', payload: columnId });
  }, []);

  const moveColumn = useCallback((columnId: string, targetIndex: number) => {
    dispatch({ type: 'COLUMN_MOVED', payload: { columnId, targetIndex } });
  }, []);

  // Tag actions
  const addTag = useCallback((name: string, color: string) => {
    dispatch({ type: 'TAG_CREATED', payload: { name, color } });
  }, []);

  const updateTag = useCallback((tagId: string, updates: Partial<Tag>) => {
    dispatch({ type: 'TAG_UPDATED', payload: { tagId, updates } });
  }, []);

  const deleteTag = useCallback((tagId: string) => {
    dispatch({ type: 'TAG_DELETED', payload: tagId });
  }, []);

  // Note actions
  const addNote = useCallback((note: Partial<Note>) => {
    dispatch({ type: 'NOTE_CREATED', payload: note });
  }, []);

  const updateNote = useCallback((noteId: string, updates: Partial<Note>) => {
    dispatch({ type: 'NOTE_UPDATED', payload: { noteId, updates } });
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    dispatch({ type: 'NOTE_DELETED', payload: noteId });
  }, []);

  // Filter action
  const setFilter = useCallback((filter: Filter) => {
    dispatch({ type: 'FILTER_UPDATED', payload: filter });
  }, []);

  // ========== Computed / Getters ==========
  
  // Only get tasks for the current book
  const bookTasks = useMemo(() => {
    return state.tasks.filter(task => task.relatedBook === bookId);
  }, [state.tasks, bookId]);

  const getFilteredTasks = useCallback(() => {
    return bookTasks.filter(task => {
      if (task.isArchived && !state.filter.showArchived) return false;
      if (state.filter.priority.length > 0 && !state.filter.priority.includes(task.priority)) return false;
      if (state.filter.tags.length > 0 && !task.tags.some(t => state.filter.tags.includes(t.id))) return false;
      if (state.filter.assignee && task.assignee !== state.filter.assignee) return false;
      if (state.filter.search && !task.title.toLowerCase().includes(state.filter.search.toLowerCase())) return false;
      if (state.filter.market && task.relatedMarket !== state.filter.market) return false;
      return true;
    });
  }, [bookTasks, state.filter]);

  const getArchivedTasks = useCallback(() => {
    return bookTasks.filter(task => task.isArchived);
  }, [bookTasks]);

  const getTasksByColumn = useCallback((columnId: string) => {
    return getFilteredTasks()
      .filter(task => task.columnId === columnId && !task.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [getFilteredTasks]);

  const getUniqueAssignees = useCallback(() => {
    const assignees = new Set<string>();
    bookTasks.forEach(task => {
      if (task.assignee) assignees.add(task.assignee);
    });
    return Array.from(assignees);
  }, [bookTasks]);

  const getUniqueMarkets = useCallback(() => {
    const markets = new Set<string>();
    bookTasks.forEach(task => {
      if (task.relatedMarket) markets.add(task.relatedMarket);
    });
    return Array.from(markets);
  }, [bookTasks]);

  const getColumnTaskCount = useCallback((columnId: string) => {
    return bookTasks.filter(t => t.columnId === columnId && !t.isArchived).length;
  }, [bookTasks]);

  const wouldExceedWipLimit = useCallback((columnId: string) => {
    const column = state.columns.find(c => c.id === columnId);
    if (!column?.wipLimit) return false;
    return getColumnTaskCount(columnId) >= column.wipLimit;
  }, [state.columns, getColumnTaskCount]);

  // Progress calculations
  const bookProgress = useMemo(() => {
    return calculateBookProgress(state, bookId);
  }, [state, bookId]);

  const getColumnProgress = useCallback((columnId: string) => {
    return calculateColumnProgress(state, bookId, columnId);
  }, [state, bookId]);

  const getTaskProgress = useCallback((taskId: string) => {
    const task = bookTasks.find(t => t.id === taskId);
    if (!task) return 0;
    return Math.round(calculateTaskProgress(task) * 100);
  }, [bookTasks]);

  // Check if task can be archived
  const canArchive = useCallback((taskId: string) => {
    const task = bookTasks.find(t => t.id === taskId);
    if (!task) return false;
    return canArchiveTask(task);
  }, [bookTasks]);

  // Dependency helpers - updated to use new completion logic
  const isTaskBlockedFn = useCallback((taskId: string) => {
    const task = bookTasks.find(t => t.id === taskId);
    if (!task) return { blocked: false, blockingTaskIds: [], blockingTasks: [] };
    
    const dependencies = task.taskDependencies || [];
    if (dependencies.length === 0) {
      return { blocked: false, blockingTaskIds: [], blockingTasks: [] };
    }

    const blockingTasks: Task[] = [];
    const blockingTaskIds: string[] = [];

    for (const dep of dependencies) {
      const dependsOnTask = bookTasks.find(t => t.id === dep.dependsOnTaskId);
      if (!dependsOnTask) continue;
      
      // Use new completion logic instead of isDoneColumn
      if (!isTaskCompleted(dependsOnTask)) {
        blockingTaskIds.push(dep.dependsOnTaskId);
        blockingTasks.push(dependsOnTask);
      }
    }

    return {
      blocked: blockingTaskIds.length > 0,
      blockingTaskIds,
      blockingTasks,
    };
  }, [bookTasks]);

  const shouldBlockMoveToColumn = useCallback((taskId: string, targetColumnId: string) => {
    // No longer block moves to any column since there's no "done" column
    // Blocking is now based on task status/progress, not column
    return { blocked: false, reason: '', blockingTasks: [] as Task[] };
  }, []);

  const wouldCreateCycleFn = useCallback((taskId: string, dependsOnTaskId: string) => {
    return wouldCreateCycle(taskId, dependsOnTaskId, state);
  }, [state]);

  const getDependencyEdgesFn = useCallback(() => {
    return getDependencyEdges(state);
  }, [state]);

  return {
    // Book context
    bookId,
    
    // State
    tasks: bookTasks,
    columns: state.columns.filter(c => !c.isHidden).sort((a, b) => a.order - b.order),
    allColumns: state.columns.sort((a, b) => a.order - b.order),
    availableTags: state.tags,
    filter: state.filter,
    automations: state.automations,
    notes: state.notes,
    
    // Progress
    bookProgress,
    getColumnProgress,
    getTaskProgress,
    canArchive,
    
    // Save status
    saveStatus,
    
    // Undo / Redo
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Task actions
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    archiveTask,
    unarchiveTask,
    duplicateTask,
    
    // Subtask actions
    addSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask,
    
    // Legacy checklist actions (deprecated)
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    
    // Column actions
    addColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
    
    // Tag actions
    addTag,
    updateTag,
    deleteTag,
    
    // Note actions
    addNote,
    updateNote,
    deleteNote,
    
    // Filter
    setFilter,
    
    // Automation actions
    addAutomation: useCallback((automation: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date();
      dispatch({
        type: 'AUTOMATION_CREATED',
        payload: { ...automation, id: generateId(), createdAt: now, updatedAt: now },
      });
    }, []),
    updateAutomation: useCallback((automationId: string, updates: Partial<Automation>) => {
      dispatch({ type: 'AUTOMATION_UPDATED', payload: { automationId, updates } });
    }, []),
    deleteAutomation: useCallback((automationId: string) => {
      dispatch({ type: 'AUTOMATION_DELETED', payload: automationId });
    }, []),
    toggleAutomation: useCallback((automationId: string) => {
      dispatch({ type: 'AUTOMATION_TOGGLED', payload: automationId });
    }, []),
    dismissNotification: useCallback((notificationId: string) => {
      dispatch({ type: 'NOTIFICATION_DISMISSED', payload: notificationId });
    }, []),
    clearNotifications: useCallback(() => {
      dispatch({ type: 'NOTIFICATIONS_CLEARED' });
    }, []),
    
    // Dependency actions
    addDependency: useCallback((taskId: string, dependsOnTaskId: string) => {
      dispatch({ type: 'DEPENDENCY_ADDED', payload: { taskId, dependsOnTaskId } });
    }, []),
    removeDependency: useCallback((taskId: string, dependencyId: string) => {
      dispatch({ type: 'DEPENDENCY_REMOVED', payload: { taskId, dependencyId } });
    }, []),
    isTaskBlocked: isTaskBlockedFn,
    shouldBlockMoveToColumn,
    wouldCreateCycle: wouldCreateCycleFn,
    getDependencyEdges: getDependencyEdgesFn,
    
    // Getters
    getFilteredTasks,
    getArchivedTasks,
    getTasksByColumn,
    getUniqueAssignees,
    getUniqueMarkets,
    getColumnTaskCount,
    wouldExceedWipLimit,
  };
}

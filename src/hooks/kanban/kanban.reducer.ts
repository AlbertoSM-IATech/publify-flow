import { Task, Column, Tag, Note, Filter, Subtask, Automation, AutomationExecution, AutomationNotification, TaskDependency } from '@/types/kanban';
import { KanbanState, HistoryState, KanbanAction } from './kanban.types';
import { wouldCreateCycle } from './kanban.dependencies';

const MAX_HISTORY_LENGTH = 50;

const generateId = () => Math.random().toString(36).substr(2, 9);

// ========== PROGRESS CALCULATION ==========
// Pure function to calculate task progress based on subtasks
export function calculateTaskProgress(task: Task): number {
  if (!task.subtasks || task.subtasks.length === 0) {
    // No subtasks: 0% if not started, 100% if completed
    return task.status === 'completed' ? 100 : 0;
  }
  
  const completed = task.subtasks.filter(s => s.completed).length;
  return Math.round((completed / task.subtasks.length) * 100);
}

// Check if all subtasks are completed
function areAllSubtasksCompleted(task: Task): boolean {
  if (!task.subtasks || task.subtasks.length === 0) return false;
  return task.subtasks.every(s => s.completed);
}

// Check if any subtask is incomplete
function hasIncompleteSubtasks(task: Task): boolean {
  if (!task.subtasks || task.subtasks.length === 0) return false;
  return task.subtasks.some(s => !s.completed);
}

// Sync task status based on subtasks completion
function syncTaskStatusWithSubtasks(task: Task): Task {
  if (!task.subtasks || task.subtasks.length === 0) return task;
  
  const allCompleted = areAllSubtasksCompleted(task);
  const hasIncomplete = hasIncompleteSubtasks(task);
  
  // If all subtasks are completed, mark task as completed
  if (allCompleted && task.status !== 'completed') {
    return { ...task, status: 'completed' };
  }
  
  // If task is marked completed but has incomplete subtasks, revert to in_progress
  if (task.status === 'completed' && hasIncomplete) {
    return { ...task, status: 'in_progress' };
  }
  
  return task;
}

// Helper to push state to history
function pushToHistory(history: HistoryState, skipHistory = false): HistoryState {
  if (skipHistory) return history;
  
  const newPast = [...history.past, history.present].slice(-MAX_HISTORY_LENGTH);
  return {
    past: newPast,
    present: history.present,
    future: [], // Clear future on new action
  };
}

// Main reducer function
export function kanbanReducer(history: HistoryState, action: KanbanAction): HistoryState {
  const { present } = history;

  switch (action.type) {
    // ========== UNDO / REDO ==========
    case 'UNDO': {
      if (history.past.length === 0) return history;
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [history.present, ...history.future],
      };
    }

    case 'REDO': {
      if (history.future.length === 0) return history;
      const next = history.future[0];
      const newFuture = history.future.slice(1);
      return {
        past: [...history.past, history.present],
        present: next,
        future: newFuture,
      };
    }

    // ========== INITIALIZATION ==========
    case 'INIT_STATE': {
      const newState = action.payload as KanbanState;
      return {
        past: [],
        present: newState,
        future: [],
      };
    }

    // ========== TASK ACTIONS ==========
    case 'TASK_CREATED': {
      const { columnId, task } = action.payload as { columnId: string; task: Partial<Task> };
      const now = new Date();
      const newTask: Task = {
        id: generateId(),
        title: task.title || 'Nueva tarea',
        description: task.description || '',
        columnId,
        priority: task.priority || 'medium',
        status: task.status || 'not_started',
        tags: task.tags || [],
        dueDate: task.dueDate || null,
        startDate: task.startDate || now,
        createdAt: now,
        assignee: task.assignee || null,
        checklist: [], // Deprecated
        subtasks: task.subtasks || [],
        estimatedTime: task.estimatedTime || null,
        actualTime: task.actualTime || null,
        relatedBook: task.relatedBook || null,
        relatedMarket: task.relatedMarket || null,
        attachments: task.attachments || [],
        dependencies: task.dependencies || [],
        order: present.tasks.filter(t => t.columnId === columnId).length,
        isArchived: false,
      };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: [...present.tasks, newTask],
        },
      };
    }

    case 'TASK_UPDATED': {
      const { taskId, updates } = action.payload as { taskId: string; updates: Partial<Task> };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            let updatedTask = { ...task, ...updates };
            // Sync status with subtasks if subtasks exist
            updatedTask = syncTaskStatusWithSubtasks(updatedTask);
            return updatedTask;
          }),
        },
      };
    }

    case 'TASK_DELETED': {
      const taskId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.filter(task => task.id !== taskId),
        },
      };
    }

    case 'TASK_MOVED': {
      const { taskId, targetColumnId, targetIndex } = action.payload as {
        taskId: string;
        targetColumnId: string;
        targetIndex: number;
      };
      
      const task = present.tasks.find(t => t.id === taskId);
      if (!task) return history;

      // Check if there's actually a change
      const isInSameColumn = task.columnId === targetColumnId;
      const currentIndex = present.tasks
        .filter(t => t.columnId === task.columnId)
        .sort((a, b) => a.order - b.order)
        .findIndex(t => t.id === taskId);
      
      if (isInSameColumn && currentIndex === targetIndex) {
        return history; // No change needed
      }

      const historyWithPast = pushToHistory(history);
      const otherTasks = present.tasks.filter(t => t.id !== taskId);
      const targetColumnTasks = otherTasks
        .filter(t => t.columnId === targetColumnId)
        .sort((a, b) => a.order - b.order);
      
      const updatedTask = { ...task, columnId: targetColumnId };
      
      const reorderedTargetTasks = [
        ...targetColumnTasks.slice(0, targetIndex),
        updatedTask,
        ...targetColumnTasks.slice(targetIndex),
      ].map((t, i) => ({ ...t, order: i }));

      const otherColumnTasks = otherTasks.filter(t => t.columnId !== targetColumnId);
      
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: [...otherColumnTasks, ...reorderedTargetTasks],
        },
      };
    }

    case 'TASK_ARCHIVED': {
      const taskId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task =>
            task.id === taskId ? { ...task, isArchived: true } : task
          ),
        },
      };
    }

    case 'TASK_UNARCHIVED': {
      const taskId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task =>
            task.id === taskId ? { ...task, isArchived: false } : task
          ),
        },
      };
    }

    case 'TASK_DUPLICATED': {
      const taskId = action.payload as string;
      const task = present.tasks.find(t => t.id === taskId);
      if (!task) return history;

      const now = new Date();
      // Duplicate subtasks with new IDs
      const duplicatedSubtasks = task.subtasks.map(s => ({
        ...s,
        id: generateId(),
        createdAt: now,
      }));
      
      const newTask: Task = {
        ...task,
        id: generateId(),
        title: `${task.title} (copia)`,
        createdAt: now,
        subtasks: duplicatedSubtasks,
        order: present.tasks.filter(t => t.columnId === task.columnId).length,
        isArchived: false,
      };
      
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: [...present.tasks, newTask],
        },
      };
    }

    // ========== SUBTASK ACTIONS ==========
    case 'SUBTASK_CREATED': {
      const { taskId, title, assignedTo, dueDate } = action.payload as {
        taskId: string;
        title: string;
        assignedTo?: string;
        dueDate?: Date;
      };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const newSubtask: Subtask = {
              id: generateId(),
              title,
              completed: false,
              assignedTo: assignedTo || null,
              dueDate: dueDate || null,
              createdAt: new Date(),
            };
            const updatedTask = {
              ...task,
              subtasks: [...task.subtasks, newSubtask],
            };
            return syncTaskStatusWithSubtasks(updatedTask);
          }),
        },
      };
    }

    case 'SUBTASK_UPDATED': {
      const { taskId, subtaskId, updates } = action.payload as {
        taskId: string;
        subtaskId: string;
        updates: Partial<Subtask>;
      };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updatedTask = {
              ...task,
              subtasks: task.subtasks.map(s =>
                s.id === subtaskId ? { ...s, ...updates } : s
              ),
            };
            return syncTaskStatusWithSubtasks(updatedTask);
          }),
        },
      };
    }

    case 'SUBTASK_TOGGLED': {
      const { taskId, subtaskId } = action.payload as { taskId: string; subtaskId: string };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updatedTask = {
              ...task,
              subtasks: task.subtasks.map(s =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
              ),
            };
            return syncTaskStatusWithSubtasks(updatedTask);
          }),
        },
      };
    }

    case 'SUBTASK_DELETED': {
      const { taskId, subtaskId } = action.payload as { taskId: string; subtaskId: string };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updatedTask = {
              ...task,
              subtasks: task.subtasks.filter(s => s.id !== subtaskId),
            };
            return syncTaskStatusWithSubtasks(updatedTask);
          }),
        },
      };
    }

    // ========== LEGACY CHECKLIST ACTIONS (deprecated, kept for compatibility) ==========
    case 'CHECKLIST_ITEM_ADDED': {
      const { taskId, text } = action.payload as { taskId: string; text: string };
      // Redirect to subtask creation
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const newSubtask: Subtask = {
              id: generateId(),
              title: text,
              completed: false,
              assignedTo: null,
              dueDate: null,
              createdAt: new Date(),
            };
            return {
              ...task,
              subtasks: [...task.subtasks, newSubtask],
            };
          }),
        },
      };
    }

    case 'CHECKLIST_ITEM_TOGGLED': {
      const { taskId, itemId } = action.payload as { taskId: string; itemId: string };
      // Redirect to subtask toggle
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updatedTask = {
              ...task,
              subtasks: task.subtasks.map(s =>
                s.id === itemId ? { ...s, completed: !s.completed } : s
              ),
            };
            return syncTaskStatusWithSubtasks(updatedTask);
          }),
        },
      };
    }

    case 'CHECKLIST_ITEM_DELETED': {
      const { taskId, itemId } = action.payload as { taskId: string; itemId: string };
      // Redirect to subtask deletion
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updatedTask = {
              ...task,
              subtasks: task.subtasks.filter(s => s.id !== itemId),
            };
            return syncTaskStatusWithSubtasks(updatedTask);
          }),
        },
      };
    }

    // ========== COLUMN ACTIONS ==========
    case 'COLUMN_CREATED': {
      const { title, subtitle } = action.payload as { title: string; subtitle?: string };
      const newColumn: Column = {
        id: generateId(),
        title,
        subtitle: subtitle || '',
        color: '#6B7280',
        icon: 'folder',
        wipLimit: null,
        order: present.columns.length,
        isHidden: false,
      };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          columns: [...present.columns, newColumn],
        },
      };
    }

    case 'COLUMN_UPDATED': {
      const { columnId, updates } = action.payload as { columnId: string; updates: Partial<Column> };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          columns: present.columns.map(col =>
            col.id === columnId ? { ...col, ...updates } : col
          ),
        },
      };
    }

    case 'COLUMN_DELETED': {
      const columnId = action.payload as string;
      
      // Prevent deletion of system columns
      const columnToDelete = present.columns.find(c => c.id === columnId);
      if (columnToDelete?.isSystemColumn) {
        return history; // Do nothing for system columns
      }
      
      const historyWithPast = pushToHistory(history);
      
      // Find first column that isn't being deleted
      const firstAvailableColumn = present.columns.find(c => c.id !== columnId);
      
      // Move tasks to first available column or delete them
      let updatedTasks = present.tasks;
      const tasksInColumn = present.tasks.filter(task => task.columnId === columnId);
      
      if (tasksInColumn.length > 0) {
        if (firstAvailableColumn) {
          updatedTasks = present.tasks.map(task =>
            task.columnId === columnId
              ? { ...task, columnId: firstAvailableColumn.id }
              : task
          );
        } else {
          updatedTasks = present.tasks.filter(task => task.columnId !== columnId);
        }
      }

      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: updatedTasks,
          columns: present.columns.filter(col => col.id !== columnId),
        },
      };
    }

    case 'COLUMN_MOVED': {
      const { columnId, targetIndex } = action.payload as { columnId: string; targetIndex: number };
      const column = present.columns.find(c => c.id === columnId);
      if (!column) return history;

      const historyWithPast = pushToHistory(history);
      const otherColumns = present.columns.filter(c => c.id !== columnId);
      const reordered = [
        ...otherColumns.slice(0, targetIndex),
        column,
        ...otherColumns.slice(targetIndex),
      ].map((c, i) => ({ ...c, order: i }));

      return {
        ...historyWithPast,
        present: {
          ...present,
          columns: reordered,
        },
      };
    }

    // ========== TAG ACTIONS ==========
    case 'TAG_CREATED': {
      const { name, color } = action.payload as { name: string; color: string };
      const newTag: Tag = { id: generateId(), name, color };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tags: [...present.tags, newTag],
        },
      };
    }

    case 'TAG_UPDATED': {
      const { tagId, updates } = action.payload as { tagId: string; updates: Partial<Tag> };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tags: present.tags.map(tag =>
            tag.id === tagId ? { ...tag, ...updates } : tag
          ),
          // Also update the tag in all tasks that use it
          tasks: present.tasks.map(task => ({
            ...task,
            tags: task.tags.map(tag =>
              tag.id === tagId ? { ...tag, ...updates } : tag
            ),
          })),
        },
      };
    }

    case 'TAG_DELETED': {
      const tagId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tags: present.tags.filter(tag => tag.id !== tagId),
          tasks: present.tasks.map(task => ({
            ...task,
            tags: task.tags.filter(tag => tag.id !== tagId),
          })),
        },
      };
    }

    // ========== NOTE ACTIONS ==========
    case 'NOTE_CREATED': {
      const noteData = action.payload as Partial<Note>;
      const now = new Date();
      const newNote: Note = {
        id: generateId(),
        title: noteData.title || 'Nueva nota',
        shortDescription: noteData.shortDescription || '',
        content: noteData.content || '',
        priority: noteData.priority || 'medium',
        createdAt: now,
        updatedAt: now,
      };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          notes: [...present.notes, newNote],
        },
      };
    }

    case 'NOTE_UPDATED': {
      const { noteId, updates } = action.payload as { noteId: string; updates: Partial<Note> };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          notes: present.notes.map(note =>
            note.id === noteId ? { ...note, ...updates, updatedAt: new Date() } : note
          ),
        },
      };
    }

    case 'NOTE_DELETED': {
      const noteId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          notes: present.notes.filter(note => note.id !== noteId),
        },
      };
    }

    // ========== FILTER ACTIONS ==========
    case 'FILTER_UPDATED': {
      const newFilter = action.payload as Filter;
      // Filter updates don't go to history (not undoable)
      return {
        ...history,
        present: {
          ...present,
          filter: newFilter,
        },
      };
    }

    // ========== DEPENDENCY ACTIONS (Phase 7) ==========
    case 'DEPENDENCY_ADDED': {
      const { taskId, dependsOnTaskId } = action.payload as { taskId: string; dependsOnTaskId: string };
      
      // Validate: prevent self-dependency
      if (taskId === dependsOnTaskId) return history;
      
      // Validate: prevent cycles
      if (wouldCreateCycle(taskId, dependsOnTaskId, present)) return history;
      
      const task = present.tasks.find(t => t.id === taskId);
      if (!task) return history;
      
      // Check if dependency already exists
      const existingDeps = task.taskDependencies || [];
      if (existingDeps.some(d => d.dependsOnTaskId === dependsOnTaskId)) return history;
      
      const newDependency: TaskDependency = {
        id: generateId(),
        type: 'FS',
        dependsOnTaskId,
        createdAt: new Date(),
      };
      
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(t =>
            t.id === taskId
              ? { ...t, taskDependencies: [...(t.taskDependencies || []), newDependency] }
              : t
          ),
        },
      };
    }

    case 'DEPENDENCY_REMOVED': {
      const { taskId, dependencyId } = action.payload as { taskId: string; dependencyId: string };
      const task = present.tasks.find(t => t.id === taskId);
      if (!task) return history;
      
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          tasks: present.tasks.map(t =>
            t.id === taskId
              ? { ...t, taskDependencies: (t.taskDependencies || []).filter(d => d.id !== dependencyId) }
              : t
          ),
        },
      };
    }

    // ========== AUTOMATION ACTIONS ==========
    case 'AUTOMATION_CREATED': {
      const automation = action.payload as Automation;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          automations: [...present.automations, automation],
        },
      };
    }

    case 'AUTOMATION_UPDATED': {
      const { automationId, updates } = action.payload as { automationId: string; updates: Partial<Automation> };
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          automations: present.automations.map(a =>
            a.id === automationId ? { ...a, ...updates, updatedAt: new Date() } : a
          ),
        },
      };
    }

    case 'AUTOMATION_DELETED': {
      const automationId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          automations: present.automations.filter(a => a.id !== automationId),
        },
      };
    }

    case 'AUTOMATION_TOGGLED': {
      const automationId = action.payload as string;
      const historyWithPast = pushToHistory(history);
      return {
        ...historyWithPast,
        present: {
          ...present,
          automations: present.automations.map(a =>
            a.id === automationId ? { ...a, enabled: !a.enabled, updatedAt: new Date() } : a
          ),
        },
      };
    }

    case 'AUTOMATION_LOGS_ADDED': {
      const logs = action.payload as AutomationExecution[];
      // Logs don't go to history (not undoable)
      const MAX_LOGS = 200;
      return {
        ...history,
        present: {
          ...present,
          automationLogs: [...logs, ...present.automationLogs].slice(0, MAX_LOGS),
        },
      };
    }

    case 'NOTIFICATION_ADDED': {
      const notification = action.payload as AutomationNotification;
      return {
        ...history,
        present: {
          ...present,
          notifications: [notification, ...present.notifications].slice(0, 50),
        },
      };
    }

    case 'NOTIFICATION_DISMISSED': {
      const notificationId = action.payload as string;
      return {
        ...history,
        present: {
          ...present,
          notifications: present.notifications.filter(n => n.id !== notificationId),
        },
      };
    }

    case 'NOTIFICATIONS_CLEARED': {
      return {
        ...history,
        present: {
          ...present,
          notifications: [],
        },
      };
    }

    default:
      return history;
  }
}

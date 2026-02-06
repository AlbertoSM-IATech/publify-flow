import { Task } from '@/types/kanban';
import { KanbanState } from './kanban.types';

/**
 * Calculate progress for a single task (0-1 scale)
 * - If task has subtasks: completed/total
 * - If task has no subtasks: 1 if completed status, 0 otherwise
 * - If task.status === 'completed', force 1 even with incomplete subtasks
 */
export function calculateTaskProgress(task: Task): number {
  // If task is explicitly marked completed, return 100%
  if (task.status === 'completed') {
    return 1;
  }

  const subtasks = task.subtasks || [];
  
  if (subtasks.length === 0) {
    // No subtasks: 0% unless completed status
    return 0;
  }

  const completedCount = subtasks.filter(s => s.completed).length;
  return completedCount / subtasks.length;
}

/**
 * Check if a task is considered "completed" for business logic
 * A task is completed if:
 * - task.status === 'completed' OR
 * - taskProgress === 1 (100% subtasks done)
 */
export function isTaskCompleted(task: Task): boolean {
  if (task.status === 'completed') return true;
  return calculateTaskProgress(task) === 1;
}

/**
 * Check if a task should be excluded from progress calculations
 * Archived tasks don't count toward progress
 */
export function isTaskExcludedFromProgress(task: Task): boolean {
  return task.isArchived === true || task.status === 'archived';
}

/**
 * Get all active (non-archived) tasks for a book
 */
export function getActiveTasksForBook(state: KanbanState, bookId: string): Task[] {
  return state.tasks.filter(
    task => task.relatedBook === bookId && !isTaskExcludedFromProgress(task)
  );
}

/**
 * Get all active (non-archived) tasks in a column for a book
 */
export function getActiveTasksForColumn(
  state: KanbanState,
  bookId: string,
  columnId: string
): Task[] {
  return state.tasks.filter(
    task =>
      task.relatedBook === bookId &&
      task.columnId === columnId &&
      !isTaskExcludedFromProgress(task)
  );
}

/**
 * Calculate overall book progress (0-100 scale)
 * Average of all active task progresses
 */
export function calculateBookProgress(state: KanbanState, bookId: string): number {
  const activeTasks = getActiveTasksForBook(state, bookId);
  
  if (activeTasks.length === 0) {
    return 0;
  }

  const totalProgress = activeTasks.reduce(
    (sum, task) => sum + calculateTaskProgress(task),
    0
  );

  return Math.round((totalProgress / activeTasks.length) * 100);
}

/**
 * Calculate progress for a specific column (0-100 scale)
 */
export function calculateColumnProgress(
  state: KanbanState,
  bookId: string,
  columnId: string
): number {
  const columnTasks = getActiveTasksForColumn(state, bookId, columnId);
  
  if (columnTasks.length === 0) {
    return 0;
  }

  const totalProgress = columnTasks.reduce(
    (sum, task) => sum + calculateTaskProgress(task),
    0
  );

  return Math.round((totalProgress / columnTasks.length) * 100);
}

/**
 * Check if a task can be archived
 * A task can be archived if it's completed (status or 100% progress)
 */
export function canArchiveTask(task: Task): boolean {
  return isTaskCompleted(task);
}

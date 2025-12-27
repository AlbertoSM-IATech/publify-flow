import { Task, Column, TaskDependency } from '@/types/kanban';
import { KanbanState } from './kanban.types';

/**
 * Check if a task is considered "completed"
 * A task is completed if it's in a column marked as isDoneColumn
 * or if its status is 'completed'
 */
export function isTaskCompleted(task: Task, state: KanbanState): boolean {
  const column = state.columns.find(c => c.id === task.columnId);
  if (column?.isDoneColumn) return true;
  return task.status === 'completed';
}

/**
 * Check if a task is blocked by incomplete dependencies
 * Returns info about which tasks are blocking it
 */
export function isTaskBlocked(
  task: Task,
  state: KanbanState
): { blocked: boolean; blockingTaskIds: string[]; blockingTasks: Task[] } {
  const dependencies = task.taskDependencies || [];
  
  if (dependencies.length === 0) {
    return { blocked: false, blockingTaskIds: [], blockingTasks: [] };
  }

  const blockingTasks: Task[] = [];
  const blockingTaskIds: string[] = [];

  for (const dep of dependencies) {
    const dependsOnTask = state.tasks.find(t => t.id === dep.dependsOnTaskId);
    if (!dependsOnTask) continue; // Dependency task deleted, skip
    
    if (!isTaskCompleted(dependsOnTask, state)) {
      blockingTaskIds.push(dep.dependsOnTaskId);
      blockingTasks.push(dependsOnTask);
    }
  }

  return {
    blocked: blockingTaskIds.length > 0,
    blockingTaskIds,
    blockingTasks,
  };
}

/**
 * Check if adding a dependency would create a cycle
 * Uses DFS to detect if dependsOnTaskId can reach taskId through the dependency graph
 */
export function wouldCreateCycle(
  taskId: string,
  dependsOnTaskId: string,
  state: KanbanState
): boolean {
  if (taskId === dependsOnTaskId) return true;

  const visited = new Set<string>();
  const stack = [dependsOnTaskId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    
    if (currentId === taskId) {
      return true; // Found a cycle back to original task
    }

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentTask = state.tasks.find(t => t.id === currentId);
    if (!currentTask) continue;

    const deps = currentTask.taskDependencies || [];
    for (const dep of deps) {
      if (!visited.has(dep.dependsOnTaskId)) {
        stack.push(dep.dependsOnTaskId);
      }
    }
  }

  return false;
}

/**
 * Get all dependency edges for visualization (e.g., Timeline arrows)
 * Returns edges from prerequisite -> dependent task
 */
export function getDependencyEdges(
  state: KanbanState
): { fromTaskId: string; toTaskId: string; fromTask: Task; toTask: Task }[] {
  const edges: { fromTaskId: string; toTaskId: string; fromTask: Task; toTask: Task }[] = [];

  for (const task of state.tasks) {
    const deps = task.taskDependencies || [];
    for (const dep of deps) {
      const fromTask = state.tasks.find(t => t.id === dep.dependsOnTaskId);
      if (fromTask) {
        edges.push({
          fromTaskId: dep.dependsOnTaskId,
          toTaskId: task.id,
          fromTask,
          toTask: task,
        });
      }
    }
  }

  return edges;
}

/**
 * Check if moving a task to a target column should be blocked
 * Only blocks moves to "done" columns if task has incomplete dependencies
 */
export function shouldBlockMoveToColumn(
  task: Task,
  targetColumnId: string,
  state: KanbanState
): { blocked: boolean; reason: string; blockingTasks: Task[] } {
  const targetColumn = state.columns.find(c => c.id === targetColumnId);
  
  // Only block moves to done columns
  if (!targetColumn?.isDoneColumn) {
    return { blocked: false, reason: '', blockingTasks: [] };
  }

  const blockInfo = isTaskBlocked(task, state);
  
  if (blockInfo.blocked) {
    const taskNames = blockInfo.blockingTasks.map(t => t.title).join(', ');
    return {
      blocked: true,
      reason: `Bloqueada: depende de "${taskNames}"`,
      blockingTasks: blockInfo.blockingTasks,
    };
  }

  return { blocked: false, reason: '', blockingTasks: [] };
}

/**
 * Migrate legacy string[] dependencies to TaskDependency[]
 */
export function migrateLegacyDependencies(task: Task): Task {
  // Already has new format or no legacy dependencies
  if (task.taskDependencies && task.taskDependencies.length > 0) {
    return task;
  }

  // Check for legacy format
  if (!task.dependencies || task.dependencies.length === 0) {
    return { ...task, taskDependencies: [] };
  }

  // Migrate legacy string[] to TaskDependency[]
  const migratedDeps: TaskDependency[] = task.dependencies.map(depId => ({
    id: Math.random().toString(36).substr(2, 9),
    type: 'FS' as const,
    dependsOnTaskId: depId,
    createdAt: new Date(),
  }));

  return {
    ...task,
    taskDependencies: migratedDeps,
    dependencies: [], // Clear legacy
  };
}

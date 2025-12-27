import { Task, Tag, Priority } from '@/types/kanban';
import {
  Automation,
  AutomationAction,
  AutomationCondition,
  AutomationEvent,
  AutomationExecution,
  AutomationNotification,
  AutomationTriggerType,
} from '@/types/automation';
import { KanbanState } from './kanban.types';
import { calculateTaskProgress } from './kanban.reducer';

const generateId = () => Math.random().toString(36).substr(2, 9);
const MAX_ITERATIONS = 5;
const MAX_LOGS = 200;

// ========== CONDITION EVALUATION ==========

function getDaysUntilDue(task: Task): number | null {
  if (!task.dueDate) return null;
  const now = new Date();
  const due = new Date(task.dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function evaluateCondition(
  task: Task,
  condition: AutomationCondition,
  state: KanbanState
): boolean {
  switch (condition.type) {
    case 'PRIORITY_IS':
      return task.priority === condition.value;

    case 'COLUMN_IS':
      return task.columnId === condition.columnId;

    case 'HAS_TAG':
      return task.tags.some(t => t.id === condition.tagId);

    case 'MISSING_TAG':
      return !task.tags.some(t => t.id === condition.tagId);

    case 'DUE_IN_DAYS_LESS_THAN': {
      const days = getDaysUntilDue(task);
      if (days === null) return false;
      return days < condition.value && days >= 0;
    }

    case 'PROGRESS_EQUALS': {
      const progress = calculateTaskProgress(task);
      return progress === condition.value;
    }

    case 'SUBTASKS_ALL_COMPLETED':
      if (!task.subtasks || task.subtasks.length === 0) return false;
      return task.subtasks.every(s => s.completed);

    case 'SUBTASKS_INCOMPLETE':
      if (!task.subtasks || task.subtasks.length === 0) return false;
      return task.subtasks.some(s => !s.completed);

    default:
      return false;
  }
}

export function evaluateConditions(
  task: Task,
  conditions: AutomationCondition[],
  state: KanbanState
): boolean {
  // Empty conditions = always true
  if (conditions.length === 0) return true;
  // AND logic: all conditions must be true
  return conditions.every(condition => evaluateCondition(task, condition, state));
}

// ========== SCOPE CHECKING ==========

function isInScope(task: Task, automation: Automation): boolean {
  if (!automation.scope) return true;

  const { columnIds, tagIds } = automation.scope;

  // Check column scope
  if (columnIds && columnIds.length > 0) {
    if (!columnIds.includes(task.columnId)) return false;
  }

  // Check tag scope
  if (tagIds && tagIds.length > 0) {
    const taskTagIds = task.tags.map(t => t.id);
    if (!tagIds.some(tid => taskTagIds.includes(tid))) return false;
  }

  return true;
}

// ========== ACTION APPLICATION ==========

export interface ActionResult {
  updatedTask: Task;
  notifications: AutomationNotification[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function applyAction(
  task: Task,
  action: AutomationAction,
  state: KanbanState,
  automationName: string
): ActionResult {
  let updatedTask = { ...task };
  const notifications: AutomationNotification[] = [];

  switch (action.type) {
    case 'MOVE_TO_COLUMN':
      updatedTask.columnId = action.columnId;
      break;

    case 'SET_PRIORITY':
      updatedTask.priority = action.value;
      break;

    case 'ADD_TAG': {
      const tagToAdd = state.tags.find(t => t.id === action.tagId);
      if (tagToAdd && !updatedTask.tags.some(t => t.id === action.tagId)) {
        updatedTask.tags = [...updatedTask.tags, tagToAdd];
      }
      break;
    }

    case 'REMOVE_TAG':
      updatedTask.tags = updatedTask.tags.filter(t => t.id !== action.tagId);
      break;

    case 'ARCHIVE_TASK':
      updatedTask.isArchived = true;
      updatedTask.status = 'archived';
      break;

    case 'UNARCHIVE_TASK':
      updatedTask.isArchived = false;
      if (updatedTask.status === 'archived') {
        updatedTask.status = 'not_started';
      }
      break;

    case 'SET_DUE_DATE_IN_DAYS':
      updatedTask.dueDate = addDays(new Date(), action.value);
      break;

    case 'NOTIFY_IN_APP':
      notifications.push({
        id: generateId(),
        message: action.message,
        automationName,
        taskTitle: task.title,
        timestamp: new Date(),
      });
      break;
  }

  return { updatedTask, notifications };
}

export function applyActions(
  task: Task,
  actions: AutomationAction[],
  state: KanbanState,
  automationName: string
): ActionResult {
  let currentTask = task;
  const allNotifications: AutomationNotification[] = [];

  for (const action of actions) {
    const result = applyAction(currentTask, action, state, automationName);
    currentTask = result.updatedTask;
    allNotifications.push(...result.notifications);
  }

  return { updatedTask: currentTask, notifications: allNotifications };
}

// ========== MAIN AUTOMATION ENGINE ==========

function taskFingerprint(task: Task): string {
  return JSON.stringify({
    columnId: task.columnId,
    priority: task.priority,
    tagIds: task.tags.map(t => t.id).sort(),
    isArchived: task.isArchived,
    status: task.status,
    dueDate: task.dueDate?.toISOString(),
    subtasksCompleted: task.subtasks?.filter(s => s.completed).length,
  });
}

export interface AutomationRunResult {
  nextState: KanbanState;
  executionLogs: AutomationExecution[];
  notifications: AutomationNotification[];
}

export function runAutomations(
  event: AutomationEvent,
  state: KanbanState
): AutomationRunResult {
  const executionLogs: AutomationExecution[] = [];
  const allNotifications: AutomationNotification[] = [];
  let currentState = state;
  let iterations = 0;
  let hasChanges = true;

  // Prevent infinite loops
  const processedFingerprints = new Set<string>();

  while (hasChanges && iterations < MAX_ITERATIONS) {
    hasChanges = false;
    iterations++;

    const task = currentState.tasks.find(t => t.id === event.taskId);
    if (!task) break;

    const taskFp = taskFingerprint(task);
    if (processedFingerprints.has(taskFp)) break;
    processedFingerprints.add(taskFp);

    // Get enabled automations with matching trigger
    const matchingAutomations = currentState.automations.filter(
      a => a.enabled && a.trigger.type === event.type
    );

    for (const automation of matchingAutomations) {
      const currentTask = currentState.tasks.find(t => t.id === event.taskId);
      if (!currentTask) continue;

      // Check if disabled
      if (!automation.enabled) {
        executionLogs.push({
          id: generateId(),
          automationId: automation.id,
          automationName: automation.name,
          taskId: event.taskId,
          taskTitle: currentTask.title,
          timestamp: new Date(),
          triggerType: event.type,
          actionsApplied: [],
          result: 'skipped_disabled',
        });
        continue;
      }

      // Check scope
      if (!isInScope(currentTask, automation)) {
        executionLogs.push({
          id: generateId(),
          automationId: automation.id,
          automationName: automation.name,
          taskId: event.taskId,
          taskTitle: currentTask.title,
          timestamp: new Date(),
          triggerType: event.type,
          actionsApplied: [],
          result: 'skipped_scope',
        });
        continue;
      }

      // Check conditions
      if (!evaluateConditions(currentTask, automation.conditions, currentState)) {
        executionLogs.push({
          id: generateId(),
          automationId: automation.id,
          automationName: automation.name,
          taskId: event.taskId,
          taskTitle: currentTask.title,
          timestamp: new Date(),
          triggerType: event.type,
          actionsApplied: [],
          result: 'skipped_conditions',
        });
        continue;
      }

      // Apply actions
      const beforeFp = taskFingerprint(currentTask);
      const { updatedTask, notifications } = applyActions(
        currentTask,
        automation.actions,
        currentState,
        automation.name
      );
      const afterFp = taskFingerprint(updatedTask);

      if (beforeFp === afterFp) {
        executionLogs.push({
          id: generateId(),
          automationId: automation.id,
          automationName: automation.name,
          taskId: event.taskId,
          taskTitle: currentTask.title,
          timestamp: new Date(),
          triggerType: event.type,
          actionsApplied: automation.actions,
          result: 'skipped_no_change',
        });
        continue;
      }

      // Update state
      currentState = {
        ...currentState,
        tasks: currentState.tasks.map(t =>
          t.id === event.taskId ? updatedTask : t
        ),
      };

      allNotifications.push(...notifications);
      hasChanges = true;

      executionLogs.push({
        id: generateId(),
        automationId: automation.id,
        automationName: automation.name,
        taskId: event.taskId,
        taskTitle: currentTask.title,
        timestamp: new Date(),
        triggerType: event.type,
        actionsApplied: automation.actions,
        result: 'applied',
      });
    }
  }

  return {
    nextState: currentState,
    executionLogs,
    notifications: allNotifications,
  };
}

// ========== TRIGGER DETECTION ==========

export function detectTriggerType(
  actionType: string,
  previousTask: Task | undefined,
  currentTask: Task | undefined
): AutomationTriggerType | null {
  switch (actionType) {
    case 'TASK_CREATED':
      return 'TASK_CREATED';

    case 'TASK_MOVED':
      return 'TASK_MOVED';

    case 'SUBTASK_TOGGLED':
    case 'SUBTASK_CREATED':
    case 'SUBTASK_DELETED':
      return 'SUBTASK_TOGGLED';

    case 'CHECKLIST_ITEM_TOGGLED':
    case 'CHECKLIST_ITEM_ADDED':
    case 'CHECKLIST_ITEM_DELETED':
      return 'PROGRESS_CHANGED';

    case 'TASK_UPDATED':
      if (!previousTask || !currentTask) return 'TASK_UPDATED';

      // Detect specific changes
      if (previousTask.priority !== currentTask.priority) {
        return 'PRIORITY_CHANGED';
      }
      if (previousTask.dueDate?.getTime() !== currentTask.dueDate?.getTime()) {
        return 'DUE_DATE_CHANGED';
      }
      if (previousTask.columnId !== currentTask.columnId) {
        return 'TASK_MOVED';
      }
      const prevTagIds = previousTask.tags.map(t => t.id).sort().join(',');
      const currTagIds = currentTask.tags.map(t => t.id).sort().join(',');
      if (prevTagIds !== currTagIds) {
        return 'TAGS_CHANGED';
      }
      const prevProgress = calculateTaskProgress(previousTask);
      const currProgress = calculateTaskProgress(currentTask);
      if (prevProgress !== currProgress) {
        return 'PROGRESS_CHANGED';
      }
      return 'TASK_UPDATED';

    default:
      return null;
  }
}

// ========== LOG MANAGEMENT ==========

export function addExecutionLogs(
  existingLogs: AutomationExecution[],
  newLogs: AutomationExecution[]
): AutomationExecution[] {
  const combined = [...newLogs, ...existingLogs];
  return combined.slice(0, MAX_LOGS);
}

// ========== TEST AUTOMATION ==========

export interface TestAutomationResult {
  wouldApply: boolean;
  reason: string;
  actionsToApply: AutomationAction[];
}

export function testAutomation(
  automation: Automation,
  task: Task,
  state: KanbanState
): TestAutomationResult {
  if (!automation.enabled) {
    return {
      wouldApply: false,
      reason: 'La automatización está desactivada',
      actionsToApply: [],
    };
  }

  if (!isInScope(task, automation)) {
    return {
      wouldApply: false,
      reason: 'La tarea no está en el alcance de la automatización',
      actionsToApply: [],
    };
  }

  if (!evaluateConditions(task, automation.conditions, state)) {
    const failedConditions = automation.conditions
      .filter(c => !evaluateCondition(task, c, state))
      .map(c => c.type);
    return {
      wouldApply: false,
      reason: `Condiciones no cumplidas: ${failedConditions.join(', ')}`,
      actionsToApply: [],
    };
  }

  return {
    wouldApply: true,
    reason: 'Todas las condiciones se cumplen',
    actionsToApply: automation.actions,
  };
}

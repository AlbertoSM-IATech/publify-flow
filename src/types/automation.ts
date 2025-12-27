import { Priority } from './kanban';

// ========== TRIGGERS ==========
export type AutomationTriggerType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_MOVED'
  | 'SUBTASK_TOGGLED'
  | 'DUE_DATE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'TAGS_CHANGED'
  | 'PROGRESS_CHANGED';

export interface AutomationTrigger {
  type: AutomationTriggerType;
}

// ========== CONDITIONS ==========
export type AutomationConditionType =
  | 'PRIORITY_IS'
  | 'COLUMN_IS'
  | 'HAS_TAG'
  | 'MISSING_TAG'
  | 'DUE_IN_DAYS_LESS_THAN'
  | 'PROGRESS_EQUALS'
  | 'SUBTASKS_ALL_COMPLETED'
  | 'SUBTASKS_INCOMPLETE';

export type AutomationCondition =
  | { type: 'PRIORITY_IS'; value: Priority }
  | { type: 'COLUMN_IS'; columnId: string }
  | { type: 'HAS_TAG'; tagId: string }
  | { type: 'MISSING_TAG'; tagId: string }
  | { type: 'DUE_IN_DAYS_LESS_THAN'; value: number }
  | { type: 'PROGRESS_EQUALS'; value: 0 | 25 | 50 | 75 | 100 }
  | { type: 'SUBTASKS_ALL_COMPLETED' }
  | { type: 'SUBTASKS_INCOMPLETE' };

// ========== ACTIONS ==========
export type AutomationActionType =
  | 'MOVE_TO_COLUMN'
  | 'SET_PRIORITY'
  | 'ADD_TAG'
  | 'REMOVE_TAG'
  | 'ARCHIVE_TASK'
  | 'UNARCHIVE_TASK'
  | 'SET_DUE_DATE_IN_DAYS'
  | 'NOTIFY_IN_APP';

export type AutomationAction =
  | { type: 'MOVE_TO_COLUMN'; columnId: string }
  | { type: 'SET_PRIORITY'; value: Priority }
  | { type: 'ADD_TAG'; tagId: string }
  | { type: 'REMOVE_TAG'; tagId: string }
  | { type: 'ARCHIVE_TASK' }
  | { type: 'UNARCHIVE_TASK' }
  | { type: 'SET_DUE_DATE_IN_DAYS'; value: number }
  | { type: 'NOTIFY_IN_APP'; message: string };

// ========== SCOPE ==========
export interface AutomationScope {
  columnIds?: string[];
  tagIds?: string[];
}

// ========== MAIN AUTOMATION TYPE ==========
export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  scope?: AutomationScope;
  createdAt: Date;
  updatedAt: Date;
}

// ========== EXECUTION LOG ==========
export type AutomationExecutionResult =
  | 'applied'
  | 'skipped_conditions'
  | 'skipped_disabled'
  | 'skipped_no_change'
  | 'skipped_scope'
  | 'error';

export interface AutomationExecution {
  id: string;
  automationId: string;
  automationName: string;
  taskId: string;
  taskTitle: string;
  timestamp: Date;
  triggerType: AutomationTriggerType;
  actionsApplied: AutomationAction[];
  result: AutomationExecutionResult;
  errorMessage?: string;
}

// ========== AUTOMATION EVENT ==========
export interface AutomationEvent {
  type: AutomationTriggerType;
  taskId: string;
  previousTask?: {
    columnId?: string;
    priority?: Priority;
    tagIds?: string[];
    progress?: number;
    dueDate?: Date | null;
  };
}

// ========== NOTIFICATIONS ==========
export interface AutomationNotification {
  id: string;
  message: string;
  automationName: string;
  taskTitle: string;
  timestamp: Date;
}

// Helper type for trigger labels
export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  TASK_CREATED: 'Tarea creada',
  TASK_UPDATED: 'Tarea actualizada',
  TASK_MOVED: 'Tarea movida',
  SUBTASK_TOGGLED: 'Subtarea marcada/desmarcada',
  DUE_DATE_CHANGED: 'Fecha límite cambiada',
  PRIORITY_CHANGED: 'Prioridad cambiada',
  TAGS_CHANGED: 'Etiquetas cambiadas',
  PROGRESS_CHANGED: 'Progreso cambiado',
};

export const CONDITION_LABELS: Record<AutomationConditionType, string> = {
  PRIORITY_IS: 'Prioridad es',
  COLUMN_IS: 'Columna es',
  HAS_TAG: 'Tiene etiqueta',
  MISSING_TAG: 'No tiene etiqueta',
  DUE_IN_DAYS_LESS_THAN: 'Fecha límite en menos de X días',
  PROGRESS_EQUALS: 'Progreso es',
  SUBTASKS_ALL_COMPLETED: 'Todas las subtareas completadas',
  SUBTASKS_INCOMPLETE: 'Tiene subtareas incompletas',
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  MOVE_TO_COLUMN: 'Mover a columna',
  SET_PRIORITY: 'Cambiar prioridad',
  ADD_TAG: 'Añadir etiqueta',
  REMOVE_TAG: 'Quitar etiqueta',
  ARCHIVE_TASK: 'Archivar tarea',
  UNARCHIVE_TASK: 'Desarchivar tarea',
  SET_DUE_DATE_IN_DAYS: 'Establecer fecha límite',
  NOTIFY_IN_APP: 'Notificar en app',
};

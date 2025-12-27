import { Task, Column, Tag, Note, Filter, Automation, AutomationExecution, AutomationNotification, TaskDependency } from '@/types/kanban';

export interface KanbanState {
  tasks: Task[];
  columns: Column[];
  tags: Tag[];
  notes: Note[];
  filter: Filter;
  automations: Automation[];
  automationLogs: AutomationExecution[];
  notifications: AutomationNotification[];
}

export type KanbanActionType =
  | 'INIT_STATE'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_MOVED'
  | 'TASK_ARCHIVED'
  | 'TASK_UNARCHIVED'
  | 'TASK_DUPLICATED'
  | 'COLUMN_CREATED'
  | 'COLUMN_UPDATED'
  | 'COLUMN_DELETED'
  | 'COLUMN_MOVED'
  | 'TAG_CREATED'
  | 'TAG_UPDATED'
  | 'TAG_DELETED'
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  | 'FILTER_UPDATED'
  // Subtask actions
  | 'SUBTASK_CREATED'
  | 'SUBTASK_UPDATED'
  | 'SUBTASK_TOGGLED'
  | 'SUBTASK_DELETED'
  // Dependency actions (Phase 7)
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED'
  // Automation actions
  | 'AUTOMATION_CREATED'
  | 'AUTOMATION_UPDATED'
  | 'AUTOMATION_DELETED'
  | 'AUTOMATION_TOGGLED'
  | 'AUTOMATION_LOGS_ADDED'
  | 'NOTIFICATION_ADDED'
  | 'NOTIFICATION_DISMISSED'
  | 'NOTIFICATIONS_CLEARED'
  // Legacy checklist (deprecated, kept for compatibility)
  | 'CHECKLIST_ITEM_ADDED'
  | 'CHECKLIST_ITEM_TOGGLED'
  | 'CHECKLIST_ITEM_DELETED'
  | 'UNDO'
  | 'REDO';

export interface KanbanAction {
  type: KanbanActionType;
  payload?: unknown;
}

export interface HistoryState {
  past: KanbanState[];
  present: KanbanState;
  future: KanbanState[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

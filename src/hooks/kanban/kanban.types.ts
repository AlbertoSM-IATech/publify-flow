import { Task, Column, Tag, Note, Automation, Filter } from '@/types/kanban';

export interface KanbanState {
  tasks: Task[];
  columns: Column[];
  tags: Tag[];
  notes: Note[];
  filter: Filter;
  automations: Automation[];
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

import { KanbanState } from './kanban.types';
import { Task, Column, Tag, Note, Filter, Automation, Subtask, ChecklistItem } from '@/types/kanban';

const STORAGE_KEY = 'publify.kanban.v2'; // Bumped version for subtask migration
const STORAGE_VERSION = 2;

interface StoragePayload {
  version: number;
  data: SerializedKanbanState;
  savedAt: string;
}

// Serialized subtask with ISO date strings
interface SerializedSubtask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdAt: string;
}

// Serialized versions with ISO date strings instead of Date objects
interface SerializedTask extends Omit<Task, 'createdAt' | 'dueDate' | 'startDate' | 'subtasks'> {
  createdAt: string;
  dueDate: string | null;
  startDate: string | null;
  subtasks: SerializedSubtask[];
}

interface SerializedNote extends Omit<Note, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface SerializedFilter extends Omit<Filter, 'dueDate'> {
  dueDate: { from: string | null; to: string | null };
}

interface SerializedKanbanState {
  tasks: SerializedTask[];
  columns: Column[];
  tags: Tag[];
  notes: SerializedNote[];
  filter: SerializedFilter;
  automations: Automation[];
}

// Serialize Date objects to ISO strings
function serializeDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date instanceof Date ? date.toISOString() : date;
}

// Deserialize ISO strings back to Date objects
function deserializeDate(isoString: string | null | undefined): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Migrate checklist items to subtasks
function migrateChecklistToSubtasks(checklist: ChecklistItem[]): Subtask[] {
  if (!checklist || checklist.length === 0) return [];
  
  return checklist.map(item => ({
    id: item.id || generateId(),
    title: item.text,
    completed: item.completed,
    assignedTo: null,
    dueDate: null,
    createdAt: new Date(),
  }));
}

// Serialize subtasks for storage
function serializeSubtasks(subtasks: Subtask[]): SerializedSubtask[] {
  if (!subtasks) return [];
  return subtasks.map(subtask => ({
    ...subtask,
    dueDate: serializeDate(subtask.dueDate),
    createdAt: serializeDate(subtask.createdAt) as string,
  }));
}

// Deserialize subtasks from storage
function deserializeSubtasks(serialized: SerializedSubtask[]): Subtask[] {
  if (!serialized) return [];
  return serialized.map(subtask => ({
    ...subtask,
    dueDate: deserializeDate(subtask.dueDate),
    createdAt: deserializeDate(subtask.createdAt) as Date,
  }));
}

// Serialize the entire state for storage
function serializeState(state: KanbanState): SerializedKanbanState {
  return {
    tasks: state.tasks.map(task => ({
      ...task,
      createdAt: serializeDate(task.createdAt) as string,
      dueDate: serializeDate(task.dueDate),
      startDate: serializeDate(task.startDate),
      subtasks: serializeSubtasks(task.subtasks || []),
    })),
    columns: state.columns,
    tags: state.tags,
    notes: state.notes.map(note => ({
      ...note,
      createdAt: serializeDate(note.createdAt) as string,
      updatedAt: serializeDate(note.updatedAt) as string,
    })),
    filter: {
      ...state.filter,
      dueDate: {
        from: serializeDate(state.filter.dueDate.from),
        to: serializeDate(state.filter.dueDate.to),
      },
    },
    automations: state.automations,
  };
}

// Deserialize the state from storage with migration support
function deserializeState(serialized: SerializedKanbanState): KanbanState {
  return {
    tasks: serialized.tasks.map(task => {
      // Migrate checklist to subtasks if needed
      let subtasks = deserializeSubtasks(task.subtasks || []);
      
      // Migration: if task has checklist but no subtasks, convert
      if (task.checklist && task.checklist.length > 0 && subtasks.length === 0) {
        subtasks = migrateChecklistToSubtasks(task.checklist);
      }
      
      return {
        ...task,
        createdAt: deserializeDate(task.createdAt) as Date,
        dueDate: deserializeDate(task.dueDate),
        startDate: deserializeDate(task.startDate),
        subtasks,
        checklist: task.checklist || [], // Keep for backwards compatibility
      };
    }),
    columns: serialized.columns,
    tags: serialized.tags,
    notes: serialized.notes.map(note => ({
      ...note,
      createdAt: deserializeDate(note.createdAt) as Date,
      updatedAt: deserializeDate(note.updatedAt) as Date,
    })),
    filter: {
      ...serialized.filter,
      dueDate: {
        from: deserializeDate(serialized.filter.dueDate.from),
        to: deserializeDate(serialized.filter.dueDate.to),
      },
    },
    automations: serialized.automations,
  };
}

// Save state to localStorage
export function saveKanbanState(state: KanbanState): void {
  try {
    const payload: StoragePayload = {
      version: STORAGE_VERSION,
      data: serializeState(state),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('[Kanban Storage] Error saving state:', error);
  }
}

// Load state from localStorage with v1 migration support
export function loadKanbanState(): KanbanState | null {
  try {
    // Try v2 first
    let stored = localStorage.getItem(STORAGE_KEY);
    
    // If no v2, try to migrate from v1
    if (!stored) {
      const v1Stored = localStorage.getItem('publify.kanban.v1');
      if (v1Stored) {
        console.log('[Kanban Storage] Migrating from v1 to v2...');
        const v1Payload = JSON.parse(v1Stored);
        // Deserialize with migration
        const migratedState = deserializeState(v1Payload.data);
        // Save as v2
        saveKanbanState(migratedState);
        // Remove old v1
        localStorage.removeItem('publify.kanban.v1');
        return migratedState;
      }
      return null;
    }

    const payload: StoragePayload = JSON.parse(stored);
    
    // Version check
    if (payload.version !== STORAGE_VERSION) {
      console.warn('[Kanban Storage] Version mismatch, attempting migration');
      // Try to deserialize with migration
      return deserializeState(payload.data);
    }

    return deserializeState(payload.data);
  } catch (error) {
    console.error('[Kanban Storage] Error loading state:', error);
    return null;
  }
}

// Clear stored state
export function clearKanbanState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('publify.kanban.v1');
  } catch (error) {
    console.error('[Kanban Storage] Error clearing state:', error);
  }
}

// Check if storage has data
export function hasStoredState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null || 
           localStorage.getItem('publify.kanban.v1') !== null;
  } catch {
    return false;
  }
}

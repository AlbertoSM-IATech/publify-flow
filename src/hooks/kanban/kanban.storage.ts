import { KanbanState } from './kanban.types';
import { Task, Column, Tag, Note, Filter, Automation } from '@/types/kanban';

const STORAGE_KEY = 'publify.kanban.v1';
const STORAGE_VERSION = 1;

interface StoragePayload {
  version: number;
  data: SerializedKanbanState;
  savedAt: string;
}

// Serialized versions with ISO date strings instead of Date objects
interface SerializedTask extends Omit<Task, 'createdAt' | 'dueDate' | 'startDate'> {
  createdAt: string;
  dueDate: string | null;
  startDate: string | null;
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
function serializeDate(date: Date | null): string | null {
  if (!date) return null;
  return date instanceof Date ? date.toISOString() : date;
}

// Deserialize ISO strings back to Date objects
function deserializeDate(isoString: string | null): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

// Serialize the entire state for storage
function serializeState(state: KanbanState): SerializedKanbanState {
  return {
    tasks: state.tasks.map(task => ({
      ...task,
      createdAt: serializeDate(task.createdAt) as string,
      dueDate: serializeDate(task.dueDate),
      startDate: serializeDate(task.startDate),
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

// Deserialize the state from storage
function deserializeState(serialized: SerializedKanbanState): KanbanState {
  return {
    tasks: serialized.tasks.map(task => ({
      ...task,
      createdAt: deserializeDate(task.createdAt) as Date,
      dueDate: deserializeDate(task.dueDate),
      startDate: deserializeDate(task.startDate),
    })),
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

// Load state from localStorage
export function loadKanbanState(): KanbanState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const payload: StoragePayload = JSON.parse(stored);
    
    // Version check - if version doesn't match, return null to use seed data
    if (payload.version !== STORAGE_VERSION) {
      console.warn('[Kanban Storage] Version mismatch, using seed data');
      return null;
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
  } catch (error) {
    console.error('[Kanban Storage] Error clearing state:', error);
  }
}

// Check if storage has data
export function hasStoredState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

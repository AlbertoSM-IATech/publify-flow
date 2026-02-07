import { KanbanState } from './kanban.types';
import { Task, Column, Tag, Note, Filter, Automation, Subtask, ChecklistItem, TaskDependency } from '@/types/kanban';

const STORAGE_VERSION = 6; // Bumped for flexible columns + Investigación template

// Build storage key for a specific book
function getStorageKey(bookId: string): string {
  return `publify.book.${bookId}.kanban.v${STORAGE_VERSION}`;
}

// Legacy storage keys (for migration)
const LEGACY_KEYS = [
  'publify.kanban.v4',
  'publify.kanban.v3',
  'publify.kanban.v2',
  'publify.kanban.v1',
];

// Previous per-book key pattern
function getLegacyBookKey(bookId: string, version: number): string {
  return `publify.book.${bookId}.kanban.v${version}`;
}

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

// Serialized dependency with ISO date string
interface SerializedDependency {
  id: string;
  type: 'FS';
  dependsOnTaskId: string;
  createdAt: string;
}

// Serialized versions with ISO date strings instead of Date objects
interface SerializedTask extends Omit<Task, 'createdAt' | 'dueDate' | 'startDate' | 'subtasks' | 'taskDependencies'> {
  createdAt: string;
  dueDate: string | null;
  startDate: string | null;
  subtasks: SerializedSubtask[];
  taskDependencies?: SerializedDependency[];
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

// Migrate legacy string[] dependencies to TaskDependency[]
function migrateLegacyDependencies(dependencies: string[]): TaskDependency[] {
  if (!dependencies || dependencies.length === 0) return [];
  
  return dependencies.map(depId => ({
    id: generateId(),
    type: 'FS' as const,
    dependsOnTaskId: depId,
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

// Serialize dependencies for storage
function serializeDependencies(deps: TaskDependency[] | undefined): SerializedDependency[] {
  if (!deps) return [];
  return deps.map(dep => ({
    ...dep,
    createdAt: serializeDate(dep.createdAt) as string,
  }));
}

// Deserialize dependencies from storage
function deserializeDependencies(serialized: SerializedDependency[] | undefined): TaskDependency[] {
  if (!serialized) return [];
  return serialized.map(dep => ({
    ...dep,
    createdAt: deserializeDate(dep.createdAt) as Date,
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
      taskDependencies: serializeDependencies(task.taskDependencies),
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

/**
 * Soft migration for columns:
 * - Ensure all columns have subtitle (add empty string if missing)
 * - Remove legacy system columns (completed, archived) ONLY if they are system columns
 * - Do NOT force any specific set of columns — respect user customizations
 */
function migrateColumns(columns: Column[]): Column[] {
  // Remove legacy system columns that were auto-generated
  const legacySystemIds = ['completed', 'archived'];
  let result = columns.filter(col => !legacySystemIds.includes(col.id));

  // Ensure all columns have subtitle
  result = result.map(col => ({
    ...col,
    subtitle: col.subtitle || '',
  }));

  // Ensure correct order field
  result = result.map((col, i) => ({
    ...col,
    order: col.order ?? i,
  }));

  // Sort by order
  result.sort((a, b) => a.order - b.order);

  return result;
}

/**
 * Map legacy column IDs to new template IDs for task migration.
 * Only maps known legacy IDs — unknown IDs are left as-is.
 */
const LEGACY_COLUMN_MAP: Record<string, string> = {
  // Old "definition" phase → new "research"
  definition: 'research',
  // Other legacy mappings
  research: 'research',
  planning: 'research',
  content: 'production',
  editing: 'review',
  design: 'preparation',
  validation: 'review',
  'post-launch': 'optimization',
  marketing: 'optimization',
  maintenance: 'optimization',
};

// Deserialize the state from storage with migration support
function deserializeState(serialized: SerializedKanbanState, bookId: string): KanbanState {
  const now = new Date();
  
  // Migrate columns (soft — respect user customizations)
  const migratedColumns = migrateColumns(serialized.columns);

  // Build set of valid column IDs from migrated columns
  const validColumnIds = new Set(migratedColumns.map(c => c.id));

  // Migrate old automations to new format
  const migratedAutomations = (serialized.automations || []).map(a => {
    if ('conditions' in a && 'actions' in a) {
      return {
        ...a,
        createdAt: a.createdAt ? new Date(a.createdAt as unknown as string) : now,
        updatedAt: a.updatedAt ? new Date(a.updatedAt as unknown as string) : now,
      };
    }
    return null;
  }).filter(Boolean) as Automation[];

  return {
    tasks: serialized.tasks.map(task => {
      // Migrate checklist to subtasks if needed
      let subtasks = deserializeSubtasks(task.subtasks || []);
      
      if (task.checklist && task.checklist.length > 0 && subtasks.length === 0) {
        subtasks = migrateChecklistToSubtasks(task.checklist);
      }

      // Migrate legacy string[] dependencies to TaskDependency[]
      let taskDependencies = deserializeDependencies((task as any).taskDependencies);
      if (task.dependencies && task.dependencies.length > 0 && taskDependencies.length === 0) {
        taskDependencies = migrateLegacyDependencies(task.dependencies);
      }

      // Migrate columnId from legacy columns
      let columnId = task.columnId;
      if (LEGACY_COLUMN_MAP[columnId] && !validColumnIds.has(columnId)) {
        columnId = LEGACY_COLUMN_MAP[columnId];
      }

      // If columnId still doesn't exist in columns, assign to first column
      if (!validColumnIds.has(columnId) && migratedColumns.length > 0) {
        columnId = migratedColumns[0].id;
      }
      
      return {
        ...task,
        columnId,
        createdAt: deserializeDate(task.createdAt) as Date,
        dueDate: deserializeDate(task.dueDate),
        startDate: deserializeDate(task.startDate),
        subtasks,
        taskDependencies,
        checklist: task.checklist || [],
        relatedBook: task.relatedBook || bookId,
      };
    }),
    columns: migratedColumns,
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
    automations: migratedAutomations,
    automationLogs: (serialized as any).automationLogs || [],
    notifications: [],
  };
}

// Save state to localStorage for a specific book
export function saveKanbanState(state: KanbanState, bookId: string): void {
  try {
    const payload: StoragePayload = {
      version: STORAGE_VERSION,
      data: serializeState(state),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(bookId), JSON.stringify(payload));
  } catch (error) {
    console.error('[Kanban Storage] Error saving state:', error);
  }
}

// Load state from localStorage for a specific book with migration support
export function loadKanbanState(bookId: string): KanbanState | null {
  try {
    const storageKey = getStorageKey(bookId);
    let stored = localStorage.getItem(storageKey);
    
    // If no current version data, try previous per-book versions
    if (!stored) {
      for (let v = STORAGE_VERSION - 1; v >= 1; v--) {
        const oldBookKey = getLegacyBookKey(bookId, v);
        const oldStored = localStorage.getItem(oldBookKey);
        if (oldStored) {
          console.log(`[Kanban Storage] Migrating from per-book v${v} to v${STORAGE_VERSION}...`);
          const oldPayload = JSON.parse(oldStored);
          const migratedState = deserializeState(oldPayload.data, bookId);
          migratedState.tasks = migratedState.tasks.map(task => ({
            ...task,
            relatedBook: task.relatedBook || bookId,
          }));
          saveKanbanState(migratedState, bookId);
          return migratedState;
        }
      }

      // Try legacy global storage keys
      for (const legacyKey of LEGACY_KEYS) {
        const legacyStored = localStorage.getItem(legacyKey);
        if (legacyStored) {
          console.log(`[Kanban Storage] Migrating from legacy global ${legacyKey}...`);
          const legacyPayload = JSON.parse(legacyStored);
          const migratedState = deserializeState(legacyPayload.data, bookId);
          migratedState.tasks = migratedState.tasks.map(task => ({
            ...task,
            relatedBook: task.relatedBook || bookId,
          }));
          saveKanbanState(migratedState, bookId);
          return migratedState;
        }
      }
      
      return null;
    }

    const payload: StoragePayload = JSON.parse(stored);
    const migratedState = deserializeState(payload.data, bookId);
    
    // If version mismatch, save migrated state
    if (payload.version !== STORAGE_VERSION) {
      console.warn('[Kanban Storage] Version mismatch, migrating...');
      saveKanbanState(migratedState, bookId);
    }

    return migratedState;
  } catch (error) {
    console.error('[Kanban Storage] Error loading state:', error);
    return null;
  }
}

// Clear stored state for a book
export function clearKanbanState(bookId: string): void {
  try {
    localStorage.removeItem(getStorageKey(bookId));
  } catch (error) {
    console.error('[Kanban Storage] Error clearing state:', error);
  }
}

// Check if storage has data for a book
export function hasStoredState(bookId: string): boolean {
  try {
    return localStorage.getItem(getStorageKey(bookId)) !== null;
  } catch {
    return false;
  }
}

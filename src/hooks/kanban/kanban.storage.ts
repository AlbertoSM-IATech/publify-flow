import { KanbanState } from './kanban.types';
import { Task, Column, Tag, Note, Filter, Automation, Subtask, ChecklistItem, TaskDependency } from '@/types/kanban';
import { defaultColumns } from './kanban.seed';

const STORAGE_VERSION = 5; // Bumped for single-book and subtitle migration

// Build storage key for a specific book
function getStorageKey(bookId: string): string {
  return `publify.book.${bookId}.kanban.v${STORAGE_VERSION}`;
}

// Legacy storage key (for migration)
const LEGACY_STORAGE_KEY = 'publify.kanban.v4';

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

// Ensure columns have subtitle (migration)
function ensureColumnSubtitles(columns: Column[]): Column[] {
  // Map of default subtitles by column ID
  const defaultSubtitles: Record<string, string> = {
    definition: 'Idea, enfoque y decisiones clave antes de producir.',
    production: 'Creación del contenido base (texto/ilustraciones/estructura).',
    review: 'Corrección, QA y validación de contenido antes de cerrar.',
    preparation: 'Maquetación, portada, assets finales y metadatos listos para KDP.',
    publishing: 'Subida a KDP, configuración, revisión final y puesta en marcha.',
    optimization: 'Iteraciones post-publicación: metadata, precio, Ads, reviews y mejoras.',
  };

  return columns.map(col => ({
    ...col,
    subtitle: col.subtitle || defaultSubtitles[col.id] || '',
  }));
}

// Filter out legacy system columns (completed, archived)
function filterLegacySystemColumns(columns: Column[]): Column[] {
  const legacyIds = ['completed', 'archived'];
  return columns.filter(col => !legacyIds.includes(col.id));
}

// Ensure all 6 editorial flow columns exist
function ensureEditorialColumns(columns: Column[]): Column[] {
  // Filter out legacy columns first
  let result = filterLegacySystemColumns(columns);
  
  // Check for missing editorial columns
  const editorialColumnIds = ['definition', 'production', 'review', 'preparation', 'publishing', 'optimization'];
  
  for (const defCol of defaultColumns) {
    const exists = result.some(c => c.id === defCol.id);
    if (!exists) {
      result.push(defCol);
    }
  }
  
  // Ensure correct order and subtitles
  result = ensureColumnSubtitles(result);
  
  // Sort by order
  result.sort((a, b) => a.order - b.order);
  
  return result;
}

// Deserialize the state from storage with migration support
function deserializeState(serialized: SerializedKanbanState, bookId: string): KanbanState {
  const now = new Date();
  
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

      // Migrate columnId from legacy columns to new ones
      let columnId = task.columnId;
      const legacyToNew: Record<string, string> = {
        research: 'definition',
        planning: 'definition',
        content: 'production',
        editing: 'review',
        design: 'preparation',
        validation: 'review',
        'post-launch': 'optimization',
        marketing: 'optimization',
        maintenance: 'optimization',
        completed: 'optimization', // Move completed tasks to optimization
        archived: 'optimization',
      };
      if (legacyToNew[columnId]) {
        columnId = legacyToNew[columnId];
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
        // Ensure relatedBook is set
        relatedBook: task.relatedBook || bookId,
      };
    }),
    columns: ensureEditorialColumns(serialized.columns),
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
    
    // If no v5 data for this book, try legacy migration
    if (!stored) {
      // Try to migrate from legacy global storage
      const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyStored) {
        console.log('[Kanban Storage] Migrating from legacy global storage to per-book...');
        const legacyPayload = JSON.parse(legacyStored);
        const migratedState = deserializeState(legacyPayload.data, bookId);
        
        // Filter tasks for this book only (or assign if no book set)
        migratedState.tasks = migratedState.tasks.map(task => ({
          ...task,
          relatedBook: task.relatedBook || bookId,
        }));
        
        saveKanbanState(migratedState, bookId);
        // Don't remove legacy storage - other books might need it
        return migratedState;
      }
      
      // Also try older versions
      for (const version of ['v3', 'v2', 'v1']) {
        const oldKey = `publify.kanban.${version}`;
        const oldStored = localStorage.getItem(oldKey);
        if (oldStored) {
          console.log(`[Kanban Storage] Migrating from ${version} to v5...`);
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

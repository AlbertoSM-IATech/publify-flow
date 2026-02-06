export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'not_started' | 'in_progress' | 'paused' | 'waiting' | 'archived' | 'completed';
export type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline' | 'notes';

// Legacy checklist item - kept for migration compatibility
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

// New hierarchical subtask with full properties
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

// Dependency types - Phase 7
export type DependencyType = 'FS'; // Finish-to-Start (only type for now)

export interface TaskDependency {
  id: string;
  type: DependencyType;
  dependsOnTaskId: string; // prerequisite task ID
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: string;
  priority: Priority;
  status: TaskStatus;
  tags: Tag[];
  dueDate: Date | null;
  startDate: Date | null;
  createdAt: Date;
  assignee: string | null;
  /** @deprecated Use subtasks instead */
  checklist: ChecklistItem[];
  subtasks: Subtask[];
  estimatedTime: number | null;
  actualTime: number | null;
  relatedBook: string | null;
  relatedMarket: string | null;
  attachments: string[];
  /** @deprecated Use taskDependencies instead */
  dependencies: string[];
  /** Task dependencies with full metadata */
  taskDependencies?: TaskDependency[];
  order: number;
  isArchived: boolean;
}

export interface Column {
  id: string;
  title: string;
  /** Subtitle explaining the column's purpose in the editorial flow */
  subtitle: string;
  color: string;
  icon: string;
  wipLimit: number | null;
  order: number;
  isHidden: boolean;
  /** @deprecated No longer used - completion is determined by task status/progress */
  isDoneColumn?: boolean;
  /** System columns cannot be deleted */
  isSystemColumn?: boolean;
}

export interface Filter {
  priority: Priority[];
  tags: string[];
  assignee: string | null;
  dueDate: { from: Date | null; to: Date | null };
  search: string;
  market: string | null;
  showArchived: boolean;
}

export interface Note {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export Automation types from automation.ts
export type {
  Automation,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  AutomationExecution,
  AutomationNotification,
  AutomationEvent,
  AutomationTriggerType,
  AutomationConditionType,
  AutomationActionType,
  AutomationScope,
} from './automation';

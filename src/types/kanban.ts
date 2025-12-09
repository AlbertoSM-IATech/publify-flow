export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'not_started' | 'in_progress' | 'paused' | 'waiting' | 'archived' | 'completed';
export type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline' | 'notes';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
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
  checklist: ChecklistItem[];
  estimatedTime: number | null;
  actualTime: number | null;
  relatedBook: string | null;
  relatedMarket: string | null;
  attachments: string[];
  dependencies: string[];
  order: number;
  isArchived: boolean;
}

export interface Column {
  id: string;
  title: string;
  color: string;
  icon: string;
  wipLimit: number | null;
  order: number;
  isHidden: boolean;
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

export interface Automation {
  id: string;
  name: string;
  trigger: {
    type: 'priority' | 'dueDate' | 'checklist' | 'dependency';
    value: string;
  };
  action: {
    type: 'moveToColumn' | 'setPriority' | 'addTag' | 'notify';
    value: string;
  };
  enabled: boolean;
}

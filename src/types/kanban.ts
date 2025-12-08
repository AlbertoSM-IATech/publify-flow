export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline';

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
  tags: Tag[];
  dueDate: Date | null;
  startDate: Date | null; // For timeline view
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
  isArchived: boolean; // Archive functionality
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
  market: string | null; // Market filter
  showArchived: boolean; // Archive filter
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

import { useState, useCallback } from 'react';
import { Task, Column, Filter, Priority, Tag, ChecklistItem, Automation } from '@/types/kanban';

const defaultTags: Tag[] = [
  { id: '1', name: 'KDP', color: '#3B82F6' },
  { id: '2', name: 'Urgente', color: '#EF4444' },
  { id: '3', name: 'Contenido', color: '#10B981' },
  { id: '4', name: 'Diseño', color: '#8B5CF6' },
  { id: '5', name: 'Marketing', color: '#F59E0B' },
  { id: '6', name: 'SEO', color: '#06B6D4' },
];

// Editorial workflow columns for KDP publishing
const defaultColumns: Column[] = [
  { id: 'research', title: 'Investigación', color: '#3B82F6', icon: 'search', wipLimit: null, order: 0, isHidden: false },
  { id: 'planning', title: 'Planificación', color: '#8B5CF6', icon: 'layout', wipLimit: null, order: 1, isHidden: false },
  { id: 'content', title: 'Contenido', color: '#06B6D4', icon: 'file-text', wipLimit: 5, order: 2, isHidden: false },
  { id: 'editing', title: 'Edición', color: '#F59E0B', icon: 'edit', wipLimit: 3, order: 3, isHidden: false },
  { id: 'design', title: 'Diseño', color: '#EC4899', icon: 'palette', wipLimit: 3, order: 4, isHidden: false },
  { id: 'validation', title: 'Validación', color: '#6366F1', icon: 'check-circle', wipLimit: null, order: 5, isHidden: false },
  { id: 'publishing', title: 'Publicación', color: '#EF4444', icon: 'upload', wipLimit: null, order: 6, isHidden: false },
  { id: 'post-launch', title: 'Post-Lanzamiento', color: '#10B981', icon: 'trending-up', wipLimit: null, order: 7, isHidden: false },
  { id: 'marketing', title: 'Marketing', color: '#FB923C', icon: 'megaphone', wipLimit: null, order: 8, isHidden: false },
  { id: 'maintenance', title: 'Mantenimiento', color: '#6B7280', icon: 'settings', wipLimit: null, order: 9, isHidden: false },
  { id: 'completed', title: 'Completado', color: '#22C55E', icon: 'check', wipLimit: null, order: 10, isHidden: false },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

// BUG FIX: Use current date/time for createdAt and reasonable dueDate
const now = new Date();
const sampleTasks: Task[] = [
  {
    id: generateId(),
    title: 'Investigación nicho coloring books',
    description: 'Análisis de competencia y demanda en Amazon.com',
    columnId: 'research',
    priority: 'high',
    tags: [defaultTags[0]],
    dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    startDate: now,
    createdAt: now,
    assignee: 'Ana García',
    checklist: [
      { id: '1', text: 'Investigación de nicho', completed: true },
      { id: '2', text: 'Análisis KWs primarias', completed: true },
      { id: '3', text: 'Revisión de competencia', completed: false },
      { id: '4', text: 'Análisis BSRs y Pricing', completed: false },
    ],
    estimatedTime: 8,
    actualTime: 4,
    relatedBook: null,
    relatedMarket: '.com',
    attachments: [],
    dependencies: [],
    order: 0,
    isArchived: false,
  },
  {
    id: generateId(),
    title: 'Crear outline libro recetas',
    description: 'Estructura y TOC para libro de recetas veganas',
    columnId: 'planning',
    priority: 'medium',
    tags: [defaultTags[2]],
    dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    startDate: now,
    createdAt: now,
    assignee: 'Carlos López',
    checklist: [
      { id: '1', text: 'Definir estructura', completed: true },
      { id: '2', text: 'Crear outline (TOC)', completed: false },
      { id: '3', text: 'Definir número de páginas', completed: false },
    ],
    estimatedTime: 6,
    actualTime: null,
    relatedBook: 'Recetas Veganas',
    relatedMarket: '.es',
    attachments: [],
    dependencies: [],
    order: 0,
    isArchived: false,
  },
  {
    id: generateId(),
    title: 'Redacción capítulos 1-5',
    description: 'Escribir los primeros capítulos del manuscrito',
    columnId: 'content',
    priority: 'critical',
    tags: [defaultTags[2]],
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    startDate: now,
    createdAt: now,
    assignee: 'María Sánchez',
    checklist: [
      { id: '1', text: 'Capítulo 1', completed: true },
      { id: '2', text: 'Capítulo 2', completed: true },
      { id: '3', text: 'Capítulo 3', completed: false },
      { id: '4', text: 'Capítulo 4', completed: false },
      { id: '5', text: 'Capítulo 5', completed: false },
    ],
    estimatedTime: 24,
    actualTime: 10,
    relatedBook: 'Guía de Productividad',
    relatedMarket: '.com',
    attachments: [],
    dependencies: [],
    order: 0,
    isArchived: false,
  },
  {
    id: generateId(),
    title: 'Diseñar portada libro infantil',
    description: 'Crear diseño de portada front + spine + back',
    columnId: 'design',
    priority: 'high',
    tags: [defaultTags[3]],
    dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    startDate: now,
    createdAt: now,
    assignee: 'Pedro Ruiz',
    checklist: [
      { id: '1', text: 'Diseñar portada frontal', completed: true },
      { id: '2', text: 'Diseñar lomo', completed: false },
      { id: '3', text: 'Diseñar contraportada', completed: false },
    ],
    estimatedTime: 12,
    actualTime: 6,
    relatedBook: 'Cuentos para Dormir',
    relatedMarket: '.es',
    attachments: [],
    dependencies: [],
    order: 0,
    isArchived: false,
  },
  {
    id: generateId(),
    title: 'Subir libro a KDP',
    description: 'Configurar metadata y subir archivos',
    columnId: 'publishing',
    priority: 'high',
    tags: [defaultTags[0], defaultTags[1]],
    dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    startDate: now,
    createdAt: now,
    assignee: 'Ana García',
    checklist: [
      { id: '1', text: 'Subir manuscrito', completed: false },
      { id: '2', text: 'Subir portada', completed: false },
      { id: '3', text: 'Configurar metadata', completed: false },
      { id: '4', text: 'Seleccionar categorías', completed: false },
    ],
    estimatedTime: 4,
    actualTime: null,
    relatedBook: 'Mindfulness Daily',
    relatedMarket: '.com',
    attachments: [],
    dependencies: [],
    order: 0,
    isArchived: false,
  },
];

export function useKanban() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [availableTags, setAvailableTags] = useState<Tag[]>(defaultTags);
  const [filter, setFilter] = useState<Filter>({
    priority: [],
    tags: [],
    assignee: null,
    dueDate: { from: null, to: null },
    search: '',
    market: null,
    showArchived: false,
  });
  const [automations, setAutomations] = useState<Automation[]>([]);

  // Tag management functions
  const addTag = useCallback((name: string, color: string) => {
    const newTag: Tag = {
      id: generateId(),
      name,
      color,
    };
    setAvailableTags(prev => [...prev, newTag]);
    return newTag;
  }, []);

  const updateTag = useCallback((tagId: string, updates: Partial<Tag>) => {
    setAvailableTags(prev => prev.map(tag =>
      tag.id === tagId ? { ...tag, ...updates } : tag
    ));
    // Also update the tag in all tasks that use it
    setTasks(prev => prev.map(task => ({
      ...task,
      tags: task.tags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      ),
    })));
  }, []);

  const deleteTag = useCallback((tagId: string) => {
    setAvailableTags(prev => prev.filter(tag => tag.id !== tagId));
    // Remove the tag from all tasks
    setTasks(prev => prev.map(task => ({
      ...task,
      tags: task.tags.filter(tag => tag.id !== tagId),
    })));
  }, []);

  // BUG FIX: Use current date/time for new tasks
  const addTask = useCallback((columnId: string, task: Partial<Task>) => {
    const now = new Date();
    const newTask: Task = {
      id: generateId(),
      title: task.title || 'Nueva tarea',
      description: task.description || '',
      columnId,
      priority: task.priority || 'medium',
      tags: task.tags || [],
      dueDate: task.dueDate || null,
      startDate: task.startDate || now,
      createdAt: now, // Always use current timestamp
      assignee: task.assignee || null,
      checklist: task.checklist || [],
      estimatedTime: task.estimatedTime || null,
      actualTime: task.actualTime || null,
      relatedBook: task.relatedBook || null,
      relatedMarket: task.relatedMarket || null,
      attachments: task.attachments || [],
      dependencies: task.dependencies || [],
      order: tasks.filter(t => t.columnId === columnId).length,
      isArchived: false,
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, [tasks]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  // Archive a task
  const archiveTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, isArchived: true } : task
    ));
  }, []);

  // Unarchive a task
  const unarchiveTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, isArchived: false } : task
    ));
  }, []);

  const moveTask = useCallback((taskId: string, targetColumnId: string, targetIndex: number) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      // BUG FIX: Prevent unnecessary state updates
      const isInSameColumn = task.columnId === targetColumnId;
      const currentIndex = prev
        .filter(t => t.columnId === task.columnId)
        .sort((a, b) => a.order - b.order)
        .findIndex(t => t.id === taskId);
      
      if (isInSameColumn && currentIndex === targetIndex) {
        return prev; // No change needed
      }

      const otherTasks = prev.filter(t => t.id !== taskId);
      const targetColumnTasks = otherTasks
        .filter(t => t.columnId === targetColumnId)
        .sort((a, b) => a.order - b.order);
      
      const updatedTask = { ...task, columnId: targetColumnId };
      
      // BUG FIX: Insert at correct position and reorder
      const reorderedTargetTasks = [
        ...targetColumnTasks.slice(0, targetIndex),
        updatedTask,
        ...targetColumnTasks.slice(targetIndex),
      ].map((t, i) => ({ ...t, order: i }));

      const otherColumnTasks = otherTasks.filter(t => t.columnId !== targetColumnId);
      
      return [...otherColumnTasks, ...reorderedTargetTasks];
    });
  }, []);

  const addColumn = useCallback((title: string) => {
    const newColumn: Column = {
      id: generateId(),
      title,
      color: '#6B7280',
      icon: 'folder',
      wipLimit: null,
      order: columns.length,
      isHidden: false,
    };
    setColumns(prev => [...prev, newColumn]);
  }, [columns]);

  const updateColumn = useCallback((columnId: string, updates: Partial<Column>) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    // BUG FIX: Check if column has tasks before deleting
    // Move tasks to first available column or delete if no other columns exist
    setTasks(prev => {
      const tasksInColumn = prev.filter(task => task.columnId === columnId);
      if (tasksInColumn.length === 0) return prev;
      
      // Find first column that isn't being deleted
      const firstAvailableColumn = columns.find(c => c.id !== columnId);
      if (firstAvailableColumn) {
        // Move tasks to first available column
        return prev.map(task => 
          task.columnId === columnId 
            ? { ...task, columnId: firstAvailableColumn.id }
            : task
        );
      }
      // No other columns, keep tasks orphaned (they'll be deleted with column)
      return prev.filter(task => task.columnId !== columnId);
    });
    setColumns(prev => prev.filter(col => col.id !== columnId));
  }, [columns]);

  const moveColumn = useCallback((columnId: string, targetIndex: number) => {
    setColumns(prev => {
      const column = prev.find(c => c.id === columnId);
      if (!column) return prev;

      const otherColumns = prev.filter(c => c.id !== columnId);
      const reordered = [
        ...otherColumns.slice(0, targetIndex),
        column,
        ...otherColumns.slice(targetIndex),
      ].map((c, i) => ({ ...c, order: i }));

      return reordered;
    });
  }, []);

  // BUG FIX: Include market filter and archived filter
  const getFilteredTasks = useCallback(() => {
    return tasks.filter(task => {
      // Filter out archived tasks unless showArchived is true
      if (task.isArchived && !filter.showArchived) {
        return false;
      }
      if (filter.priority.length > 0 && !filter.priority.includes(task.priority)) {
        return false;
      }
      if (filter.tags.length > 0 && !task.tags.some(t => filter.tags.includes(t.id))) {
        return false;
      }
      if (filter.assignee && task.assignee !== filter.assignee) {
        return false;
      }
      if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      // Market filter
      if (filter.market && task.relatedMarket !== filter.market) {
        return false;
      }
      return true;
    });
  }, [tasks, filter]);

  // Get archived tasks only
  const getArchivedTasks = useCallback(() => {
    return tasks.filter(task => task.isArchived);
  }, [tasks]);

  const getTasksByColumn = useCallback((columnId: string) => {
    return getFilteredTasks()
      .filter(task => task.columnId === columnId && !task.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [getFilteredTasks]);

  const duplicateTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date();
    const newTask: Task = {
      ...task,
      id: generateId(),
      title: `${task.title} (copia)`,
      createdAt: now,
      order: tasks.filter(t => t.columnId === task.columnId).length,
      isArchived: false,
    };
    setTasks(prev => [...prev, newTask]);
  }, [tasks]);

  const addChecklistItem = useCallback((taskId: string, text: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        checklist: [...task.checklist, { id: generateId(), text, completed: false }],
      };
    }));
  }, []);

  const toggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        checklist: task.checklist.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      };
    }));
  }, []);

  const deleteChecklistItem = useCallback((taskId: string, itemId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        checklist: task.checklist.filter(item => item.id !== itemId),
      };
    }));
  }, []);

  // Get unique assignees for filtering
  const getUniqueAssignees = useCallback(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee) assignees.add(task.assignee);
    });
    return Array.from(assignees);
  }, [tasks]);

  // Get unique markets for filtering
  const getUniqueMarkets = useCallback(() => {
    const markets = new Set<string>();
    tasks.forEach(task => {
      if (task.relatedMarket) markets.add(task.relatedMarket);
    });
    return Array.from(markets);
  }, [tasks]);

  return {
    tasks,
    columns: columns.filter(c => !c.isHidden).sort((a, b) => a.order - b.order),
    allColumns: columns.sort((a, b) => a.order - b.order),
    availableTags,
    filter,
    automations,
    setFilter,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    moveTask,
    addColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
    getTasksByColumn,
    duplicateTask,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    getFilteredTasks,
    getArchivedTasks,
    getUniqueAssignees,
    getUniqueMarkets,
    addTag,
    updateTag,
    deleteTag,
  };
}
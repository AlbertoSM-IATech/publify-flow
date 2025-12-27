import { Task, Column, Tag, Note, Filter, Subtask, Automation } from '@/types/kanban';
import { KanbanState } from './kanban.types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const defaultTags: Tag[] = [
  { id: '1', name: 'KDP', color: '#3B82F6' },
  { id: '2', name: 'Urgente', color: '#EF4444' },
  { id: '3', name: 'Contenido', color: '#10B981' },
  { id: '4', name: 'Diseño', color: '#8B5CF6' },
  { id: '5', name: 'Marketing', color: '#F59E0B' },
  { id: '6', name: 'SEO', color: '#06B6D4' },
];

export const defaultColumns: Column[] = [
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
  { id: 'completed', title: 'Completado', color: '#22C55E', icon: 'check', wipLimit: null, order: 10, isHidden: false, isDoneColumn: true, isSystemColumn: true },
  { id: 'archived', title: 'Archivado', color: '#9CA3AF', icon: 'archive', wipLimit: null, order: 11, isHidden: false, isSystemColumn: true },
];

const defaultFilter: Filter = {
  priority: [],
  tags: [],
  assignee: null,
  dueDate: { from: null, to: null },
  search: '',
  market: null,
  showArchived: false,
};

// Helper to create subtask from checklist item (migration)
function createSubtask(text: string, completed: boolean): Subtask {
  return {
    id: generateId(),
    title: text,
    completed,
    assignedTo: null,
    dueDate: null,
    createdAt: new Date(),
  };
}

export function createSeedState(): KanbanState {
  const now = new Date();
  
  const sampleTasks: Task[] = [
    {
      id: generateId(),
      title: 'Investigación nicho coloring books',
      description: 'Análisis de competencia y demanda en Amazon.com',
      columnId: 'research',
      priority: 'high',
      status: 'in_progress',
      tags: [defaultTags[0]],
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Ana García',
      checklist: [],
      subtasks: [
        createSubtask('Investigación de nicho', true),
        createSubtask('Análisis KWs primarias', true),
        createSubtask('Revisión de competencia', false),
        createSubtask('Análisis BSRs y Pricing', false),
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
      status: 'not_started',
      tags: [defaultTags[2]],
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Carlos López',
      checklist: [],
      subtasks: [
        createSubtask('Definir estructura', true),
        createSubtask('Crear outline (TOC)', false),
        createSubtask('Definir número de páginas', false),
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
      status: 'in_progress',
      tags: [defaultTags[2]],
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'María Sánchez',
      checklist: [],
      subtasks: [
        createSubtask('Capítulo 1', true),
        createSubtask('Capítulo 2', true),
        createSubtask('Capítulo 3', false),
        createSubtask('Capítulo 4', false),
        createSubtask('Capítulo 5', false),
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
      status: 'paused',
      tags: [defaultTags[3]],
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Pedro Ruiz',
      checklist: [],
      subtasks: [
        createSubtask('Diseñar portada frontal', true),
        createSubtask('Diseñar lomo', false),
        createSubtask('Diseñar contraportada', false),
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
      status: 'waiting',
      tags: [defaultTags[0], defaultTags[1]],
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Ana García',
      checklist: [],
      subtasks: [
        createSubtask('Subir manuscrito', false),
        createSubtask('Subir portada', false),
        createSubtask('Configurar metadata', false),
        createSubtask('Seleccionar categorías', false),
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

  const sampleNotes: Note[] = [
    {
      id: generateId(),
      title: 'Ideas para nuevo nicho',
      shortDescription: 'Posibles nichos de libros para explorar en Q1 2025',
      content: '## Nichos potenciales\n\n- Libros de colorear para adultos (mandala)\n- Journals de gratitud\n- Planners semanales\n- Libros de actividades para niños\n\n### Prioridad alta\n- Coloring books temáticos (temporadas)',
      priority: 'high',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'Keywords de competencia',
      shortDescription: 'Lista de keywords de competidores en Amazon.com',
      content: 'Keywords principales:\n- adult coloring book\n- stress relief coloring\n- mindfulness coloring\n\nKeywords secundarias:\n- anxiety relief\n- relaxation coloring',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  // Default seed automations (disabled by default)
  const seedTime = new Date();
  const seedAutomations: Automation[] = [
    {
      id: generateId(),
      name: 'Subtareas completadas → Mover a Completado',
      enabled: false,
      trigger: { type: 'PROGRESS_CHANGED' },
      conditions: [{ type: 'SUBTASKS_ALL_COMPLETED' }],
      actions: [{ type: 'MOVE_TO_COLUMN', columnId: 'completed' }],
      createdAt: seedTime,
      updatedAt: seedTime,
    },
    {
      id: generateId(),
      name: 'Prioridad crítica → Añadir etiqueta Urgente',
      enabled: false,
      trigger: { type: 'PRIORITY_CHANGED' },
      conditions: [{ type: 'PRIORITY_IS', value: 'critical' }],
      actions: [{ type: 'ADD_TAG', tagId: '2' }], // Tag "Urgente"
      createdAt: seedTime,
      updatedAt: seedTime,
    },
    {
      id: generateId(),
      name: 'Fecha límite cercana → Notificar',
      enabled: false,
      trigger: { type: 'DUE_DATE_CHANGED' },
      conditions: [{ type: 'DUE_IN_DAYS_LESS_THAN', value: 2 }],
      actions: [
        { type: 'ADD_TAG', tagId: '2' }, // Tag "Urgente"
        { type: 'NOTIFY_IN_APP', message: 'Tarea próxima a vencer' },
      ],
      createdAt: seedTime,
      updatedAt: seedTime,
    },
  ];

  return {
    tasks: sampleTasks,
    columns: defaultColumns,
    tags: defaultTags,
    notes: sampleNotes,
    filter: defaultFilter,
    automations: seedAutomations,
    automationLogs: [],
    notifications: [],
  };
}

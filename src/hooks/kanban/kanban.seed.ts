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

/**
 * 6 Template Columns for new books
 * These are the initial phases of the editorial workflow.
 * Users CAN add, delete, rename, and reorder columns freely.
 */
export const defaultColumns: Column[] = [
  {
    id: 'research',
    title: 'Investigación',
    subtitle: 'Idea, enfoque y decisiones clave antes de producir.',
    color: '#6366F1',
    icon: 'lightbulb',
    wipLimit: null,
    order: 0,
    isHidden: false,
  },
  {
    id: 'production',
    title: 'Producción',
    subtitle: 'Creación del contenido base (texto/ilustraciones/estructura).',
    color: '#3B82F6',
    icon: 'file-text',
    wipLimit: 5,
    order: 1,
    isHidden: false,
  },
  {
    id: 'preparation',
    title: 'Preparación',
    subtitle: 'Maquetación, portada, assets finales y metadatos listos para KDP.',
    color: '#EC4899',
    icon: 'palette',
    wipLimit: 3,
    order: 2,
    isHidden: false,
  },
  {
    id: 'review',
    title: 'Revisión',
    subtitle: 'Corrección y validación de contenido antes de cerrar.',
    color: '#F59E0B',
    icon: 'edit',
    wipLimit: 3,
    order: 3,
    isHidden: false,
  },
  {
    id: 'publishing',
    title: 'Publicación',
    subtitle: 'Subida a KDP, configuración, revisión final y puesta en marcha.',
    color: '#EF4444',
    icon: 'upload',
    wipLimit: null,
    order: 4,
    isHidden: false,
  },
  {
    id: 'optimization',
    title: 'Optimización',
    subtitle: 'Iteraciones post-publicación: metadata, precio, Ads, reviews y mejoras.',
    color: '#10B981',
    icon: 'trending-up',
    wipLimit: null,
    order: 5,
    isHidden: false,
  },
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

// Helper to create subtask
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

/**
 * Create seed state for a specific book (first load only)
 */
export function createSeedState(bookId?: string): KanbanState {
  const now = new Date();
  const effectiveBookId = bookId || 'default-book';
  
  const sampleTasks: Task[] = [
    {
      id: generateId(),
      title: 'Definir concepto y público objetivo',
      description: 'Establecer la idea central del libro y el target de lectores',
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
        createSubtask('Análisis de competencia', true),
        createSubtask('Definir propuesta de valor', false),
        createSubtask('Crear buyer persona', false),
      ],
      estimatedTime: 8,
      actualTime: 4,
      relatedBook: effectiveBookId,
      relatedMarket: '.com',
      attachments: [],
      dependencies: [],
      order: 0,
      isArchived: false,
    },
    {
      id: generateId(),
      title: 'Escribir outline y estructura',
      description: 'Crear el esquema de capítulos y flujo del contenido',
      columnId: 'research',
      priority: 'medium',
      status: 'not_started',
      tags: [defaultTags[2]],
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Carlos López',
      checklist: [],
      subtasks: [
        createSubtask('Definir estructura general', false),
        createSubtask('Crear outline detallado', false),
        createSubtask('Definir número de páginas', false),
      ],
      estimatedTime: 6,
      actualTime: null,
      relatedBook: effectiveBookId,
      relatedMarket: '.es',
      attachments: [],
      dependencies: [],
      order: 1,
      isArchived: false,
    },
    {
      id: generateId(),
      title: 'Redacción de contenido principal',
      description: 'Escribir los capítulos del manuscrito',
      columnId: 'production',
      priority: 'critical',
      status: 'in_progress',
      tags: [defaultTags[2]],
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'María Sánchez',
      checklist: [],
      subtasks: [
        createSubtask('Capítulo 1 - Introducción', true),
        createSubtask('Capítulo 2 - Fundamentos', true),
        createSubtask('Capítulo 3 - Desarrollo', false),
        createSubtask('Capítulo 4 - Casos prácticos', false),
        createSubtask('Capítulo 5 - Conclusiones', false),
      ],
      estimatedTime: 40,
      actualTime: 16,
      relatedBook: effectiveBookId,
      relatedMarket: '.com',
      attachments: [],
      dependencies: [],
      order: 0,
      isArchived: false,
    },
    {
      id: generateId(),
      title: 'Diseñar portada y assets gráficos',
      description: 'Crear portada frontal, lomo y contraportada',
      columnId: 'preparation',
      priority: 'high',
      status: 'paused',
      tags: [defaultTags[3]],
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Pedro Ruiz',
      checklist: [],
      subtasks: [
        createSubtask('Diseñar portada frontal', true),
        createSubtask('Diseñar lomo', false),
        createSubtask('Diseñar contraportada', false),
        createSubtask('Crear mockups promocionales', false),
      ],
      estimatedTime: 12,
      actualTime: 4,
      relatedBook: effectiveBookId,
      relatedMarket: '.es',
      attachments: [],
      dependencies: [],
      order: 0,
      isArchived: false,
    },
    {
      id: generateId(),
      title: 'Configurar y subir a KDP',
      description: 'Preparar metadata, subir archivos y configurar producto',
      columnId: 'publishing',
      priority: 'high',
      status: 'waiting',
      tags: [defaultTags[0], defaultTags[1]],
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      startDate: now,
      createdAt: now,
      assignee: 'Ana García',
      checklist: [],
      subtasks: [
        createSubtask('Subir manuscrito PDF', false),
        createSubtask('Subir portada en alta resolución', false),
        createSubtask('Configurar metadata y descripción', false),
        createSubtask('Seleccionar categorías y keywords', false),
        createSubtask('Configurar pricing', false),
      ],
      estimatedTime: 4,
      actualTime: null,
      relatedBook: effectiveBookId,
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
      title: 'Ideas para el próximo libro',
      shortDescription: 'Posibles temas y nichos para explorar',
      content: '## Nichos potenciales\n\n- Libros de colorear para adultos\n- Journals de gratitud\n- Planners semanales\n\n### Prioridad alta\n- Coloring books temáticos',
      priority: 'high',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'Keywords de competencia',
      shortDescription: 'Lista de keywords de competidores en Amazon',
      content: 'Keywords principales:\n- adult coloring book\n- stress relief coloring\n- mindfulness coloring',
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
      name: 'Subtareas completadas → Marcar como completada',
      enabled: false,
      trigger: { type: 'PROGRESS_CHANGED' },
      conditions: [{ type: 'SUBTASKS_ALL_COMPLETED' }],
      actions: [{ type: 'ARCHIVE_TASK' }],
      createdAt: seedTime,
      updatedAt: seedTime,
    },
    {
      id: generateId(),
      name: 'Prioridad crítica → Añadir etiqueta Urgente',
      enabled: false,
      trigger: { type: 'PRIORITY_CHANGED' },
      conditions: [{ type: 'PRIORITY_IS', value: 'critical' }],
      actions: [{ type: 'ADD_TAG', tagId: '2' }],
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
        { type: 'ADD_TAG', tagId: '2' },
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

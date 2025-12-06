import { useState, useRef, useEffect } from 'react';
import {
  X, Calendar, Tag, User, Clock, Link2, Trash2, Copy, MoreHorizontal,
  CheckSquare, Plus, AlertCircle, FileText, MessageSquare,
  Search, Layout, Edit3, Palette, CheckCircle, Upload,
  TrendingUp, Megaphone, Settings, Check, Folder
} from 'lucide-react';
import { Task, Column, Tag as TagType, Priority } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// BUG FIX: Icon mapping for rendering column icons properly
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  layout: <Layout className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  edit: <Edit3 className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  'check-circle': <CheckCircle className="w-4 h-4" />,
  upload: <Upload className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  megaphone: <Megaphone className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  check: <Check className="w-4 h-4" />,
  folder: <Folder className="w-4 h-4" />,
};

interface TaskDetailPanelProps {
  task: Task;
  columns: Column[];
  availableTags: TagType[];
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
  onDeleteChecklistItem: (itemId: string) => void;
}

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Crítica', color: '#EF4444' },
  { value: 'high', label: 'Alta', color: '#FB923C' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'low', label: 'Baja', color: '#22C55E' },
];

export function TaskDetailPanel({
  task,
  columns,
  availableTags,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details');
  
  const panelRef = useRef<HTMLDivElement>(null);

  // BUG FIX: Sync local state when task prop changes (for reactive updates from external changes)
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task.id, task.title, task.description]);

  const handleTitleBlur = () => {
    // BUG FIX: Validate title is not empty, revert to original if empty
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitle(task.title); // Revert to original
      return;
    }
    if (trimmedTitle !== task.title) {
      onUpdate({ title: trimmedTitle });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onUpdate({ description });
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      onAddChecklistItem(newChecklistItem.trim());
      setNewChecklistItem('');
    }
  };

  const completedChecklist = task.checklist.filter(item => item.completed).length;
  const checklistProgress = task.checklist.length > 0 
    ? (completedChecklist / task.checklist.length) * 100 
    : 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border shadow-xl z-50 animate-slide-in-right overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Select
              value={task.columnId}
              onValueChange={(value) => onUpdate({ columnId: value })}
            >
              <SelectTrigger className="w-auto h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    <span className="flex items-center gap-2">
                      {/* BUG FIX: Render icon component instead of string */}
                      <span style={{ color: col.color }}>{iconMap[col.icon] || <Folder className="w-4 h-4" />}</span>
                      {col.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="text-xl font-heading font-semibold border-none bg-transparent px-0 focus-visible:ring-0 h-auto"
                placeholder="Título de la tarea"
              />
            </div>

            {/* Quick Properties */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Prioridad
                </label>
                <Select
                  value={task.priority}
                  onValueChange={(value: Priority) => onUpdate({ priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: opt.color }}
                          />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha límite
                </label>
                <Input
                  type="date"
                  value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => onUpdate({ dueDate: e.target.value ? new Date(e.target.value) : null })}
                  className="w-full"
                />
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Asignado
                </label>
                <Input
                  value={task.assignee || ''}
                  onChange={(e) => onUpdate({ assignee: e.target.value || null })}
                  placeholder="Sin asignar"
                />
              </div>

              {/* Time Estimate */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tiempo estimado (h)
                </label>
                <Input
                  type="number"
                  value={task.estimatedTime || ''}
                  onChange={(e) => onUpdate({ estimatedTime: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const isSelected = task.tags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (isSelected) {
                          onUpdate({ tags: task.tags.filter(t => t.id !== tag.id) });
                        } else {
                          onUpdate({ tags: [...task.tags, tag] });
                        }
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium border transition-all",
                        isSelected
                          ? "border-transparent"
                          : "border-border bg-transparent hover:bg-muted"
                      )}
                      style={isSelected ? {
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: tag.color,
                      } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Descripción
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Añade una descripción..."
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Checklist
                </label>
                {task.checklist.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedChecklist}/{task.checklist.length} ({Math.round(checklistProgress)}%)
                  </span>
                )}
              </div>
              
              {task.checklist.length > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {task.checklist.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 group p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => onToggleChecklistItem(item.id)}
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteChecklistItem(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Añadir elemento..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklistItem();
                  }}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddChecklistItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Market Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Mercado
              </label>
              <Select
                value={task.relatedMarket || 'none'}
                onValueChange={(value) => onUpdate({ relatedMarket: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin mercado</SelectItem>
                  <SelectItem value=".com">.com (US)</SelectItem>
                  <SelectItem value=".es">.es (España)</SelectItem>
                  <SelectItem value=".co.uk">.co.uk (UK)</SelectItem>
                  <SelectItem value=".de">.de (Alemania)</SelectItem>
                  <SelectItem value=".fr">.fr (Francia)</SelectItem>
                  <SelectItem value=".it">.it (Italia)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <p>Creada: {format(new Date(task.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}</p>
              {task.actualTime && <p>Tiempo registrado: {task.actualTime}h</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

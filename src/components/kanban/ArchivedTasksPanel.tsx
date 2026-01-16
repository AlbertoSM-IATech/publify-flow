import { useState, useMemo } from 'react';
import { Archive, Search, Trash2, CornerUpLeft, X, CheckSquare } from 'lucide-react';
import { Task, Column, Priority } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArchivedTasksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivedTasks: Task[];
  columns: Column[];
  onRestoreTask: (taskId: string, targetColumnId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkRestore: (taskIds: string[], targetColumnId: string) => void;
  onBulkDelete: (taskIds: string[]) => void;
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: '#EF4444' },
  high: { label: 'Alta', color: '#FB923C' },
  medium: { label: 'Media', color: '#F59E0B' },
  low: { label: 'Baja', color: '#22C55E' },
};

export function ArchivedTasksPanel({
  open,
  onOpenChange,
  archivedTasks,
  columns,
  onRestoreTask,
  onDeleteTask,
  onBulkRestore,
  onBulkDelete,
}: ArchivedTasksPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [restoreTargetColumn, setRestoreTargetColumn] = useState<string>('');

  // Filter out system columns like archived for restore targets
  const restoreColumns = useMemo(() => 
    columns.filter(c => c.id !== 'archived' && !c.isHidden),
    [columns]
  );

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return archivedTasks;
    const query = searchQuery.toLowerCase();
    return archivedTasks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [archivedTasks, searchQuery]);

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleBulkRestore = () => {
    if (selectedTasks.size > 0 && restoreTargetColumn) {
      onBulkRestore(Array.from(selectedTasks), restoreTargetColumn);
      setSelectedTasks(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size > 0) {
      onBulkDelete(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const handleClose = () => {
    setSelectedTasks(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Tareas Archivadas
            <span className="text-sm font-normal text-muted-foreground">
              ({archivedTasks.length} tareas)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Bulk Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tareas archivadas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {selectedTasks.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedTasks.size} seleccionadas
                </span>
                <Select value={restoreTargetColumn} onValueChange={setRestoreTargetColumn}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Restaurar a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {restoreColumns.map(col => (
                      <SelectItem key={col.id} value={col.id}>
                        <span className="flex items-center gap-2">
                          <span 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: col.color }}
                          />
                          {col.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleBulkRestore}
                  disabled={!restoreTargetColumn}
                >
                  <CornerUpLeft className="w-4 h-4 mr-1" />
                  Restaurar
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            )}
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin border border-border rounded-lg">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Archive className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">No hay tareas archivadas</p>
                {searchQuery && (
                  <p className="text-sm">Prueba con otro término de búsqueda</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 sticky top-0 z-10">
                  <Checkbox
                    checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-xs font-medium text-muted-foreground uppercase flex-1">
                    Tarea
                  </span>
                  <span className="text-xs font-medium text-muted-foreground uppercase w-24">
                    Prioridad
                  </span>
                  <span className="text-xs font-medium text-muted-foreground uppercase w-28">
                    Archivada
                  </span>
                  <span className="w-20" />
                </div>

                {/* Rows */}
                {filteredTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
                      selectedTasks.has(task.id) && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                      )}
                    </div>
                    <span
                      className="w-24 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${priorityConfig[task.priority].color}20`,
                        color: priorityConfig[task.priority].color,
                      }}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: priorityConfig[task.priority].color }}
                      />
                      {priorityConfig[task.priority].label}
                    </span>
                    <span className="w-28 text-xs text-muted-foreground">
                      {format(new Date(task.createdAt), 'd MMM yyyy', { locale: es })}
                    </span>
                    <div className="w-20 flex items-center gap-1">
                      <Select 
                        onValueChange={(targetColumnId) => onRestoreTask(task.id, targetColumnId)}
                      >
                        <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent hover:bg-muted">
                          <CornerUpLeft className="w-4 h-4" />
                        </SelectTrigger>
                        <SelectContent>
                          {restoreColumns.map(col => (
                            <SelectItem key={col.id} value={col.id}>
                              <span className="flex items-center gap-2">
                                <span 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: col.color }}
                                />
                                {col.title}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

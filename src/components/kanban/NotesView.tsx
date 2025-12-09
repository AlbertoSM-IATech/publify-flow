import { useState } from 'react';
import { 
  Plus, Search, FileText, Calendar, Trash2, Pencil, X, Check,
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { Note, Priority } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Partial<Note>) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
}

type SortField = 'title' | 'priority' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: '#EF4444' },
  high: { label: 'Alta', color: '#FB923C' },
  medium: { label: 'Media', color: '#F59E0B' },
  low: { label: 'Baja', color: '#22C55E' },
};

export function NotesView({ notes, onAddNote, onUpdateNote, onDeleteNote }: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('medium');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const resetForm = () => {
    setFormTitle('');
    setFormShortDesc('');
    setFormContent('');
    setFormPriority('medium');
  };

  const handleAddNote = () => {
    if (formTitle.trim()) {
      onAddNote({
        title: formTitle.trim(),
        shortDescription: formShortDesc.trim(),
        content: formContent,
        priority: formPriority,
      });
      resetForm();
      setShowAddDialog(false);
    }
  };

  const handleOpenNote = (note: Note) => {
    setSelectedNote(note);
    setFormTitle(note.title);
    setFormShortDesc(note.shortDescription);
    setFormContent(note.content);
    setFormPriority(note.priority);
    setIsEditing(false);
  };

  const handleSaveNote = () => {
    if (selectedNote && formTitle.trim()) {
      onUpdateNote(selectedNote.id, {
        title: formTitle.trim(),
        shortDescription: formShortDesc.trim(),
        content: formContent,
        priority: formPriority,
        updatedAt: new Date(),
      });
      setSelectedNote({
        ...selectedNote,
        title: formTitle.trim(),
        shortDescription: formShortDesc.trim(),
        content: formContent,
        priority: formPriority,
        updatedAt: new Date(),
      });
      setIsEditing(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    onDeleteNote(noteId);
    setSelectedNote(null);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notas
        </h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva nota
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <SortButton field="title">Título</SortButton>
          <SortButton field="priority">Prioridad</SortButton>
          <SortButton field="createdAt">Creación</SortButton>
          <SortButton field="updatedAt">Modificación</SortButton>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay notas</p>
            <p className="text-sm">Crea tu primera nota para empezar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedNotes.map(note => (
              <button
                key={note.id}
                onClick={() => handleOpenNote(note)}
                className="text-left p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground line-clamp-1 flex-1">
                    {note.title}
                  </h3>
                  <span
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                    style={{
                      backgroundColor: `${priorityConfig[note.priority].color}20`,
                      color: priorityConfig[note.priority].color,
                    }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {priorityConfig[note.priority].label}
                  </span>
                </div>
                
                {note.shortDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {note.shortDescription}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(note.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Nueva nota
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Título</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Título de la nota..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Descripción corta</label>
                <Input
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  placeholder="Descripción breve..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Prioridad</label>
                <Select value={formPriority} onValueChange={(v: Priority) => setFormPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Contenido</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Escribe el contenido de tu nota..."
                className="w-full min-h-[200px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>
                Cancelar
              </Button>
              <Button onClick={handleAddNote} disabled={!formTitle.trim()}>
                Crear nota
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="sm:max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {isEditing ? 'Editar nota' : 'Detalle de nota'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => selectedNote && handleDeleteNote(selectedNote.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveNote}>
                      <Check className="w-4 h-4 mr-1" />
                      Guardar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {selectedNote && (
            <div className="space-y-4 pt-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Título</label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Título de la nota..."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Descripción corta</label>
                      <Input
                        value={formShortDesc}
                        onChange={(e) => setFormShortDesc(e.target.value)}
                        placeholder="Descripción breve..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Prioridad</label>
                      <Select value={formPriority} onValueChange={(v: Priority) => setFormPriority(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Contenido</label>
                    <textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Escribe el contenido de tu nota..."
                      className="w-full min-h-[300px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                      {selectedNote.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${priorityConfig[selectedNote.priority].color}20`,
                          color: priorityConfig[selectedNote.priority].color,
                        }}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {priorityConfig[selectedNote.priority].label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Creado: {format(new Date(selectedNote.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Modificado: {format(new Date(selectedNote.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  
                  {selectedNote.shortDescription && (
                    <p className="text-muted-foreground border-l-2 border-primary/50 pl-3">
                      {selectedNote.shortDescription}
                    </p>
                  )}
                  
                  <div className="bg-muted/30 rounded-lg p-4 min-h-[200px]">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                      {selectedNote.content || 'Sin contenido'}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Tag } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onAddTag: (name: string, color: string) => void;
  onUpdateTag: (tagId: string, updates: Partial<Tag>) => void;
  onDeleteTag: (tagId: string) => void;
}

const colorOptions = [
  '#EF4444', '#FB923C', '#F59E0B', '#22C55E', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#F43F5E', '#84CC16', '#14B8A6', '#0EA5E9', '#A855F7',
];

export function TagManager({
  open,
  onOpenChange,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAddTag = () => {
    if (newTagName.trim()) {
      onAddTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor('#3B82F6');
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const saveEdit = (tagId: string) => {
    if (editName.trim()) {
      onUpdateTag(tagId, { name: editName.trim(), color: editColor });
    }
    setEditingTagId(null);
  };

  const cancelEdit = () => {
    setEditingTagId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gestionar etiquetas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Tag */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Nueva etiqueta
            </label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-10 h-10 rounded-lg border border-border flex items-center justify-center"
                    style={{ backgroundColor: newTagColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        className={cn(
                          "w-6 h-6 rounded-md transition-transform hover:scale-110",
                          newTagColor === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nombre de la etiqueta..."
                className="flex-1 bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                }}
              />
              <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tag List */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Etiquetas existentes
            </label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay etiquetas creadas
                </p>
              ) : (
                tags.map(tag => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group"
                  >
                    {editingTagId === tag.id ? (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-8 h-8 rounded-md flex-shrink-0"
                              style={{ backgroundColor: editColor }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="grid grid-cols-5 gap-1">
                              {colorOptions.map(color => (
                                <button
                                  key={color}
                                  className={cn(
                                    "w-6 h-6 rounded-md transition-transform hover:scale-110",
                                    editColor === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => setEditColor(color)}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 h-8 bg-background"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(tag.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => saveEdit(tag.id)}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="w-8 h-8 rounded-md flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-sm font-medium text-foreground">
                          {tag.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => startEditing(tag)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => onDeleteTag(tag.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

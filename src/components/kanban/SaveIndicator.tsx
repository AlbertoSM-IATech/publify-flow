import { Check, Loader2, Cloud } from 'lucide-react';
import { SaveStatus } from '@/hooks/kanban';
import { cn } from '@/lib/utils';

interface SaveIndicatorProps {
  status: SaveStatus;
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-all",
        status === 'saving' && "text-muted-foreground bg-muted/50",
        status === 'saved' && "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
        status === 'error' && "text-destructive bg-destructive/10"
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Guardando...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3 h-3" />
          <span>Guardado</span>
        </>
      )}
      {status === 'error' && (
        <>
          <Cloud className="w-3 h-3" />
          <span>Error</span>
        </>
      )}
    </div>
  );
}

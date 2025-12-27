import { useState } from 'react';
import { 
  Zap, Plus, Trash2, Play, Pause, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Clock, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Automation,
  AutomationExecution,
  TRIGGER_LABELS,
  ACTION_LABELS,
} from '@/types/automation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AutomationsPanelProps {
  automations: Automation[];
  logs: AutomationExecution[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (automation: Automation) => void;
  onCreate: () => void;
}

const resultConfig = {
  applied: { icon: CheckCircle, color: 'text-green-500', label: 'Aplicada' },
  skipped_conditions: { icon: XCircle, color: 'text-muted-foreground', label: 'Condiciones no cumplidas' },
  skipped_disabled: { icon: Pause, color: 'text-muted-foreground', label: 'Desactivada' },
  skipped_no_change: { icon: Clock, color: 'text-muted-foreground', label: 'Sin cambios' },
  skipped_scope: { icon: AlertTriangle, color: 'text-amber-500', label: 'Fuera de alcance' },
  error: { icon: AlertTriangle, color: 'text-destructive', label: 'Error' },
};

export function AutomationsPanel({
  automations,
  logs,
  onToggle,
  onDelete,
  onEdit,
  onCreate,
}: AutomationsPanelProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'logs'>('list');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">Automatizaciones</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {automations.filter(a => a.enabled).length} activas
          </span>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Nueva
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'list' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab('list')}
        >
          Reglas ({automations.length})
        </button>
        <button
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'logs' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab('logs')}
        >
          Historial ({logs.length})
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'list' ? (
          <div className="p-4 space-y-3">
            {automations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay automatizaciones configuradas</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={onCreate}>
                  Crear primera automatización
                </Button>
              </div>
            ) : (
              automations.map(automation => (
                <div
                  key={automation.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors cursor-pointer",
                    automation.enabled 
                      ? "border-primary/30 bg-primary/5" 
                      : "border-border bg-muted/30"
                  )}
                  onClick={() => onEdit(automation)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{automation.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cuando: {TRIGGER_LABELS[automation.trigger.type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {automation.conditions.length} condición(es) · {automation.actions.length} acción(es)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.enabled}
                        onCheckedChange={(e) => {
                          e.stopPropagation?.();
                          onToggle(automation.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(automation.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay ejecuciones registradas</p>
              </div>
            ) : (
              logs.map(log => {
                const config = resultConfig[log.result];
                const Icon = config.icon;
                const isExpanded = expandedLog === log.id;
                
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.automationName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.taskTitle} · {config.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'HH:mm', { locale: es })}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border text-xs space-y-1">
                        <p><span className="text-muted-foreground">Trigger:</span> {TRIGGER_LABELS[log.triggerType]}</p>
                        {log.actionsApplied.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Acciones:</span>
                            <ul className="ml-4 mt-1">
                              {log.actionsApplied.map((action, i) => (
                                <li key={i}>• {ACTION_LABELS[action.type]}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {log.errorMessage && (
                          <p className="text-destructive">Error: {log.errorMessage}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

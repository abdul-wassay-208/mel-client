import { MELConfigProvider, useMELConfig } from '@/contexts/MELConfigContext';
import { HierarchyTree } from '@/components/mel-config/HierarchyTree';
import { ConfigWorkspace } from '@/components/mel-config/ConfigWorkspace';
import { FieldBuilder } from '@/components/mel-config/FieldBuilder';
import { ArrowLeft, Target, GitBranch, BarChart3, X, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function ActionButtons() {
  const { isDirty, saveDraft, publish } = useMELConfig();

  return (
    <div className="flex items-center gap-2">
      {isDirty && (
        <span className="text-[12px] text-warning font-medium mr-1">Unsaved changes</span>
      )}
      <Button variant="outline" size="sm" onClick={saveDraft} disabled={!isDirty}>
        <Save className="h-3.5 w-3.5 mr-1" />
        Save Draft
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm">
            <Upload className="h-3.5 w-3.5 mr-1" />
            Publish
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish these changes? This will make them live.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={publish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const nodeIcons = {
  objective: Target,
  outcome: GitBranch,
  indicator: BarChart3,
};

const nodeIconColors = {
  objective: 'text-primary',
  outcome: 'text-accent',
  indicator: 'text-warning',
};

function TabBar() {
  const { openTabs, selectedNode, setSelectedNode, closeTab } = useMELConfig();

  if (openTabs.length === 0) return null;

  return (
    <div className="border-b border-border bg-muted/30 shrink-0">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-0 px-2 py-1">
          {openTabs.map((tab) => {
            const isActive = selectedNode?.id === tab.node.id;
            const Icon = nodeIcons[tab.node.type as keyof typeof nodeIcons];
            const iconColor = nodeIconColors[tab.node.type as keyof typeof nodeIconColors];

            return (
              <div
                key={tab.node.id}
                className={cn(
                  'group flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-t-md cursor-pointer border border-transparent transition-all max-w-[200px] shrink-0',
                  isActive
                    ? 'bg-background border-border border-b-background text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                onClick={() => setSelectedNode(tab.node)}
                title={tab.label}
              >
                <Icon className={cn('h-3 w-3 shrink-0', isActive ? iconColor : 'text-muted-foreground')} />
                <span className="truncate">{tab.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.node.id);
                  }}
                  className={cn(
                    'p-0.5 rounded hover:bg-destructive/10 transition-colors shrink-0 ml-1',
                    isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                  )}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function BuilderContent() {
  const navigate = useNavigate();

  return (
    <div className="animate-in">
      <div className="page-header flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="page-title">MEL Configuration Builder</h1>
            <p className="page-subtitle">Define strategic objectives, outcomes, indicators, and disaggregation fields</p>
          </div>
        </div>
        <ActionButtons />
      </div>
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Left: Hierarchy Tree — ~20% */}
        <div className="w-[20%] min-w-[220px] border border-border rounded-xl bg-card overflow-hidden flex flex-col shrink-0">
          <HierarchyTree />
        </div>
        {/* Center: Config Workspace — ~55% */}
        <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          <TabBar />
          <ConfigWorkspace />
        </div>
        {/* Right: Field Builder — ~25% */}
        <div className="w-[25%] min-w-[260px] border border-border rounded-xl bg-card overflow-hidden flex flex-col shrink-0">
          <FieldBuilder />
        </div>
      </div>
    </div>
  );
}

export default function MELConfigBuilder() {
  return (
    <MELConfigProvider>
      <BuilderContent />
    </MELConfigProvider>
  );
}


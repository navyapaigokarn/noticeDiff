import { useEffect, useState } from 'react';
import { compareContent } from '@/services/diff.service';
import { sendExtensionMessage } from '@/services/extension-client';
import { formatDateTime } from '@/utils/date-utils';
import { routePath } from '@/utils/routes';
import { useChangeDetail } from '@/hooks/use-monitors';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/LoadingState';
import { DiffView, ModificationList, SideBySide } from '@/components/changes/DiffView';

export function ChangeDetailView({ changeId }: { changeId: string }) {
  const { change, monitor, previous, current, loading } = useChangeDetail(changeId);
  const [mode, setMode] = useState<'changes' | 'split'>('changes');

  useEffect(() => {
    if (change && !change.isRead) {
      void sendExtensionMessage({ type: 'MARK_CHANGE_READ', changeId: change.id });
    }
  }, [change]);

  if (loading || (change && (previous === undefined || current === undefined))) return <LoadingState label="Loading change" />;
  if (!change) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Change not found</h1>
        <a href={routePath('changes')} className="text-sm font-medium text-indigo-700">
          Back to changes
        </a>
      </div>
    );
  }

  const previousText = previous?.extractedText ?? change.removedText.join('\n');
  const currentText = current?.extractedText ?? change.addedText.join('\n');
  const diff = previous && current ? compareContent(previous.extractedText, current.extractedText) : null;

  return (
    <div className="space-y-5">
      <a href={routePath('changes')} className="text-sm font-medium text-indigo-700">
        Back to changes
      </a>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{monitor?.title ?? 'Page change'}</h1>
        <p className="mt-1 text-sm text-slate-600">{formatDateTime(change.detectedAt)}</p>
        <p className="mt-2 text-sm text-slate-800">{change.changeSummary}</p>
      </div>
      <div className="flex gap-2">
        <Button variant={mode === 'changes' ? 'default' : 'outline'} size="sm" onClick={() => setMode('changes')}>
          Changes
        </Button>
        <Button variant={mode === 'split' ? 'default' : 'outline'} size="sm" onClick={() => setMode('split')}>
          Previous and updated
        </Button>
      </div>
      {mode === 'changes' ? (
        <div className="space-y-4">
          <ModificationList items={diff?.modified ?? change.modified} />
          <DiffView previous={previousText} next={currentText} />
        </div>
      ) : (
        <SideBySide previous={previousText} next={currentText} />
      )}
    </div>
  );
}

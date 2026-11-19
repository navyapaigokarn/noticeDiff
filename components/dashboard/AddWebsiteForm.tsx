import { useEffect, useState, type FormEvent } from 'react';
import { MONITOR_INTERVALS, intervalLabel } from '@/config/monitoring';
import { ensureHostPermission } from '@/services/permission.service';
import { sendExtensionMessage } from '@/services/extension-client';
import { toUserMessage } from '@/utils/errors';
import { validatePublicUrl } from '@/utils/url-validator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorBanner, SuccessBanner } from '@/components/common/Banners';

interface AddWebsiteFormProps {
  defaultInterval: number;
  initialUrl?: string;
  initialTitle?: string;
  onAdded?: () => void;
}

export function AddWebsiteForm({ defaultInterval, initialUrl = '', initialTitle = '', onAdded }: AddWebsiteFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [intervalMinutes, setIntervalMinutes] = useState(defaultInterval);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIntervalMinutes(defaultInterval);
  }, [defaultInterval]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const validated = validatePublicUrl(url);
      await ensureHostPermission(validated.requestUrl);
      const response = await sendExtensionMessage({
        type: 'ADD_MONITOR',
        url: validated.requestUrl,
        ...(title.trim() ? { title: title.trim() } : {}),
        intervalMinutes,
      });
      setSuccess(`${response.monitor?.title ?? 'Website'} is now being monitored.`);
      setUrl('');
      setTitle('');
      onAdded?.();
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}
      <label className="block text-sm font-medium text-slate-800">
        Website address
        <Input
          className="mt-1"
          type="url"
          required
          placeholder="https://example.com/results"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Name <span className="font-normal text-slate-500">(optional)</span>
        <Input className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Exam results" />
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Check frequency
        <Select className="mt-1" value={intervalMinutes} onChange={(event) => setIntervalMinutes(Number(event.target.value))}>
          {MONITOR_INTERVALS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {intervalLabel(minutes)}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving baseline…' : 'Start monitoring'}
      </Button>
    </form>
  );
}

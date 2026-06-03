import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import type { LocationEmail, ContactType } from '@/lib/types';

/** Small repeater for email contacts (frate / suora). */
export function EmailsRepeater({
  emails,
  onChange,
  disabled = false,
}: {
  emails: LocationEmail[];
  onChange: (v: LocationEmail[]) => void;
  disabled?: boolean;
}) {
  const add = () => onChange([...emails, { type: 'frate', email: '' }]);
  const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<LocationEmail>) =>
    onChange(emails.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-3">
      {emails.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={entry.type}
            onChange={(e) => update(i, { type: e.target.value as ContactType })}
            disabled={disabled}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="frate">Frate</option>
            <option value="suora">Suora</option>
          </select>
          <Input
            type="email"
            placeholder="email@example.com"
            value={entry.email}
            onChange={(e) => update(i, { email: e.target.value })}
            disabled={disabled}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} disabled={disabled}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
        <Plus className="mr-1 h-4 w-4" /> Aggiungi contatto
      </Button>
    </div>
  );
}

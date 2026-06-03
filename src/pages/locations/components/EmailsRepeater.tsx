import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import type { LocationEmail, ContactType } from '@/lib/types';

/** Small repeater for email contacts (frate / suora). */
export function EmailsRepeater({
  emails,
  onChange,
}: {
  emails: LocationEmail[];
  onChange: (v: LocationEmail[]) => void;
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
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="frate">Frate</option>
            <option value="suora">Suora</option>
          </select>
          <Input
            type="email"
            placeholder="email@example.com"
            value={entry.email}
            onChange={(e) => update(i, { email: e.target.value })}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> Aggiungi contatto
      </Button>
    </div>
  );
}

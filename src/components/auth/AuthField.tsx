import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AuthFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  autoComplete?: string;
}

/** Campo input coerente per le schermate auth: icona a sinistra, focus dorato,
 *  toggle mostra/nascondi per le password. */
export function AuthField({
  id, label, icon: Icon, value, onChange, type = 'text', placeholder, autoComplete,
}: AuthFieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-brown-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-400" />
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="h-11 w-full rounded-lg border border-brown-200 bg-white/70 pl-10 pr-10 text-brown-900
                     outline-none transition placeholder:text-brown-400/60
                     focus:border-[#A67D51] focus:ring-2 focus:ring-[#A67D51]/30"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Nascondi password' : 'Mostra password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-brown-400
                       transition hover:text-brown-700"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

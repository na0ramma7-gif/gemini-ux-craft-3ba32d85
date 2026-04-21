import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface CreatableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: string[];
  /** Called when user creates a new value. Should return the canonical stored value (or null if rejected). */
  onCreate: (value: string) => string | null;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  addNewLabel?: string;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

export const CreatableSelect = ({
  value,
  onChange,
  options,
  onCreate,
  placeholder = 'Select…',
  searchPlaceholder = 'Search or type to add…',
  emptyText = 'No matches',
  addNewLabel = 'Add',
  minLength = 2,
  maxLength = 200,
  disabled,
  className,
}: CreatableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const lowerOptions = useMemo(
    () => new Set(options.map(o => o.toLowerCase())),
    [options],
  );
  const exactMatch = trimmed && lowerOptions.has(trimmed.toLowerCase());
  const canCreate = trimmed.length >= minLength && !exactMatch;

  const handleCreate = () => {
    if (trimmed.length < minLength) {
      setError(`Must be at least ${minLength} characters`);
      return;
    }
    if (trimmed.length > maxLength) {
      setError(`Must be ${maxLength} characters or fewer`);
      return;
    }
    const created = onCreate(trimmed);
    if (created) {
      onChange(created);
      setQuery('');
      setError(null);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuery(''); setError(null); } }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between rounded-md font-normal h-10 px-3',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[260px]"
        align="start"
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={(v) => { setQuery(v); setError(null); }}
            maxLength={maxLength}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed.length === 0 ? emptyText : `No match for "${trimmed}"`}
            </CommandEmpty>
            {options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === opt ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {canCreate && (
            <div className="border-t p-2 space-y-1">
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="truncate">{addNewLabel} "{trimmed}"</span>
              </button>
              {error && <p className="px-2 text-xs text-destructive">{error}</p>}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CreatableSelect;

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;       // stable id (string)
  label: string;       // display title
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];                              // selected ids
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable multi-select with chip display. Built on Command + Popover.
 * Value is a list of stable string IDs.
 */
export function MultiSelect({
  options, value, onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  disabled, className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const selectedOptions = React.useMemo(
    () => value.map(v => options.find(o => o.value === v)).filter(Boolean) as MultiSelectOption[],
    [value, options],
  );

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter(v => v !== id));
    else onChange([...value, id]);
  };

  const remove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(value.filter(v => v !== id));
  };

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full min-h-10 h-auto justify-between font-normal py-1.5"
          >
            <div className="flex flex-wrap gap-1 items-center text-left">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              ) : (
                selectedOptions.map(o => (
                  <Badge key={o.value} variant="secondary" className="text-xs gap-1 pr-1">
                    <span className="max-w-[160px] truncate">{o.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); remove(o.value, e); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') remove(o.value); }}
                      className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                      aria-label={`Remove ${o.label}`}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map(o => {
                  const selected = selectedSet.has(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={`${o.label} ${o.description ?? ''}`}
                      onSelect={() => toggle(o.value)}
                      className="flex items-start gap-2"
                    >
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{o.label}</span>
                        {o.description && (
                          <span className="text-[11px] text-muted-foreground line-clamp-2">{o.description}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default MultiSelect;
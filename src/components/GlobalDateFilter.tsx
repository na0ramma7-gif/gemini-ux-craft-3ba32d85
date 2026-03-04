import { useApp, DateFilter } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Globe, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const GlobalDateFilter = () => {
  const { dateFilter, setDateFilter, language, setLanguage, t, isRTL } = useApp();

  const DatePickerField = ({
    label,
    date,
    onChange,
  }: {
    label: string;
    date: Date;
    onChange: (d: Date) => void;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 text-xs font-normal gap-1.5 border-border bg-card",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          {date ? format(date, "dd MMM yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Primary period */}
      <div className="flex items-center gap-1.5 bg-secondary/60 rounded-lg px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">{t('primaryPeriod')}:</span>
        <DatePickerField
          label={t('startDate')}
          date={dateFilter.startDate}
          onChange={(d) => setDateFilter(prev => ({ ...prev, startDate: d }))}
        />
        <span className="text-xs text-muted-foreground">→</span>
        <DatePickerField
          label={t('endDate')}
          date={dateFilter.endDate}
          onChange={(d) => setDateFilter(prev => ({ ...prev, endDate: d }))}
        />
      </div>

      {/* Compare toggle */}
      <div className="flex items-center gap-1.5">
        <Switch
          checked={dateFilter.compareEnabled}
          onCheckedChange={(v) => setDateFilter(prev => ({ ...prev, compareEnabled: v }))}
          className="scale-75"
        />
        <span className="text-xs text-muted-foreground">{t('comparePeriod')}</span>
      </div>

      {/* Comparison period */}
      {dateFilter.compareEnabled && (
        <div className="flex items-center gap-1.5 bg-accent/5 rounded-lg px-2 py-1 border border-accent/20">
          <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
          <DatePickerField
            label={t('startDate')}
            date={dateFilter.compareStartDate}
            onChange={(d) => setDateFilter(prev => ({ ...prev, compareStartDate: d }))}
          />
          <span className="text-xs text-muted-foreground">→</span>
          <DatePickerField
            label={t('endDate')}
            date={dateFilter.compareEndDate}
            onChange={(d) => setDateFilter(prev => ({ ...prev, compareEndDate: d }))}
          />
        </div>
      )}

      {/* Language Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        className="h-8 gap-1.5 text-xs"
      >
        <Globe className="w-3.5 h-3.5" />
        {language === 'en' ? 'العربية' : 'English'}
      </Button>
    </div>
  );
};

export default GlobalDateFilter;
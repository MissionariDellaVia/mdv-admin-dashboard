import { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Gospel } from '@/lib/types';

interface GospelSelectorProps {
  gospels: Gospel[];
  value?: number;
  onChange: (gospelId: number) => void;
  error?: string;
}

export function GospelSelector({ gospels, value, onChange, error }: GospelSelectorProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredGospels = useMemo(() => {
    if (!search.trim()) return gospels;
    const searchLower = search.toLowerCase();
    return gospels.filter(g =>
      g.reference.toLowerCase().includes(searchLower) ||
      g.evangelist.toLowerCase().includes(searchLower) ||
      g.text.toLowerCase().includes(searchLower)
    );
  }, [gospels, search]);

  const selectedGospel = gospels.find(g => g.id === value);

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 border rounded-md cursor-pointer bg-background",
            error ? 'border-red-500' : 'border-input',
            isOpen && 'ring-2 ring-ring ring-offset-2'
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={selectedGospel ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedGospel ? selectedGospel.reference + " - " + selectedGospel.evangelist : 'Seleziona un vangelo...'}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b sticky top-0 bg-popover">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per riferimento, evangelista o testo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Gospel list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredGospels.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nessun vangelo trovato
                </div>
              ) : (
                filteredGospels.map((gospel) => (
                  <div
                    key={gospel.id}
                    className={cn(
                      "px-3 py-2 cursor-pointer hover:bg-accent transition-colors border-b last:border-b-0",
                      value === gospel.id && "bg-accent"
                    )}
                    onClick={() => {
                      onChange(gospel.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-mdv-light flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{gospel.reference}</div>
                        <div className="text-xs text-muted-foreground">{gospel.evangelist}</div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {gospel.text.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Preview */}
      {selectedGospel && (
        <Card className="border-mdv-light/30 bg-mdv-dark/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-mdv-medium">
              <BookOpen className="h-5 w-5 text-mdv-light" />
              {selectedGospel.reference}
              <span className="text-sm font-normal text-muted-foreground">
                ({selectedGospel.evangelist})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-h-60 overflow-y-auto text-mdv-dark"
              dangerouslySetInnerHTML={{ __html: selectedGospel.text }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface Donor {
  id: string;
  display: string;
}

interface DonorSearchProps {
  onSelect: (donorId: string) => void;
  onSearch: (query: string) => Promise<Donor[]>;
}

export function DonorSearch({ onSelect, onSearch }: DonorSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setDonors([]);
      return;
    }

    setLoading(true);
    try {
      const results = await onSearch(value);
      setDonors(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start text-left font-normal"
        >
          <Search className="mr-2 h-4 w-4 shrink-0" />
          <span className="text-muted-foreground">Search donors...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, email, or phone..."
            value={query}
            onValueChange={handleSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : donors.length === 0 && query.length >= 2 ? (
              <CommandEmpty>No donors found.</CommandEmpty>
            ) : donors.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type to search...
              </div>
            ) : (
              <CommandGroup>
                {donors.map((donor) => (
                  <CommandItem
                    key={donor.id}
                    value={donor.id}
                    onSelect={() => {
                      onSelect(donor.id);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    {donor.display}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

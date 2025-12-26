import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

export function CurrencyToggle() {
  const { currency, setCurrency } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrency(currency === 'USD' ? 'ILS' : 'USD')}
      className="gap-2"
      title={currency === 'USD' ? 'Switch to Israeli (₪)' : 'Switch to American ($)'}
    >
      <DollarSign className="h-4 w-4" />
      {currency === 'USD' ? 'US' : 'IL'}
    </Button>
  );
}

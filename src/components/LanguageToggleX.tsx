import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
      className="gap-2"
    >
      <Globe className="h-4 w-4" />
      {language === 'he' ? 'EN' : 'עב'}
    </Button>
  );
}

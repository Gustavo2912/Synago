import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    receiptFormat: 'BN-{YEAR}-{SEQUENCE}',
    surchargeEnabled: false,
    surchargePercent: 0,
    surchargeFixed: 0,
    defaultCurrency: 'ILS',
    zelleName: '',
    zelleEmailOrPhone: '',
    zelleNote: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          receiptFormat: data.receipt_format || 'BN-{YEAR}-{SEQUENCE}',
          surchargeEnabled: data.surcharge_enabled || false,
          surchargePercent: Number(data.surcharge_percent) || 0,
          surchargeFixed: data.surcharge_fixed ? Number(data.surcharge_fixed) : 0,
          defaultCurrency: data.default_currency || 'ILS',
          zelleName: data.zelle_name || '',
          zelleEmailOrPhone: data.zelle_email_or_phone || '',
          zelleNote: data.zelle_note || '',
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      const payload = {
        receipt_format: settings.receiptFormat,
        surcharge_enabled: settings.surchargeEnabled,
        surcharge_percent: settings.surchargePercent,
        surcharge_fixed: settings.surchargeFixed || null,
        default_currency: settings.defaultCurrency,
        zelle_name: settings.zelleName || null,
        zelle_email_or_phone: settings.zelleEmailOrPhone || null,
        zelle_note: settings.zelleNote || null,
      };

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update(payload)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert(payload);

        if (error) throw error;
      }

      toast.success(t('settings.saveSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('settings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-8 max-w-4xl mx-auto relative ${language === 'he' ? 'text-right' : ''}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">{t('settings.title')}</h1>
        <p className="text-muted-foreground text-lg">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="general" className="animate-fade-up">
        <TabsList className="mb-8 bg-card/50 border border-border/50 p-1">
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="receipts">{t('settings.receipts')}</TabsTrigger>
          <TabsTrigger value="payment">{t('settings.payment')}</TabsTrigger>
          <TabsTrigger value="zelle">{t('settings.zelle')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">{t('settings.general')}</CardTitle>
              <CardDescription>{t('settings.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currency">{t('settings.currency')}</Label>
                <Select
                  value={settings.defaultCurrency}
                  onValueChange={(value) => setSettings({ ...settings, defaultCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ILS">ILS (₪) - Israeli Shekel</SelectItem>
                    <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                    <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD ($) - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD ($) - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  This will be the default currency for all donations in your organization
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">{t('settings.receipts')}</CardTitle>
              <CardDescription>{t('settings.receiptFormat')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="receiptFormat">{t('settings.receiptFormat')}</Label>
                <Input
                  id="receiptFormat"
                  value={settings.receiptFormat}
                  onChange={(e) => setSettings({ ...settings, receiptFormat: e.target.value })}
                  placeholder="BN-{YEAR}-{SEQUENCE}"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Use {'{YEAR}'} for year and {'{SEQUENCE}'} for sequential number
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">{t('settings.payment')}</CardTitle>
              <CardDescription>{t('settings.surcharge')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.surcharge')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.surcharge')}
                  </p>
                </div>
                <Switch
                  checked={settings.surchargeEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, surchargeEnabled: checked })
                  }
                />
              </div>

              {settings.surchargeEnabled && (
                <>
                  <div>
                    <Label htmlFor="surchargePercent">{t('settings.surchargePercent')}</Label>
                    <Input
                      id="surchargePercent"
                      type="number"
                      step="0.01"
                      value={settings.surchargePercent}
                      onChange={(e) =>
                        setSettings({ ...settings, surchargePercent: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="surchargeFixed">{t('settings.surchargeFixed')}</Label>
                    <Input
                      id="surchargeFixed"
                      type="number"
                      step="0.01"
                      value={settings.surchargeFixed}
                      onChange={(e) =>
                        setSettings({ ...settings, surchargeFixed: Number(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zelle">
          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">{t('settings.zelle')}</CardTitle>
              <CardDescription>{t('settings.zelle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="zelleName">Recipient Name</Label>
                <Input
                  id="zelleName"
                  value={settings.zelleName}
                  onChange={(e) => setSettings({ ...settings, zelleName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="zelleEmailOrPhone">Email or Phone</Label>
                <Input
                  id="zelleEmailOrPhone"
                  value={settings.zelleEmailOrPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, zelleEmailOrPhone: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="zelleNote">Note/Memo</Label>
                <Input
                  id="zelleNote"
                  value={settings.zelleNote}
                  onChange={(e) => setSettings({ ...settings, zelleNote: e.target.value })}
                  placeholder="Optional note for donors"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary hover:opacity-90 transition-all shadow-lg hover:shadow-glow">
          {loading ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </div>
  );
}

// src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import ScholarPlansSettings from '@/components/ScholarPlansSettings';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from '@/components/ui/select';

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

export default function Settings() {
  const { t, language } = useLanguage();
  const { organizationId } = useUser();

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

  /* ---------------------------------------
     LOAD SETTINGS
  --------------------------------------- */
  useEffect(() => {
    fetchSettings();
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId || organizationId === "all") return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          receiptFormat: data.receipt_format ?? 'BN-{YEAR}-{SEQUENCE}',
          surchargeEnabled: data.surcharge_enabled ?? false,
          surchargePercent: data.surcharge_percent ? Number(data.surcharge_percent) : 0,
          surchargeFixed: data.surcharge_fixed ? Number(data.surcharge_fixed) : 0,
          defaultCurrency: data.default_currency ?? 'ILS',
          zelleName: data.zelle_name ?? '',
          zelleEmailOrPhone: data.zelle_email_or_phone ?? '',
          zelleNote: data.zelle_note ?? '',
        });
      } else {
        // No settings found — set defaults for new org
        setSettings({
          receiptFormat: 'BN-{YEAR}-{SEQUENCE}',
          surchargeEnabled: false,
          surchargePercent: 0,
          surchargeFixed: 0,
          defaultCurrency: 'ILS',
          zelleName: '',
          zelleEmailOrPhone: '',
          zelleNote: '',
        });
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    }
  };

  /* ---------------------------------------
     SAVE SETTINGS
  --------------------------------------- */
  const handleSave = async () => {
    if (!organizationId || organizationId === "all") {
      toast.error("Organization ID missing");
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq("organization_id", organizationId)
        .maybeSingle();

      const payload = {
        organization_id: organizationId,
        receipt_format: settings.receiptFormat,
        surcharge_enabled: settings.surchargeEnabled,
        surcharge_percent: settings.surchargePercent,
        surcharge_fixed: settings.surchargeFixed || null,
        default_currency: settings.defaultCurrency,
        zelle_name: settings.zelleName || null,
        zelle_email_or_phone: settings.zelleEmailOrPhone || null,
        zelle_note: settings.zelleNote || null,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('settings')
          .update(payload)
          .eq('id', existing.id)
          .select();          // <— IMPORTANT: return updated row

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert(payload)
          .select();          // <— IMPORTANT: return inserted row

        if (error) throw error;
      }

      // Reload fresh settings after save
      await fetchSettings();

      toast.success(t('settings.saveSuccess'));

    } catch (error: any) {
      toast.error(error.message || t('settings.saveFailed'));

    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------
     RENDER UI
  --------------------------------------- */
  return (
    <div className={`p-8 max-w-4xl mx-auto relative ${language === 'he' ? 'text-right' : ''}`}>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-8 bg-card/50 border border-border/50 p-1">
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="receipts">{t('settings.receipts')}</TabsTrigger>
          <TabsTrigger value="payment">{t('settings.payment')}</TabsTrigger>
          <TabsTrigger value="zelle">{t('settings.zelle')}</TabsTrigger>
          <TabsTrigger value="scholar-plans">Scholar Plans</TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general')}</CardTitle>
              <CardDescription>{t('settings.subtitle')}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currency">{t('settings.currency')}</Label>
                <Select
                  value={settings.defaultCurrency}
                  onValueChange={(value) =>
                    setSettings({ ...settings, defaultCurrency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="ILS">ILS (₪)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Default currency for donations, pledges & receipts.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECEIPTS */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.receipts')}</CardTitle>
              <CardDescription>{t('settings.receiptFormat')}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Label>{t('settings.receiptFormat')}</Label>
              <Input
                value={settings.receiptFormat}
                onChange={(e) =>
                  setSettings({ ...settings, receiptFormat: e.target.value })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT TAB */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.payment')}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('settings.surcharge')}</Label>
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
                    <Label>{t('settings.surchargePercent')}</Label>
                    <Input
                      type="number"
                      value={settings.surchargePercent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          surchargePercent: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t('settings.surchargeFixed')}</Label>
                    <Input
                      type="number"
                      value={settings.surchargeFixed}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          surchargeFixed: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ZELLE TAB */}
        <TabsContent value="zelle">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.zelle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Recipient Name</Label>
                <Input
                  value={settings.zelleName}
                  onChange={(e) =>
                    setSettings({ ...settings, zelleName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Email or Phone</Label>
                <Input
                  value={settings.zelleEmailOrPhone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      zelleEmailOrPhone: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Note / Memo</Label>
                <Input
                  value={settings.zelleNote}
                  onChange={(e) =>
                    setSettings({ ...settings, zelleNote: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHOLAR PLANS TAB */}
        <TabsContent value="scholar-plans">
          {organizationId === "all" ? (
            <div className="text-center text-muted-foreground p-6">
              Select a specific organization to manage scholar plans.
            </div>
          ) : (
            <ScholarPlansSettings />
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-primary text-white shadow-lg"
        >
          {loading ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useCreateDonor } from "@/hooks/useManageDonor";
import { supabase } from "@/integrations/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AddDonorDialog({ open, onClose }: any) {
  const { organizationId, isGlobalSuperAdmin } = useUser();
  const { t } = useLanguage();
  const createDonor = useCreateDonor();

  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  const [form, setForm] = useState({
    display_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address_city: "",
  });

  // Load org list
  useEffect(() => {
    if (isGlobalSuperAdmin) {
      supabase
        .from("organizations")
        .select("id,name")
        .then(({ data }) => setOrgs(data || []));
    }
  }, [isGlobalSuperAdmin]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm({
        display_name: "",
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        address_city: "",
      });
      setSelectedOrgs(isGlobalSuperAdmin ? [] : [organizationId]);
    }
  }, [open]);

  const save = async () => {
    await createDonor.mutateAsync({
      ...form,
      organizations: selectedOrgs,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("donors.add")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            placeholder="Display name"
            value={form.display_name}
            onChange={(e) =>
              setForm({ ...form, display_name: e.target.value })
            }
          />
          <Input
            placeholder="First name"
            value={form.first_name}
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
          />
          <Input
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) =>
              setForm({ ...form, last_name: e.target.value })
            }
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
          <Input
            placeholder="City"
            value={form.address_city}
            onChange={(e) =>
              setForm({ ...form, address_city: e.target.value })
            }
          />

          {/* Super admin only: Add multi-org selection */}
          {isGlobalSuperAdmin && (
            <div>
              <div className="text-sm font-medium mb-2">Organizations:</div>
              {orgs.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 mb-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedOrgs.includes(o.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrgs([...selectedOrgs, o.id]);
                      } else {
                        setSelectedOrgs(
                          selectedOrgs.filter((x) => x !== o.id)
                        );
                      }
                    }}
                  />
                  {o.name}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save}>{t("common.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

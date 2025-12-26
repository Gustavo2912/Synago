import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizations } from "@/hooks/useOrganizations";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Organization = Tables<"organizations">;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
}

/* -------------------------------------------------------
   FORM TYPES
------------------------------------------------------- */
type SubscriptionTier = "tier_1" | "tier_2" | "tier_3" | "tier_4";
type SubscriptionStatus = "active" | "inactive";

type FormValues = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  member_count: number; // Estimated members
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  logo_url: string;
};

/* -------------------------------------------------------
   TIER CALCULATION (SINGLE SOURCE OF TRUTH)
------------------------------------------------------- */
function calculateTier(memberCount: number): SubscriptionTier {
  if (memberCount <= 50) return "tier_1";
  if (memberCount <= 100) return "tier_2";
  if (memberCount <= 250) return "tier_3";
  return "tier_4";
}

export function OrganizationDialog({
  open,
  onOpenChange,
  organization,
}: OrganizationDialogProps) {
  const { updateOrganization } = useOrganizations();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      member_count: 0,
      subscription_tier: "tier_1",
      subscription_status: "inactive",
      logo_url: "",
    },
  });

  const memberCount = watch("member_count");

  /* -------------------------------------------------------
     AUTO-UPDATE TIER WHEN MEMBER ESTIMATE CHANGES
  ------------------------------------------------------- */
  useEffect(() => {
    if (!memberCount || memberCount <= 0) return;
    setValue("subscription_tier", calculateTier(memberCount));
  }, [memberCount, setValue]);

  /* -------------------------------------------------------
     LOAD ORGANIZATION (EDIT MODE)
  ------------------------------------------------------- */
  useEffect(() => {
    if (organization) {
      reset({
        name: organization.name ?? "",
        address: organization.address ?? "",
        city: organization.city ?? "",
        state: organization.state ?? "",
        zip: organization.zip ?? "",
        country: organization.country ?? "",
        contact_name: organization.contact_name ?? "",
        contact_email: organization.contact_email ?? "",
        contact_phone: organization.contact_phone ?? "",
        member_count: organization.member_count ?? 0,
        subscription_tier: organization.subscription_tier,
        subscription_status:
          (organization.subscription_status as SubscriptionStatus) ??
          "inactive",
        logo_url: organization.logo_url ?? "",
      });
    } else {
      reset();
    }
  }, [organization, reset]);

  /* -------------------------------------------------------
     SUBMIT
  ------------------------------------------------------- */
  const onSubmit = async (data: FormValues) => {
    try {
      // 🔒 enforce tier correctness on submit
      const finalTier = calculateTier(data.member_count);

      if (organization) {
        // UPDATE
        await updateOrganization.mutateAsync({
          id: organization.id,
          updates: {
            ...data,
            subscription_tier: finalTier,
          },
        });
      } else {
        // CREATE via Edge Function
        const payload = {
          organizationName: data.name,
          contactName: data.contact_name,
          contactEmail: data.contact_email,
          contactPhone: data.contact_phone,
          city: data.city,
          state: data.state,
          country: data.country,
          memberCount: Number(data.member_count),
          subscriptionTier: finalTier,
          subscriptionStatus: data.subscription_status,
          adminEmail: data.contact_email,
          adminPassword: crypto.randomUUID().slice(0, 10),
        };

        const { error, data: resp } =
          await supabase.functions.invoke("register-organization", {
            body: payload,
          });

        if (error) throw new Error(error.message);
        if (resp?.error) throw new Error(resp.error);
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {organization ? "Edit Organization" : "Add Organization"}
          </DialogTitle>
          <DialogDescription>
            Manage organization details, subscription and status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* BASIC INFO */}
          <div className="space-y-2">
            <Label>Organization Name *</Label>
            <Input {...register("name", { required: true })} />
          </div>

          {/* CONTACT */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Name</Label>
              <Input {...register("contact_name")} />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" {...register("contact_email")} />
            </div>
          </div>

          <div>
            <Label>Contact Phone</Label>
            <Input {...register("contact_phone")} />
          </div>

          {/* LOCATION */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input {...register("city")} />
            </div>
            <div>
              <Label>State</Label>
              <Input {...register("state")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input {...register("country")} />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input {...register("zip")} />
            </div>
          </div>

          {/* SUBSCRIPTION */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Estimated Members</Label>
              <Input
                type="number"
                min={1}
                {...register("member_count", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label>Subscription Tier</Label>
              <Input
                value={calculateTier(memberCount || 0)}
                disabled
              />
            </div>
          </div>

          {/* STATUS */}
          <div>
            <Label>Organization Status</Label>
            <Select
              value={watch("subscription_status")}
              onValueChange={(v) =>
                setValue("subscription_status", v as SubscriptionStatus)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {organization ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

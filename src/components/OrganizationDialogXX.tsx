// src/components/OrganizationDialog.tsx
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
  subscription_tier: "tier_1" | "tier_2" | "tier_3" | "tier_4";
  subscription_status: string;
  member_count: number;
  logo_url: string;
};

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
      subscription_tier: "tier_1",
      subscription_status: "active",
      member_count: 0,
      logo_url: "",
    },
  });

  const memberCount = watch("member_count");
  const subscriptionTier = watch("subscription_tier");

  /* -------------------------------------------------------
     AUTO TIER BY MEMBER COUNT (UNCHANGED)
  ------------------------------------------------------- */
  useEffect(() => {
    if (!memberCount) return;

    let tier: FormValues["subscription_tier"];
    if (memberCount <= 50) tier = "tier_1";
    else if (memberCount <= 100) tier = "tier_2";
    else if (memberCount <= 250) tier = "tier_3";
    else tier = "tier_4";

    setValue("subscription_tier", tier);
  }, [memberCount, setValue]);

  /* -------------------------------------------------------
     LOAD ORGANIZATION INTO FORM
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
        subscription_tier: organization.subscription_tier,
        subscription_status: organization.subscription_status,
        member_count: organization.member_count,
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
      if (organization) {
        // UPDATE (RLS)
        await updateOrganization.mutateAsync({
          id: organization.id,
          updates: data,
        });
      } else {
        // CREATE (Edge Function)
        const payload = {
          organizationName: data.name,
          contactName: data.contact_name,
          contactEmail: data.contact_email,
          contactPhone: data.contact_phone,
          city: data.city,
          state: data.state,
          country: data.country,
          memberCount: Number(data.member_count),
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
            Manage organization details and subscription settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name *</Label>
            <Input {...register("name", { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input {...register("contact_name")} />
            </div>

            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" {...register("contact_email")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input {...register("contact_phone")} />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...register("address")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...register("state")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Input {...register("country")} />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input {...register("zip")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select
                value={subscriptionTier}
                onValueChange={(v) =>
                  setValue("subscription_tier", v as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier_1">Basic (≤ 50)</SelectItem>
                  <SelectItem value="tier_2">Standard (≤ 100)</SelectItem>
                  <SelectItem value="tier_3">Professional (≤ 250)</SelectItem>
                  <SelectItem value="tier_4">Enterprise (250+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Member Count</Label>
              <Input
                type="number"
                {...register("member_count", { valueAsNumber: true })}
              />
            </div>
          </div>

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

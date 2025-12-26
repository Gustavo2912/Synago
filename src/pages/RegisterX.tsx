import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CurrencyToggle } from "@/components/CurrencyToggle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ArrowLeft } from "lucide-react";
import { z } from "zod";

/* ---------------- VALIDATION ---------------- */
const registrationSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  zipCode: z.string().trim().min(3, "Zip code is required"),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  memberCount: z.number().min(1, "Member count must be at least 1"),
  adminEmail: z.string().trim().email("Invalid admin email"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
});

/* ---------------- COMPONENT ---------------- */
export default function Register() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  /* 🔒 תמיד מתחילים מערכים ריקים */
  const [formData, setFormData] = useState({
    organizationName: "",
    address: "",
    city: "",
    zipCode: "",
    state: "",
    country: "",
    memberCount: 50,
    adminEmail: "",
    adminPassword: "",
  });

  /* 🔒 ניקוי session קודם כדי למנוע autofill */
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = registrationSchema.parse(formData);
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "register-organization",
        {
          body: validated,
        }
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(
        t("register.success") ||
          "Organization registered. You can now sign in as administrator."
      );

      navigate("/auth");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />

      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <CurrencyToggle />
        <LanguageToggle />
      </div>

      <Button
        variant="ghost"
        onClick={() => navigate("/auth")}
        className="absolute top-4 left-4 z-20"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("register.backToLogin") || "Back to login"}
      </Button>

      <Card className="w-full max-w-2xl shadow-glow bg-card/95 relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl mt-4">
            {t("register.title") || "Register Organization"}
          </CardTitle>
          <CardDescription>
            {t("register.subtitle") ||
              "Create your organization and administrator account"}
          </CardDescription>
        </CardHeader>

        <CardContent className={language === "he" ? "text-right" : "text-left"}>
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* -------- Organization Info -------- */}
            <div className="space-y-4">
              <h3 className="font-semibold">Organization Information</h3>

              <Label>Organization Name *</Label>
              <Input
                value={formData.organizationName}
                onChange={(e) =>
                  handleChange("organizationName", e.target.value)
                }
              />

              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>City *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Zip Code *</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => handleChange("zipCode", e.target.value)}
                  />
                </div>

                <div>
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                  />
                </div>
              </div>

              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
              />

              <Label>Estimated Members *</Label>
              <Input
                type="number"
                min={1}
                value={formData.memberCount}
                onChange={(e) =>
                  handleChange("memberCount", Number(e.target.value))
                }
              />
            </div>

            {/* -------- Contact Person -------- */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Contact Person</h3>

              <Label>Contact Name *</Label>
                <Input
                  value={formData.contactName}
                  onChange={(e) => handleChange("contactName", e.target.value)}
                />
              
              <Label>Contact Phone *</Label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) => handleChange("contactPhone", e.target.value)}
                />
              
              <Label>Contact Email *</Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                />
            </div>

            {/* -------- Admin Account -------- */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Administrator Account</h3>

              <p className="text-sm text-muted-foreground">
                This email and password will be used to sign in as the organization
                administrator.
              </p>

              <Label>Admin Email *</Label>
              <Input
                type="email"
                autoComplete="new-email"
                value={formData.adminEmail}
                onChange={(e) =>
                  handleChange("adminEmail", e.target.value)
                }
              />

              <Label>Password *</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={formData.adminPassword}
                onChange={(e) =>
                  handleChange("adminPassword", e.target.value)
                }
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
            >
              {loading
                ? t("register.creating") || "Creating…"
                : t("register.submit") || "Register"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// src/pages/Auth.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

import { Lock, Home } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function Auth() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* 🔒 חשוב: נקה session קודם */
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  /* ---------- PASSWORD LOGIN ---------- */
  const handleLogin = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("auth.emailPlaceholder") || "Enter a valid email");
      return;
    }

    if (!password.trim()) {
      toast.error(t("register.adminPassword") || "Password is required");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success(t("auth.loggedIn") || "Logged in successfully");
      navigate("/home");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">

      {/* LANG */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      {/* BACK TO HOME */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-sm opacity-80 hover:opacity-100"
        >
          <Home className="w-4 h-4 mr-1" />
          {language === "he" ? "חזרה לדף הבית" : "Back to Home"}
        </Button>
      </div>

      {/* AUTH CARD */}
      <Card className="w-full max-w-md shadow-xl backdrop-blur bg-white/90">
        <CardHeader className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-md">
            <Lock className="w-10 h-10 text-white" />
          </div>

          <CardTitle className="text-3xl font-bold mt-2">
            {t("app.title")}
          </CardTitle>

          <CardDescription>
            {language === "he"
              ? "כניסה למערכת"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>

        <CardContent
          className={`${language === "he" ? "text-right" : ""} space-y-6`}
        >
          {/* LOGIN FORM */}
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="username"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>{t("register.adminPassword") || "Password"}</Label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 font-semibold"
            >
              {loading
                ? t("common.loading") || "Signing in…"
                : t("auth.login") || "Sign In"}
            </Button>
          </div>

          {/* REGISTER ORG */}
          <div className="pt-4 border-t text-center space-y-2">
            <p className="text-sm opacity-70">
              {language === "he"
                ? "אין לך ארגון במערכת?"
                : "Don’t have an organization yet?"}
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/register")}
            >
              {language === "he"
                ? "הקמת ארגון חדש"
                : "Create New Organization"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

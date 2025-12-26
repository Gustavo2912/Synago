// src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

import { Mail, Lock, CheckCircle, Home } from "lucide-react";
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
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [password, setPassword] = useState("");

  // ---------- MAGIC LINK ----------
  const handleMagicLink = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("auth.emailPlaceholder"));
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success(t("auth.magicLinkSent"));
    } catch (err: any) {
      toast.error(err.message || "Error sending magic link");
    } finally {
      setLoading(false);
    }
  };

  // ---------- PASSWORD LOGIN ----------
  const handlePasswordLogin = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("auth.emailPlaceholder"));
      return;
    }
    if (!password.trim()) {
      toast.error(t("register.adminPassword"));
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Logged in!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">

      {/* LANG */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
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
      <Card className="w-full max-w-md shadow-xl backdrop-blur bg-white/80">
        <CardHeader className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-md">
            <Mail className="w-10 h-10 text-white" />
          </div>

          <CardTitle className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("app.title")}
          </CardTitle>

          <CardDescription>{t("auth.signIn")}</CardDescription>
        </CardHeader>

        {/* CONTENT */}
        <CardContent className={`${language === "he" ? "text-right" : ""} space-y-6`}>

          {/* MAGIC LINK SECTION */}
          {!emailSent ? (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleMagicLink()}
                />
              </div>

              <Button
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full h-12 font-semibold bg-gradient-to-r from-primary to-accent text-white"
              >
                {loading ? "..." : t("auth.sendCode")}
              </Button>

              {/* PASSWORD LOGIN LINK */}
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowPasswordLogin(true)}
                  className="text-sm text-primary underline opacity-80 hover:opacity-100"
                >
                  <Lock className="inline w-4 h-4 mr-1" />
                  {language === "he"
                    ? "כניסה עם סיסמה (למנהלים)"
                    : "Login with password (Admins)"}
                </button>
              </div>
            </>
          ) : (
            // MAGIC LINK SENT CONFIRMATION
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-500 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-xl font-bold">{t("auth.checkEmail")}</h3>

              <p className="text-muted-foreground">{t("auth.magicLinkSent")}</p>

              <div className="px-4 py-2 bg-primary/10 rounded-lg font-semibold">{email}</div>

              <p className="text-muted-foreground">{t("auth.clickLink")}</p>

              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full"
              >
                {t("auth.resendCode")}
              </Button>
            </div>
          )}

          {/* PASSWORD LOGIN FORM */}
          {showPasswordLogin && (
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {t("auth.passwordLogin")}
              </h3>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("register.adminPassword")}</Label>
                <Input
                  type="password"
                  placeholder="*******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handlePasswordLogin()}
                />
              </div>

              <Button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="w-full h-12 bg-primary text-white"
              >
                {loading ? "..." : "Login"}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => setShowPasswordLogin(false)}
                  className="text-sm text-muted-foreground underline"
                >
                  {t("common.back")}
                </button>
              </div>
            </div>
          )}

          {/* REGISTER LINK */}
          <div className="pt-4 border-t text-center">
            <p className="text-sm opacity-70 mb-2">
              {language === "he" ? "ארגון חדש?" : "New organization?"}
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/register")}
            >
              Register Your Synagogue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

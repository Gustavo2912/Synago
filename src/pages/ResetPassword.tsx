import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * ResetPassword page
 *
 * Works with:
 * - Supabase recovery links
 * - HashRouter
 * - Custom email sending (Resend)
 */
export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);

  /* -----------------------------------------------------
     🔑 CRITICAL: extract recovery session from URL hash
  ----------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const { error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (error) {
        console.error("Reset link error:", error);
        setInvalidLink(true);
        setValidating(false);
        return;
      }

      setValidating(false);
    };

    init();
  }, []);

  /* -----------------------------------------------------
     SUBMIT NEW PASSWORD
  ----------------------------------------------------- */
  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated successfully");
    navigate("/auth");
  };

  /* -----------------------------------------------------
     RENDER STATES
  ----------------------------------------------------- */

  // ⏳ Validating link
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Validating password reset link…</p>
      </div>
    );
  }

  // ❌ Invalid / expired link
  if (invalidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">
            Link is invalid or expired
          </h2>

          <p className="text-sm text-muted-foreground">
            This password reset link is no longer valid.
            Please request a new one.
          </p>

          <Button onClick={() => navigate("/auth")}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Valid link – show form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow space-y-4">
        <h1 className="text-xl font-semibold">
          Set a new password
        </h1>

        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Saving…" : "Save password"}
        </Button>
      </div>
    </div>
  );
}

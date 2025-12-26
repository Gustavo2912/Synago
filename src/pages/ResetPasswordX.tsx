import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  /* -----------------------------------------------------
     🔑 CRITICAL: extract session from recovery URL
  ----------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const { error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (error) {
        console.error(error);
        toast.error(
          "This password reset link is invalid or has expired."
        );
        return;
      }

      setSessionReady(true);
    };

    init();
  }, []);

  /* -----------------------------------------------------
     SUBMIT
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

    toast.success("Password set successfully");
    navigate("/auth");
  };

  /* -----------------------------------------------------
     RENDER
  ----------------------------------------------------- */

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Validating reset link…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4">
          Set your password
        </h1>

        <div className="space-y-3">
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
            {loading ? "Saving…" : "Set password"}
          </Button>
        </div>
      </div>
    </div>
  );
}

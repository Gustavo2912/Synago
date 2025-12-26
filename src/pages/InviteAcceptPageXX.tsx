import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ---------- TYPES ---------- */

type InviteInfo = {
  email: string;
  organization_name: string;
  role: string;
  user_exists: boolean;
};

/* ================================================================= */

export default function InviteAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [step, setStep] = useState<
    "loading" | "login" | "signup" | "submitting" | "error"
  >("loading");

  const [error, setError] = useState<string | null>(null);

  // 🔒 fields חייבים להתחיל ריקים תמיד
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPassword("");
  };

  /* -----------------------------------------------------
     ACCEPT INVITE (existing user only)
  ----------------------------------------------------- */
  const acceptInvite = async () => {
    const sessionRes = await supabase.auth.getSession();
    const accessToken = sessionRes.data.session?.access_token;

    if (!accessToken) {
      setError("Authentication required.");
      setStep("error");
      return;
    }

    const { error } = await supabase.functions.invoke("accept-invite", {
      body: { token },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
      setError("This invitation is no longer valid.");
      setStep("error");
      return;
    }

    await supabase.auth.refreshSession();
    navigate("/dashboard");
  };

  /* -----------------------------------------------------
     LOAD & VALIDATE INVITE
  ----------------------------------------------------- */
  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link.");
      setStep("error");
      return;
    }

    // ✅ קריטי: ניקוי מוחלט
    resetForm();
    setInvite(null);
    setError(null);
    setStep("loading");

    (async () => {
      const { data, error } = await supabase.functions.invoke(
        "validate-invite",
        { body: { token } }
      );

      if (error || !data) {
        setError("This invitation is no longer valid.");
        setStep("error");
        return;
      }

      setInvite(data);

      // מניעת ערבוב session / OTP / משתמש אחר
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data.session;

      if (
        session &&
        session.user.email?.toLowerCase() !== data.email.toLowerCase()
      ) {
        await supabase.auth.signOut();
      }

      setStep(data.user_exists ? "login" : "signup");
    })();
  }, [token]);

  /* -----------------------------------------------------
     LOGIN (existing user)
  ----------------------------------------------------- */
  const handleLogin = async () => {
    if (!invite) return;

    setStep("submitting");

    const { error } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });

    if (error) {
      setError(error.message);
      setStep("login");
      return;
    }

    await acceptInvite();
  };

  /* -----------------------------------------------------
     SIGNUP (new user) – Edge Function
  ----------------------------------------------------- */
  const handleSignup = async () => {
    if (!invite) return;

    setStep("submitting");

    const { data, error } = await supabase.functions.invoke(
      "create-user-from-invite",
      {
        body: {
          token,
          first_name: firstName,
          last_name: lastName,
          password,
        },
      }
    );

    if (error) {
      setError(
        (data as any)?.error ||
          error.message ||
          "Failed to create account."
      );
      setStep("signup");
      return;
    }

    // ניקוי session לפני login
    await supabase.auth.signOut();

    const loginRes = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });

    if (loginRes.error) {
      setError(loginRes.error.message);
      setStep("signup");
      return;
    }

    await supabase.auth.refreshSession();
    navigate("/dashboard");
  };

  /* -----------------------------------------------------
     RENDER
  ----------------------------------------------------- */

  if (step === "loading") {
    return (
      <div className="p-6 max-w-md mx-auto">
        Validating invitation…
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <p className="text-sm">{error}</p>
        <Button onClick={() => navigate("/auth")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-semibold">
        Join {invite.organization_name}
      </h2>

      <p>
        You were invited as <b>{invite.role}</b>
      </p>

      <p className="text-sm text-muted-foreground">
        Email: {invite.email}
      </p>

      {/* ⛔ מניעת autofill */}
      <form autoComplete="off">
        <input
          type="email"
          name="email"
          autoComplete="username"
          style={{ display: "none" }}
        />

        {step === "login" && (
          <div className="space-y-3">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleLogin}
              className="w-full"
            >
              Sign in & Accept
            </Button>
          </div>
        )}

        {step === "signup" && (
          <div className="space-y-3">
            <Input
              autoComplete="off"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              autoComplete="off"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleSignup}
              className="w-full"
            >
              Create account & Accept
            </Button>
          </div>
        )}
      </form>

      {step === "submitting" && (
        <p className="text-sm text-muted-foreground">
          Processing…
        </p>
      )}

      {error && step !== "error" && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

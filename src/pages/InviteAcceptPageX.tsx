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

  /* 🔒 תמיד מתחילים עם שדות ריקים */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPassword("");
  };

  /* -----------------------------------------------------
     LOAD + VALIDATE INVITE
  ----------------------------------------------------- */
  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link.");
      setStep("error");
      return;
    }

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

      // 🔥 קריטי: ניתוק כל session קודם (OTP / משתמש אחר)
      const session = (await supabase.auth.getSession()).data.session;
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
     LOGIN (USER EXISTS)
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

    navigate("/dashboard");
  };

  /* -----------------------------------------------------
     SIGNUP (NEW USER FROM INVITE)
  ----------------------------------------------------- */
  const handleSignup = async () => {
    if (!invite) return;

    setStep("submitting");

    const { error } = await supabase.functions.invoke(
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

    // 🔁 אם המשתמש כבר קיים – fallback ל־login
    if (error) {
      if (
        error.message?.includes("USER_ALREADY_EXISTS") ||
        error.status === 409
      ) {
        const loginRes = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });

        if (loginRes.error) {
          setError(loginRes.error.message);
          setStep("signup");
          return;
        }

        navigate("/dashboard");
        return;
      }

      setError(error.message || "Failed to create account.");
      setStep("signup");
      return;
    }

    // משתמש חדש נוצר → login רגיל
    const loginRes = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });

    if (loginRes.error) {
      setError(loginRes.error.message);
      setStep("signup");
      return;
    }

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

      {/* 🚫 חסימת autofill */}
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
              name="invite-login-password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              onClick={handleLogin}
            >
              Sign in & Accept
            </Button>
          </div>
        )}

        {step === "signup" && (
          <div className="space-y-3">
            <Input
              name="invite-first-name"
              autoComplete="off"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              name="invite-last-name"
              autoComplete="off"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <Input
              type="password"
              name="invite-new-password"
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              onClick={handleSignup}
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

"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileField, turnstileSiteKey } from "@/components/tank/turnstile-field";
import { trackEvent } from "@/lib/analytics";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";

type GateMode = "signin" | "forgot" | "recover";

export function AuthGate({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [signedIn, setSignedIn] = useState(!configured);
  const [mode, setMode] = useState<GateMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hadSession = useRef(false);
  const restoreRequest = useRef(0);

  async function restoreSession() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Factory sign-in is not available. Check the site configuration.");
      setReady(true);
      return;
    }

    const token = ++restoreRequest.current;
    setReady(false);
    setError(null);

    const timeout = window.setTimeout(() => {
      if (token !== restoreRequest.current) return;
      setError("Sign-in is taking too long. Try again.");
      setReady(true);
    }, 8000);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (token !== restoreRequest.current) return;
      window.clearTimeout(timeout);
      if (sessionError) setError(sessionError.message);
      const session = Boolean(data.session);
      hadSession.current = session;
      setSignedIn(session);
      setReady(true);
    } catch {
      if (token !== restoreRequest.current) return;
      window.clearTimeout(timeout);
      setError("Could not restore the factory session. Try signing in again.");
      setReady(true);
    }
  }

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Factory sign-in is not available. Check the site configuration.");
      setReady(true);
      return;
    }

    void restoreSession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recover");
        setSignedIn(false);
        setReady(true);
        setError(null);
        setNotice("Choose a new password for the factory account.");
        return;
      }
      if (event === "SIGNED_OUT" && hadSession.current) {
        setError("The factory session ended. Sign in again.");
      }
      hadSession.current = Boolean(session);
      setSignedIn(Boolean(session));
    });
    return () => {
      restoreRequest.current += 1;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  async function onSignIn(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    try {
      if (turnstileSiteKey() && !captchaToken) {
        setError("Complete the check before signing in.");
        setSubmitting(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (signInError) {
        setError(signInError.message);
        trackEvent("tank_sign_in_fail", { reason: "credentials" });
        return;
      }
      hadSession.current = true;
    } catch {
      setError("Could not sign in. Try again.");
      trackEvent("tank_sign_in_fail", { reason: "network" });
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgot(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (turnstileSiteKey() && !captchaToken) {
        setError("Complete the check before sending a reset link.");
        setSubmitting(false);
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/tank/`,
        captchaToken: captchaToken ?? undefined,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setNotice("If that email is the factory account, a reset link is on its way.");
    } catch {
      setError("Could not send a reset email. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRecover(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    if (password.length < 8) {
      setError("Use at least eight characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      hadSession.current = true;
      setSignedIn(true);
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not save the new password. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="container-tank grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <h1>Foam chemical calculator</h1>
          <p className="mt-2 text-muted-foreground">Loading calculator…</p>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    const title =
      mode === "forgot" ? "Reset factory password" : mode === "recover" ? "Choose a new password" : "Factory sign-in";
    return (
      <div className="container-tank flex min-h-[80vh] flex-col justify-center">
        <h1>{title}</h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "forgot"
            ? "Enter the shared factory email. We send a reset link to that address."
            : mode === "recover"
              ? "This updates the shared factory password used on every tablet."
              : "Sign in to load chemicals and the tank log. Ask the site owner for the shared factory account."}
        </p>
        <form
          onSubmit={mode === "forgot" ? onForgot : mode === "recover" ? onRecover : onSignIn}
          className="mx-auto mt-8 w-full max-w-md space-y-4"
        >
          {mode !== "recover" ? (
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          ) : null}
          {mode !== "forgot" ? (
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {mode === "recover" ? "New password" : "Password"}
              </label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "recover" ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          ) : null}
          {mode === "recover" ? (
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          ) : null}
          {notice ? (
            <p className="text-sm text-muted-foreground" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {mode !== "recover" ? <TurnstileField onToken={setCaptchaToken} /> : null}
          <Button type="submit" size="touch" className="w-full" disabled={submitting}>
            {submitting
              ? mode === "forgot"
                ? "Sending…"
                : mode === "recover"
                  ? "Saving…"
                  : "Signing in…"
              : mode === "forgot"
                ? "Send reset link"
                : mode === "recover"
                  ? "Save password"
                  : "Sign in"}
          </Button>
          {mode === "signin" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="touch"
                className="w-full"
                onClick={() => void restoreSession()}
              >
                Try restoring the session
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="touch"
                className="w-full"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
              >
                Forgot password
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="w-full"
              onClick={() => {
                setMode("signin");
                setError(null);
                setNotice(null);
              }}
            >
              Back to sign-in
            </Button>
          )}
        </form>
      </div>
    );
  }

  return children;
}

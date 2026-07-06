"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Mail, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";

const ERROR_COPY: Record<string, string> = {
  missing_code: "We couldn't read the magic-link code. Try sending another link.",
  exchange_failed: "That magic link expired or was already used. Send a fresh one.",
  auth: "Something went wrong while signing you in. Try again.",
  access_denied: "You declined the sign-in request. No problem — try again any time.",
  account_deleted: "This account has been deleted. Contact support if this is unexpected.",
};

type Mode = "signin" | "signup";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const params = useSearchParams();
  const errorCode = params.get("error");
  const errorMessage = errorCode ? ERROR_COPY[errorCode] ?? "Sign-in failed. Try again." : null;

  /* Carry a same-origin `?next` deep-link through the auth round-trip — the
     callback honors it (and gives /join/* paths priority over track-routing
     so an invited client lands back on the join screen). */
  const nextParam = params.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;
  const callbackUrl = (origin: string) =>
    `${origin}/api/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`;

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorText(null);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl(window.location.origin),
          /* Sign in: refuse if no account exists. Sign up: create one if not. */
          shouldCreateUser: mode === "signup",
        },
      });
      if (error) {
        /* Supabase returns "Signups not allowed for otp" when shouldCreateUser
           is false and the email isn't registered. Map to friendlier copy. */
        if (
          mode === "signin" &&
          /signup|not allowed|user not found/i.test(error.message)
        ) {
          throw new Error(
            "We don't have an account for that email. Switch to Create account?",
          );
        }
        throw error;
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorText(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    }
  }

  /* Google sign-in is gated by NEXT_PUBLIC_GOOGLE_AUTH_ENABLED so we don't
     show a button that 500s when Google isn't configured in Supabase yet. */
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(window.location.origin),
      },
    });
  }

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto grid place-items-center text-white mb-5"
            style={{
              background: "linear-gradient(135deg, #14315E, #0B1F3A)",
              boxShadow: "0 8px 24px -8px rgba(11,31,58,0.45)",
            }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em] text-text leading-tight">
            {isSignup ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="text-[14px] text-muted mt-2 leading-relaxed">
            {isSignup
              ? "Start your CreatorHub workspace in under 2 minutes."
              : "Sign in to your CreatorHub workspace."}
          </p>
        </div>

        {/* Sign in vs Create account toggle */}
        <div className="mb-4 inline-flex w-full rounded-[10px] bg-surface-2 border border-border p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setStatus("idle");
              setErrorText(null);
            }}
            className={cn(
              "flex-1 h-8 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer",
              mode === "signin"
                ? "bg-surface text-text shadow-[0_1px_2px_rgba(7,17,31,0.06)]"
                : "text-muted hover:text-text",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setStatus("idle");
              setErrorText(null);
            }}
            className={cn(
              "flex-1 h-8 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer",
              mode === "signup"
                ? "bg-surface text-text shadow-[0_1px_2px_rgba(7,17,31,0.06)]"
                : "text-muted hover:text-text",
            )}
          >
            Create account
          </button>
        </div>

        {(errorMessage || (errorText && status === "error")) && (
          <div className="mb-4 px-3 py-2.5 rounded-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[12.5px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage ?? errorText}</span>
          </div>
        )}

        {status === "sent" ? (
          <div className="rounded-[14px] border border-accent/40 bg-accent-soft px-5 py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-accent grid place-items-center text-white mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-[16px] font-semibold text-text">Check your email</h2>
            <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
              We sent a magic link to{" "}
              <span className="text-text font-medium">{email}</span>.{" "}
              {isSignup
                ? "Click it to finish creating your account."
                : "Click it to finish signing in."}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
              className="text-[12px] text-accent hover:text-accent-2 font-medium mt-4 cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={sendMagicLink}
            className="rounded-[14px] border border-border bg-surface card-base p-5 space-y-3"
          >
            <label className="block">
              <span className="text-[12.5px] font-semibold text-text block mb-1.5">
                Email
              </span>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-surface-2 border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </label>
            <Button
              type="submit"
              size="md"
              disabled={status === "sending" || !email.trim()}
              className="w-full"
            >
              {status === "sending"
                ? "Sending…"
                : isSignup
                  ? "Email me a sign-up link"
                  : "Email me a magic link"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            {googleEnabled && (
              <>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10.5px] uppercase font-semibold text-muted tracking-wider">
                    or
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className={cn(
                    "w-full h-10 rounded-[10px] bg-surface-2 border border-border text-[13.5px] font-medium text-text",
                    "hover:border-accent/30 transition-colors cursor-pointer flex items-center justify-center gap-2",
                  )}
                >
                  <GoogleMark className="w-4 h-4" />
                  {isSignup ? "Sign up with Google" : "Continue with Google"}
                </button>
              </>
            )}
          </form>
        )}

        <p className="text-[11.5px] text-muted text-center mt-5 leading-relaxed">
          By {isSignup ? "creating an account" : "signing in"} you agree to our{" "}
          <a className="text-accent hover:text-accent-2 underline-offset-2 hover:underline" href="/terms">
            Terms
          </a>{" "}
          and{" "}
          <a className="text-accent hover:text-accent-2 underline-offset-2 hover:underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.4 5.4 0 0 1-2.4 3.58v2.97h3.86c2.26-2.09 3.56-5.17 3.56-8.79z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.94l-3.86-2.97c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.07A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.18 7.18 0 0 1 4.88 12c0-.79.14-1.56.39-2.29V6.64H1.29A12 12 0 0 0 0 12c0 1.93.46 3.76 1.29 5.36l3.98-3.07z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.2 15.23 0 12 0A11.99 11.99 0 0 0 1.29 6.64l3.98 3.07C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

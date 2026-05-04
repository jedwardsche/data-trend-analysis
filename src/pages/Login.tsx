import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { CheLogo } from "@/components/ui/logo";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isEmailSignInLink, completeEmailSignIn } from "@/lib/firebase";
import { checkEmailAccess, sendSignInLink } from "@/lib/functions";
type EmailState = "idle" | "input" | "sending" | "sent" | "completing";

/* ── Hero feature callouts ─────────────────────────────────── */

const features = [
  {
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
    label: "Enrollment trends",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
    label: "Campus-by-campus metrics",
  },
  {
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
        />
      </svg>
    ),
    label: "Retention insights",
  },
];

/* ── Google icon (inline SVG) ──────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
    >
      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" />
    </svg>
  );
}

/* ── Hero panel (left side on desktop, top banner on mobile) ── */

function HeroPanel() {
  return (
    <>
      {/* Desktop: tall left panel */}
      <div className="hidden md:flex w-[55%] relative overflow-hidden bg-linear-to-b from-[#1F4F48] via-[#1a443e] to-[#132e2a] flex-col justify-start gap-10 p-12 pt-42">
        {/* Subtle dot texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10">
          <CheLogo variant="white" height={36} />
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
            Enrollment Data
            <br />
            for CHE Leadership
          </h2>

          <div className="space-y-4 pt-2">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 text-white/80"
              >
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/10">
                  {f.icon}
                </div>
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: flex-1 hero banner — expands to fill space above card */}
      <div className="md:hidden relative overflow-hidden flex-1 flex flex-col justify-end" style={{ minHeight: 200, background: "linear-gradient(145deg, #2a6b5f 0%, #1a4a42 55%, #1f3d2e 100%)" }}>
        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Bottom fade for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.18) 100%)",
          }}
        />
        <div className="relative z-10 px-6 pb-[76px]">
          <div className="mb-3" style={{ transform: "scale(0.7)", transformOrigin: "left center" }}>
            <CheLogo variant="white" height={28} />
          </div>
          <p className="text-white text-3xl font-bold leading-snug max-w-[300px]">
            Enrollment Data for CHE Leadership
          </p>
        </div>
      </div>
    </>
  );
}

/* ── Shared sign-in card content ───────────────────────────── */

function SignInCard({
  signIn,
  loading,
  error,
  emailState,
  setEmailState,
  email,
  setEmail,
  emailError,
  setEmailError,
  showGoogleRedirect,
  handleSendEmailLink,
}: {
  signIn: () => void;
  loading: boolean;
  error: string | null;
  emailState: EmailState;
  setEmailState: (s: EmailState) => void;
  email: string;
  setEmail: (s: string) => void;
  emailError: string | null;
  setEmailError: (s: string | null) => void;
  showGoogleRedirect: boolean;
  handleSendEmailLink: () => void;
}) {
  const spring = { type: "spring" as const, stiffness: 280, damping: 28 };
  const isEmailOpen = emailState === "input" || emailState === "sending";
  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailContentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [emailAreaHeight, setEmailAreaHeight] = useState<number>(0);
  const hasInitialized = useRef(false);

  // On first render, snapshot the idle button height so we have a starting value
  useEffect(() => {
    if (!hasInitialized.current && emailContentRef.current) {
      setEmailAreaHeight(emailContentRef.current.scrollHeight);
      hasInitialized.current = true;
    }
  });

  // When the view switches, lock the current height first, then measure new content next frame
  useEffect(() => {
    const container = containerRef.current;
    const content = emailContentRef.current;
    if (!container || !content) return;

    // Lock current rendered height so the spring animates FROM here
    setEmailAreaHeight(container.offsetHeight);

    // Next frame: React has rendered new content, measure it
    const raf = requestAnimationFrame(() => {
      setEmailAreaHeight(content.scrollHeight);
    });
    return () => cancelAnimationFrame(raf);
  }, [isEmailOpen, showGoogleRedirect]);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Back arrow — outside space-y-6 so unmounting doesn't affect gap */}
      <AnimatePresence initial={false}>
        {isEmailOpen && (
          <motion.div
            key="back-arrow"
            initial={{ height: 0, marginBottom: 0, opacity: 0 }}
            animate={{ height: 32, marginBottom: 24, opacity: 1 }}
            exit={{ height: 0, marginBottom: 0, opacity: 0 }}
            transition={spring}
            style={{ overflow: "hidden" }}
          >
            <button
              onClick={() => {
                setEmailState("idle");
                setEmail("");
                setEmailError(null);
              }}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition-all hover:text-[#1F4F48] hover:-translate-x-0.5"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-[26px] md:text-2xl font-bold tracking-tight text-[#1F4F48] md:text-foreground">
            Sign in
          </h1>
        </div>

        <div className="space-y-4 md:space-y-4 pb-2 md:pb-0">
          <Button
            onClick={signIn}
            className="w-full bg-[#1F4F48] hover:bg-[#1a443e] text-white h-[52px] md:h-10 text-base md:text-sm font-semibold"
            size="lg"
            disabled={loading}
          >
            <GoogleIcon />
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-4 md:gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              or
            </span>
            <Separator className="flex-1" />
          </div>

          {/* Crossfade between email button and email input form */}
          {/* Outer motion.div animates the height with spring so the card never jumps */}
          <motion.div
            ref={containerRef}
            animate={{ height: emailAreaHeight || "auto" }}
            transition={spring}
            className="relative overflow-hidden"
          >
            <div ref={emailContentRef}>
              <AnimatePresence initial={false} mode="wait">
                {!isEmailOpen ? (
                  <motion.div
                    key="email-idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    onAnimationStart={() => {
                      requestAnimationFrame(() => {
                        if (emailContentRef.current) {
                          setEmailAreaHeight(
                            emailContentRef.current.scrollHeight,
                          );
                        }
                      });
                    }}
                  >
                    <Button
                      onClick={() => setEmailState("input")}
                      variant="outline"
                      className="w-full border-[#1F4F48] text-[#1F4F48] hover:bg-[#1F4F48]/5 h-[52px] md:h-10 text-base md:text-sm font-semibold"
                      size="lg"
                    >
                      <MailIcon />
                      Continue with Email
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="email-input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                      delay: 0.1,
                    }}
                    onAnimationStart={() => {
                      // Re-measure after entering content renders
                      requestAnimationFrame(() => {
                        if (emailContentRef.current) {
                          setEmailAreaHeight(
                            emailContentRef.current.scrollHeight,
                          );
                        }
                      });
                    }}
                    onAnimationComplete={() => emailInputRef.current?.focus()}
                  >
                    <div className="space-y-3">
                      <Input
                        ref={emailInputRef}
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          !showGoogleRedirect &&
                          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
                          handleSendEmailLink()
                        }
                        disabled={emailState === "sending"}
                        className="focus-visible:ring-0 focus-visible:border-border focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06)]"
                      />
                      {showGoogleRedirect && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground">
                          <GoogleIcon />
                          <span>
                            This email is associated with Google sign-in. Use
                            the{" "}
                            <strong className="text-foreground">
                              Continue with Google
                            </strong>{" "}
                            button above.
                          </span>
                        </div>
                      )}
                      <Button
                        onClick={handleSendEmailLink}
                        className="w-full bg-[#1F4F48] hover:bg-[#1a443e] text-white h-[52px] md:h-10 text-base md:text-sm font-semibold"
                        size="lg"
                        disabled={
                          emailState === "sending" ||
                          showGoogleRedirect ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                        }
                      >
                        {emailState === "sending" ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            Sending link...
                          </span>
                        ) : (
                          "Send sign-in link"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Error message */}
          <AnimatePresence initial={false}>
            {(error || emailError) && (
              <motion.div
                key="error"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring}
                style={{ overflow: "hidden" }}
              >
                <p className="text-sm text-destructive text-center">
                  {error || emailError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-xs text-muted-foreground md:opacity-100 opacity-50 md:text-left text-center" style={{ fontSize: "12px" }}>
          Access restricted to authorized CHE users
        </p>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */

export function LoginPage() {
  const { isAuthenticated, signIn, loading, error } = useAuth();
  const navigate = useNavigate();
  const [emailState, setEmailState] = useState<EmailState>("idle");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showGoogleRedirect, setShowGoogleRedirect] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Handle email link completion when user arrives from email
  useEffect(() => {
    if (isEmailSignInLink(window.location.href)) {
      setEmailState("completing");
      completeEmailSignIn(window.location.href)
        .then(() => {
          navigate("/dashboard");
        })
        .catch((err) => {
          setEmailError((err as Error).message);
          setEmailState("idle");
        });
    }
  }, [navigate]);

  const handleSendEmailLink = async () => {
    if (!email) {
      setEmailError("Please enter your email address");
      return;
    }

    setEmailError(null);
    setShowGoogleRedirect(false);
    setEmailState("sending");

    try {
      const { allowed, hasGoogleProvider } = await checkEmailAccess(email);
      if (!allowed) {
        setEmailError(
          "This email does not have access to the dashboard. Please contact your CHE administrator.",
        );
        setEmailState("input");
        return;
      }

      if (hasGoogleProvider) {
        setShowGoogleRedirect(true);
        setEmailState("input");
        return;
      }

      const redirectUrl = window.location.origin + "/login";
      await sendSignInLink(email, redirectUrl);
      window.localStorage.setItem("emailForSignIn", email);
      setEmailState("sent");
    } catch (err) {
      setEmailError((err as Error).message);
      setEmailState("input");
    }
  };

  // Completing email link sign-in
  if (emailState === "completing") {
    return (
      <div className="min-h-dvh md:min-h-screen flex flex-col md:flex-row bg-[#F5F4EF]">
        <HeroPanel />
        {/* Desktop */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-background p-8">
          <div className="w-full max-w-sm mx-auto space-y-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Signing you in...
            </h1>
            <p className="text-sm text-muted-foreground">
              Loading your dashboard data
            </p>
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4F48]" />
            </div>
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
        </div>
        {/* Mobile */}
        <div className="md:hidden -mt-12 mx-4 mb-6 relative z-10 bg-card rounded-2xl pt-7 pb-8 px-6 text-center" style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
          <div className="space-y-6">
            <h1 className="text-[26px] font-bold tracking-tight text-[#1F4F48]">
              Signing you in...
            </h1>
            <p className="text-sm text-muted-foreground">
              Loading your dashboard data
            </p>
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4F48]" />
            </div>
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Email link sent confirmation
  if (emailState === "sent") {
    return (
      <div className="min-h-dvh md:min-h-screen flex flex-col md:flex-row bg-[#F5F4EF]">
        <HeroPanel />
        {/* Desktop */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-background p-8">
          <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground">
                A sign-in link has been sent to{" "}
                <strong className="text-foreground">{email}</strong>. Click the
                link in the email to sign in.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <p className="text-xs text-muted-foreground text-center">
                Don&apos;t see it? Check your spam folder.
              </p>
              <Button
                onClick={() => {
                  setEmailState("idle");
                  setEmail("");
                  setEmailError(null);
                }}
                variant="outline"
                className="w-full border-[#1F4F48] text-[#1F4F48] hover:bg-[#1F4F48]/5"
                size="lg"
              >
                Return to sign in
              </Button>
            </div>
          </div>
        </div>
        {/* Mobile */}
        <div className="md:hidden -mt-12 mx-4 mb-6 relative z-10 bg-card rounded-2xl pt-7 pb-8 px-6" style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-[26px] font-bold tracking-tight text-[#1F4F48]">
                Check your email
              </h1>
              <p className="text-sm text-muted-foreground">
                A sign-in link has been sent to{" "}
                <strong className="text-foreground">{email}</strong>. Click the
                link in the email to sign in.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/50 p-5 space-y-4">
              <p className="text-xs text-muted-foreground text-center">
                Don&apos;t see it? Check your spam folder.
              </p>
              <Button
                onClick={() => {
                  setEmailState("idle");
                  setEmail("");
                  setEmailError(null);
                }}
                variant="outline"
                className="w-full border-[#1F4F48] text-[#1F4F48] hover:bg-[#1F4F48]/5 h-[52px] md:h-10"
                size="lg"
              >
                Return to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default login view
  return (
    <div className="min-h-dvh md:min-h-screen flex flex-col md:flex-row bg-[#F5F4EF]">
      <HeroPanel />
      {/* Desktop */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-[480px]">
          <div className="bg-card rounded-xl shadow-sm border border-border p-12">
            <SignInCard
              signIn={signIn}
              loading={loading}
              error={error}
              emailState={emailState}
              setEmailState={setEmailState}
              email={email}
              setEmail={setEmail}
              emailError={emailError}
              setEmailError={setEmailError}
              showGoogleRedirect={showGoogleRedirect}
              handleSendEmailLink={handleSendEmailLink}
            />
          </div>
        </div>
      </div>
      {/* Mobile */}
      <div className="md:hidden -mt-12 mx-4 mb-6 relative z-10 bg-card rounded-2xl pt-7 pb-8 px-6" style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
        <SignInCard
          signIn={signIn}
          loading={loading}
          error={error}
          emailState={emailState}
          setEmailState={setEmailState}
          email={email}
          setEmail={setEmail}
          emailError={emailError}
          setEmailError={setEmailError}
          showGoogleRedirect={showGoogleRedirect}
          handleSendEmailLink={handleSendEmailLink}
        />
      </div>
    </div>
  );
}

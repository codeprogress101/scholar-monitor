import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import App from "./App";
import { ApiError, authRequest, type Session } from "./auth-api";

function resetFromLocation() {
  return window.location.hash.startsWith("#reset-password")
    ? (new URLSearchParams(window.location.hash.split("?")[1]).get("token") ??
        "")
    : null;
}

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState<string | null>(resetFromLocation);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const generation = useRef(0);
  const check = useCallback(async () => {
    const current = ++generation.current;
    try {
      const value = await authRequest<Session>("me");
      if (current !== generation.current) return;
      setSession(value);
      setUnavailable(false);
    } catch (error) {
      if (current !== generation.current) return;
      setSession(null);
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setUnavailable(false);
        if (error.code !== "AUTH_REQUIRED") setMessage(error.message);
      } else {
        setUnavailable(true);
        setMessage(
          "We could not reach the account service. Check the connection and try again.",
        );
      }
    } finally {
      if (current === generation.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const takeReset = () => {
      const token = resetFromLocation();
      if (token !== null) {
        setReset(token);
        window.history.replaceState(null, "", "#reset-password");
        setMessage("");
      }
    };
    // Retain the one-time token only in memory, removing it from browser history/address bar.
    if (window.location.hash.startsWith("#reset-password"))
      window.history.replaceState(null, "", "#reset-password");
    window.addEventListener("hashchange", takeReset);
    const timeout = window.setTimeout(() => void check(), 0);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("hashchange", takeReset);
    };
  }, [check]);

  useEffect(() => {
    if (!session || busy) return;
    // /me does not extend idle expiry, so background checks cannot keep a session alive.
    const interval = window.setInterval(() => void check(), 60000);
    const onFocus = () => {
      void check();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, busy, check]);

  async function logout() {
    generation.current++;
    setBusy(true);
    try {
      await authRequest("logout", { body: {}, csrf: session!.csrfToken });
      generation.current++;
      setSession(null);
      setMessage("You have been signed out.");
      window.location.hash = "login";
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setSession(null);
        setMessage(error.message);
      } else
        window.alert(
          "Sign out did not complete. Please check the connection and try again.",
        );
    } finally {
      setBusy(false);
    }
  }

  if (checking)
    return (
      <div className="auth-loading" role="status">
        <GraduationCap size={36} />
        <p>Opening your workspace...</p>
      </div>
    );
  if (session && reset === null)
    return (
      <App session={session} onLogout={() => void logout()} signingOut={busy} />
    );
  return (
    <LoginScreen
      message={message}
      unavailable={unavailable}
      resetToken={reset}
      onRetry={() => {
        setChecking(true);
        setMessage("");
        void check();
      }}
      onLogin={(value) => {
        generation.current++;
        setSession(value);
        setMessage("");
        window.location.hash = "overview";
      }}
      onReset={() => {
        generation.current++;
        setSession(null);
        setReset(null);
        setMessage("Your password is saved. Sign in with your new password.");
        window.location.hash = "login";
      }}
      onBack={() => {
        setReset(null);
        setMessage("");
        window.location.hash = "login";
      }}
    />
  );
}

function LoginScreen({
  message,
  unavailable,
  resetToken,
  onRetry,
  onLogin,
  onReset,
  onBack,
}: {
  message: string;
  unavailable: boolean;
  resetToken: string | null;
  onRetry: () => void;
  onLogin: (session: Session) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const resetting = resetToken !== null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (resetting && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (resetting) {
        await authRequest("reset-password", {
          body: { token: resetToken, password },
        });
        setPassword("");
        setConfirm("");
        onReset();
      } else
        onLogin(
          await authRequest<Session>("login", {
            body: { email: email.trim(), password },
          }),
        );
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : "The account service could not be reached. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story" aria-label="LGU-Daet scholarship program">
        <div className="auth-brand">
          <span>
            <GraduationCap size={31} />
          </span>
          <div>
            LDSS<small>SCHOLARSHIP MONITOR</small>
          </div>
        </div>
        <div className="auth-story-copy">
          <div className="eyebrow">LGU-DAET EXPANDED SCHOLARSHIP PROGRAM</div>
          <h1>
            Every bright future
            <br />
            starts with support.
          </h1>
          <p>
            A shared workspace for the people who keep Daet’s scholars moving
            forward.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="auth-seal">
              <GraduationCap size={70} strokeWidth={1} />
            </div>
            <span className="auth-illustration-line" />
            <span className="auth-illustration-line short" />
          </div>
          <div className="auth-story-note">
            <ShieldCheck size={19} />
            <span>
              Individual access.
              <br />
              <strong>Accountability in every action.</strong>
            </span>
          </div>
        </div>
        <div className="auth-location">
          Municipality of Daet <span>Camarines Norte, Philippines</span>
        </div>
      </section>
      <main className="auth-main">
        <div className="auth-access-label">
          <ShieldCheck size={15} /> Internal staff access
        </div>
        <div className="auth-form-wrap">
          <span className="auth-form-icon">
            {resetting ? <KeyRound size={25} /> : <LockKeyhole size={25} />}
          </span>
          <div className="eyebrow">YOUR SCHOLARSHIP WORKSPACE</div>
          <h2>{resetting ? "Set your password." : "Welcome back."}</h2>
          <p className="auth-intro">
            {resetting
              ? "Choose a unique passphrase for your individual account."
              : "Sign in with your individual account to continue."}
          </p>
          {message && (
            <div className="auth-notice" role="status">
              {message}
            </div>
          )}
          {unavailable && (
            <button className="auth-retry" onClick={onRetry}>
              Retry connection
            </button>
          )}
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          {resetting && !resetToken ? (
            <div className="auth-error" role="alert">
              The activation link is missing. Ask your administrator for a new
              link.
            </div>
          ) : (
            <form onSubmit={(event) => void submit(event)}>
              {!resetting && (
                <div className="auth-field">
                  <label htmlFor="email">Email address</label>
                  <div className="auth-input">
                    <Mail size={17} />
                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={busy}
                    />
                  </div>
                </div>
              )}
              <div className="auth-field">
                <label htmlFor="password">
                  {resetting ? "New password" : "Password"}
                </label>
                <div className="auth-input">
                  <LockKeyhole size={17} />
                  <input
                    id="password"
                    type={visible ? "text" : "password"}
                    autoComplete={
                      resetting ? "new-password" : "current-password"
                    }
                    required
                    minLength={resetting ? 15 : 1}
                    maxLength={resetting ? 128 : 512}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      resetting
                        ? "At least 15 characters"
                        : "Enter your password"
                    }
                    disabled={busy}
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              {resetting && (
                <>
                  <p className="auth-password-hint">
                    Use 15–128 characters. A few unrelated words make a
                    memorable passphrase.
                  </p>
                  <div className="auth-field">
                    <label htmlFor="confirm-password">
                      Confirm new password
                    </label>
                    <div className="auth-input">
                      <LockKeyhole size={17} />
                      <input
                        id="confirm-password"
                        type={visible ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={15}
                        maxLength={128}
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </div>
                </>
              )}
              {!resetting && (
                <button
                  type="button"
                  className="auth-help-button"
                  onClick={() => setHelp(!help)}
                  aria-expanded={help}
                >
                  Need help signing in?
                </button>
              )}
              {help && (
                <div className="auth-notice">
                  Contact your system administrator to activate your account or
                  request a password-reset link. For your privacy, accounts
                  cannot be created here.
                </div>
              )}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy
                  ? "Please wait..."
                  : resetting
                    ? "Save password"
                    : "Sign in to workspace"}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          {resetting && (
            <button className="auth-help-button" onClick={onBack}>
              Back to sign in
            </button>
          )}
          <div className="auth-footnote">
            <ShieldCheck size={16} />
            <p>
              This workspace is for authorized scholarship staff.
              <br />
              Use your own account and sign out when you’re done.
            </p>
          </div>
        </div>
        <footer className="auth-footer">
          LGU-Daet Expanded Scholarship Program
          <span>Purpose-built for public service.</span>
        </footer>
      </main>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

function LoginPage({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  loading,
  message,
  unverifiedEmail,
  onResendVerification,
  resendLoading,
  onGoogleCredential,
}) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1 className="headline" style={{ fontSize: "2.1rem" }}>
          Log in
        </h1>
        <p className="subhead">Log in to continue your learning journey.</p>

        <form onSubmit={onSubmit} style={{ marginTop: "1.5rem" }}>
          <label className="form-field">
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="form-field">
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="divider">
          <span />
          <span>or</span>
          <span />
        </div>

        <GoogleSignInButton onGoogleCredential={onGoogleCredential} />

        {message && (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ color: "#b45309", fontSize: "0.9rem" }}>{message}</p>
            {unverifiedEmail && (
              <button
                type="button"
                onClick={onResendVerification}
                disabled={resendLoading}
                className="btn btn--ghost"
                style={{ marginTop: "0.6rem" }}
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <p className="muted" style={{ marginTop: "1.5rem" }}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" style={{ color: "var(--brand)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleSignInButton({ onGoogleCredential }) {
  const divRef = useRef(null);

  useEffect(() => {
    if (!window.google || !divRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          onGoogleCredential(response.credential);
        }
      },
    });

    const render = () => {
      const width = divRef.current?.offsetWidth || 320;
      divRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline",
        size: "large",
        width,
      });
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [onGoogleCredential]);

  return <div ref={divRef} style={{ width: "100%" }} />;
}

export default LoginPage;

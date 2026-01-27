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
    <main style={authMainStyle}>
      <div style={authCardStyle}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Log in</h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#6b7280",
            marginBottom: "1.25rem",
          }}
        >
          Log in to continue your learning journey.
        </p>

        <form onSubmit={onSubmit}>
          <label
            style={{
              display: "block",
              marginBottom: "0.75rem",
              fontSize: "0.8rem",
            }}
          >
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
              required
            />
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "1rem",
              fontSize: "0.8rem",
            }}
          >
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "1.25rem",
            marginBottom: "0.75rem",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

        {/* Google sign-in */}
        <GoogleSignInButton onGoogleCredential={onGoogleCredential} />

        {message && (
          <div
            style={{
              marginTop: "0.9rem",
              fontSize: "0.8rem",
              color: "#b91c1c",
            }}
          >
            <p>{message}</p>

            {/* If backend says account is not verified, show resend button */}
            {unverifiedEmail && (
              <button
                type="button"
                onClick={onResendVerification}
                disabled={resendLoading}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.4rem 0.8rem",
                  borderRadius: 999,
                  border: "1px solid #f97316",
                  background: "#fff7ed",
                  color: "#9a3412",
                  fontSize: "0.8rem",
                  cursor: resendLoading ? "default" : "pointer",
                }}
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <p
          style={{
            marginTop: "1.25rem",
            fontSize: "0.8rem",
            color: "#6b7280",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            style={{ color: "#f97316", textDecoration: "none" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

/** Google One Tap / Button component */
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

    window.google.accounts.id.renderButton(divRef.current, {
      theme: "outline",
      size: "large",
      width: 400, // pixel value instead of percentage
    });
  }, [onGoogleCredential]);

  return <div ref={divRef} />;
}

const authMainStyle = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "2.5rem 1.5rem 3.5rem",
};

const authCardStyle = {
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  borderRadius: "1.25rem",
  border: "1px solid #e5e7eb",
  boxShadow: "0 12px 40px rgba(15,23,42,0.08)",
  padding: "1.75rem 1.5rem",
};

const inputStyle = {
  width: "100%",
  marginTop: "0.25rem",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.6rem",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  fontSize: "0.85rem",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "0.8rem",
  border: "none",
  background: "#f97316",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
};

export default LoginPage;

import { Link } from "react-router-dom";

function SignupPage({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
  onSubmit,
  loading,
  message,
}) {
  return (
    <main style={authMainStyle}>
      <div style={authCardStyle}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Create your account
        </h1>
        <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "1.25rem" }}>
          Join thousands of learners upgrading their skills.
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <label style={{ flex: 1, fontSize: "0.8rem" }}>
              First name
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
                placeholder="John"
                required
              />
            </label>
            <label style={{ flex: 1, fontSize: "0.8rem" }}>
              Last name
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
                placeholder="Doe"
                required
              />
            </label>
          </div>

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
              marginBottom: "0.75rem",
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

          <label
            style={{
              display: "block",
              marginBottom: "1rem",
              fontSize: "0.8rem",
            }}
          >
            Confirm password
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "0.9rem",
              fontSize: "0.8rem",
              color: "#b91c1c",
            }}
          >
            {message}
          </p>
        )}

        <p
          style={{
            marginTop: "1.25rem",
            fontSize: "0.8rem",
            color: "#6b7280",
          }}
        >
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#f97316", textDecoration: "none" }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
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

export default SignupPage;

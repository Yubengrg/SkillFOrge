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
    <main className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Start here</span>
        <h1 className="headline" style={{ fontSize: "2.1rem" }}>
          Create your account
        </h1>
        <p className="subhead">Build a learning plan tailored to your goals.</p>

        <form onSubmit={onSubmit} style={{ marginTop: "1.5rem" }}>
          <label className="form-field">
            First name
            <input
              className="input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            Last name
            <input
              className="input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
            />
          </label>

          <label className="form-field">
            Confirm password
            <input
              className="input"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        {message && (
          <p style={{ color: "#b45309", marginTop: "1rem" }}>{message}</p>
        )}

        <p className="muted" style={{ marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--brand)" }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default SignupPage;

import { Link } from "react-router-dom";

function VerifyPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="eyebrow">One last step</span>
        <h1 className="headline" style={{ fontSize: "2rem" }}>
          Verify your email
        </h1>
        <p className="subhead">
          We&apos;ve sent a verification link to your email address.
        </p>
        <p className="muted" style={{ marginTop: "0.8rem" }}>
          Open your inbox, click the link in the email, and then come back here
          to log in.
        </p>
        <p className="muted" style={{ marginTop: "1.4rem" }}>
          Once verified, you can{" "}
          <Link to="/login" style={{ color: "var(--brand)" }}>
            log in
          </Link>{" "}
          with your email and password.
        </p>
      </div>
    </main>
  );
}

export default VerifyPage;

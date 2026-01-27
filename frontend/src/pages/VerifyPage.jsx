import { Link } from "react-router-dom";

function VerifyPage() {
  return (
    <main style={authMainStyle}>
      <div style={authCardStyle}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Verify your email
        </h1>
        <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "0.75rem" }}>
          We&apos;ve sent a verification link to your email address.
        </p>
        <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
          Open your inbox, click the link in the email, and then come back here
          to log in.
        </p>
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "#6b7280",
          }}
        >
          Once verified, you can{" "}
          <Link to="/login" style={{ color: "#f97316", textDecoration: "none" }}>
            log in
          </Link>{" "}
          with your email and password.
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

export default VerifyPage;

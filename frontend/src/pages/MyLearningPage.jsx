// src/pages/MyLearningPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "http://localhost:8000/api";

function MyLearningPage({ currentUser }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEnrollments() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setError("");
        setLoading(true);

        const res = await fetch(`${API_BASE}/my/enrollments/`, {
          credentials: "include",
        });
        const data = await res.json();

        if (res.status === 401) {
          navigate("/login");
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || "Failed to load enrollments");
        }

        setEnrollments(data.enrollments || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load enrollments");
      } finally {
        setLoading(false);
      }
    }

    fetchEnrollments();
  }, [currentUser, navigate]);

  if (!currentUser) {
    return (
      <main style={pageMainStyle}>
        <h1 style={titleStyle}>My learning</h1>
        <p style={{ color: "#6b7280", marginBottom: "0.75rem" }}>
          You need to log in to view your courses.
        </p>
        <button
          style={primaryButtonStyle}
          onClick={() => navigate("/login")}
        >
          Go to login
        </button>
      </main>
    );
  }

  return (
    <main style={pageMainStyle}>
      <h1 style={titleStyle}>My learning</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Track your enrolled courses and progress.
      </p>

      {loading && <p style={{ color: "#6b7280" }}>Loading your courses...</p>}

      {error && !loading && (
        <p style={{ color: "#ef4444", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}

      {!loading && enrollments.length === 0 && !error && (
        <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          You haven&apos;t enrolled in any courses yet.{" "}
          <Link to="/" style={{ color: "#4f46e5", textDecoration: "underline" }}>
            Browse courses
          </Link>
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {enrollments.map((e) => (
          <div
            key={e.course.id}
            style={cardStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                marginBottom: "0.25rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6366f1",
                    fontWeight: 600,
                  }}
                >
                  {e.course.category || "Uncategorized"}
                </p>
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#111827",
                    marginTop: "0.1rem",
                  }}
                >
                  {e.course.title}
                </h2>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#4b5563",
                  whiteSpace: "nowrap",
                  alignSelf: "center",
                }}
              >
                {typeof e.progress_percent === "number"
                  ? `${e.progress_percent.toFixed(1)}%`
                  : `${e.progress_percent}%`}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#4b5563",
                marginBottom: "0.75rem",
              }}
            >
              {e.course.description}
            </p>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                background: "#f3f4f6",
                overflow: "hidden",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${e.progress_percent}%`,
                  maxWidth: "100%",
                  background: "linear-gradient(90deg, #4f46e5, #6366f1)",
                  borderRadius: 999,
                }}
              />
            </div>
            <button
              onClick={() => navigate(`/learn/${e.course.slug}`)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              {e.progress_percent > 0 ? "Continue Learning →" : "Start Learning →"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

const pageMainStyle = {
  flex: 1,
  width: "100%",
  maxWidth: 800,
  margin: "0 auto",
  padding: "2.5rem 1.75rem 3.5rem",
};

const titleStyle = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "0.4rem",
};

const primaryButtonStyle = {
  padding: "0.55rem 0.9rem",
  borderRadius: "999px",
  border: "none",
  background: "#4f46e5",
  color: "#eef2ff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const cardStyle = {
  display: "block",
  borderRadius: "1rem",
  border: "1px solid #e5e7eb",
  padding: "0.9rem 1rem",
  background: "#ffffff",
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  textDecoration: "none",
};

export default MyLearningPage;

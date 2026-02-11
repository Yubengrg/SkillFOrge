// src/pages/CoursePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

function CoursePage({ currentUser }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const mediaBase = API_BASE.replace(/\/api$/, "");

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reportingLesson, setReportingLesson] = useState(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [khaltiKey, setKhaltiKey] = useState("");

  // Load course details (with modules & lessons)
  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/courses/${slug}/`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load course");
        }
        setCourse(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load course. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [slug]);

  useEffect(() => {
    async function fetchKhaltiKey() {
      try {
        const res = await fetch(`${API_BASE}/payments/khalti/public-key/`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          setKhaltiKey(data.public_key || "");
        }
      } catch (err) {
        console.error("Failed to load Khalti key", err);
      }
    }
    fetchKhaltiKey();
  }, []);

  const handleEnroll = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      setEnrolling(true);
      setMessage("");
      setError("");

      const res = await fetch(`${API_BASE}/courses/${slug}/enroll/`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll");
      }

      setCourse((prev) => (prev ? { ...prev, is_enrolled: true } : prev));
      setMessage("You are enrolled in this course!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  };

  const handleKhaltiPay = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!course) return;
    if (!khaltiKey) {
      setError("Khalti key not configured.");
      return;
    }
    if (!window.KhaltiCheckout) {
      setError("Khalti checkout not loaded.");
      return;
    }

    const amount = (course.price_npr || 0) * 100;
    const checkout = new window.KhaltiCheckout({
      publicKey: khaltiKey,
      productIdentity: String(course.id),
      productName: course.title,
      productUrl: window.location.href,
      eventHandler: {
        onSuccess: async (payload) => {
          try {
            setEnrolling(true);
            const res = await fetch(`${API_BASE}/payments/khalti/verify/`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: payload.token,
                amount: payload.amount,
                course_id: course.id,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Payment verification failed");
            }
            setCourse((prev) => (prev ? { ...prev, is_enrolled: true } : prev));
            setMessage("Payment successful. You are enrolled!");
          } catch (err) {
            console.error(err);
            setError(err.message || "Payment verification failed");
          } finally {
            setEnrolling(false);
          }
        },
        onError: (err) => {
          console.error(err);
          setError("Payment failed. Please try again.");
        },
        onClose: () => {},
      },
      paymentPreference: ["KHALTI", "EBANKING", "MOBILE_BANKING", "CONNECT_IPS", "SCT"],
    });

    checkout.show({ amount });
  };

  const handleCompleteLesson = async (lessonId) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      setError("");
      setMessage("");

      const res = await fetch(`${API_BASE}/lessons/${lessonId}/complete/`, {
        method: "POST",
        credentials: "include",
      });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        throw new Error(data.error || "Failed to update progress");
      }

      setMessage(
        `Progress updated: ${data.completed_lessons}/${data.total_lessons} lessons completed`
      );
      setCourse((prev) => {
        if (!prev) return prev;
        const modules = prev.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) =>
            lesson.id === lessonId ? { ...lesson, is_completed: true } : lesson
          ),
        }));
        return { ...prev, modules };
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update lesson");
    }
  };

  const getMediaUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${mediaBase}${url}`;
  };

  const getYoutubeThumb = (url) => {
    const match = url?.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&\n?#]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  const getLessonThumb = (lesson) => {
    if (lesson.thumbnail_url) return getMediaUrl(lesson.thumbnail_url);
    if (lesson.video_source === "youtube") return getYoutubeThumb(lesson.video_url);
    return null;
  };

  const goToLesson = (lesson) => {
    if (!course?.is_enrolled) {
      navigate("/login");
      return;
    }
    const params = new URLSearchParams();
    params.set("lesson", String(lesson.id));
    if (lesson.video_source === "youtube") {
      params.set("autoplay", "1");
    }
    navigate(`/learn/${course.slug}?${params.toString()}`);
  };

  const openReport = (lesson) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setReportingLesson(lesson);
    setReportMessage("");
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingLesson) return;

    try {
      setReportSubmitting(true);
      setError("");

      const res = await fetch(`${API_BASE}/reports/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_id: reportingLesson.id,
          type: "other",
          message: reportMessage || "No details provided",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send report");
      }

      setMessage("Thanks! Your report has been submitted.");
      setReportingLesson(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send report");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={pageMainStyle}>
        <p style={{ color: "#6b7280" }}>Loading course...</p>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main style={pageMainStyle}>
        <p style={{ color: "#ef4444", marginBottom: "0.75rem" }}>{error}</p>
        <button style={primaryButtonStyle} onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  if (!course) return null;

  return (
    <main style={pageMainStyle}>
      {/* Header */}
      <header
        style={{
          marginBottom: "1.75rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6366f1",
              fontWeight: 600,
            }}
          >
            {course.category || "Uncategorized"}
          </p>
          <h1
            style={{
              fontSize: "1.7rem",
              fontWeight: 700,
              marginTop: "0.15rem",
              color: "#111827",
            }}
          >
            {course.title}
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: "#4b5563",
              maxWidth: 640,
            }}
          >
            {course.description}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              background: "#f3f4f6",
              color: "#374151",
              alignSelf: "flex-start",
            }}
          >
            Level: {course.level}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              background: "#eef2ff",
              color: "#3730a3",
              alignSelf: "flex-start",
            }}
          >
            {course.price_npr > 0 ? `Price: NPR ${course.price_npr}` : "Free"}
          </span>
          <button
            onClick={course.price_npr > 0 ? handleKhaltiPay : handleEnroll}
            disabled={enrolling || course.is_enrolled}
            style={primaryButtonStyle}
          >
            {enrolling
              ? "Enrolling..."
              : course.is_enrolled
                ? "Enrolled"
                : course.price_npr > 0
                  ? `Pay NPR ${course.price_npr}`
                  : "Enroll in course"}
          </button>
          {course.is_enrolled && (
            <button
              onClick={() => navigate(`/learn/${course.slug}`)}
              style={{
                ...primaryButtonStyle,
                background: "#10b981",
                color: "#ecfdf5",
              }}
            >
              Go to course
            </button>
          )}
        </div>
      </header>

      {(message || error) && (
        <div style={{ marginBottom: "1.25rem" }}>
          {message && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#047857",
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.75rem",
                marginBottom: "0.25rem",
              }}
            >
              {message}
            </p>
          )}
          {error && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.75rem",
              }}
            >
              {error}
            </p>
          )}
        </div>
      )}

      {/* Modules & lessons */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {course.modules.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            No content has been added to this course yet.
          </p>
        )}

        {course.modules.map((module) => (
          <article
            key={module.id}
            style={{
              borderRadius: "1rem",
              border: "1px solid #e5e7eb",
              padding: "1rem 1rem 1.1rem",
              background: "#ffffff",
              boxShadow: "0 8px 24px rgba(15,23,42,0.03)",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "0.35rem",
              }}
            >
              {module.order}. {module.title}
            </h2>

            {module.lessons.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                No lessons added to this module.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, marginTop: "0.7rem" }}>
                {module.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #f3f4f6",
                      padding: "0.6rem 0.75rem",
                      marginBottom: "0.35rem",
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => goToLesson(lesson)}
                        disabled={!course.is_enrolled}
                        style={{
                          border: "none",
                          padding: 0,
                          background: "transparent",
                          cursor: course.is_enrolled ? "pointer" : "default",
                        }}
                      >
                        {getLessonThumb(lesson) ? (
                          <img
                            src={getLessonThumb(lesson)}
                            alt={`${lesson.title} thumbnail`}
                            style={{
                              width: 64,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: "0.5rem",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                            }}
                          />
                        ) : lesson.video_file ? (
                          <video
                            muted
                            playsInline
                            preload="metadata"
                            src={`${getMediaUrl(lesson.video_file)}#t=0.1`}
                            style={{
                              width: 64,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: "0.5rem",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 64,
                              height: 44,
                              borderRadius: "0.5rem",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                            }}
                          />
                        )}
                      </button>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          color: "#111827",
                        }}
                      >
                        {lesson.order}. {lesson.title}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {course.is_enrolled && (
                        <>
                          <button
                            onClick={() => handleCompleteLesson(lesson.id)}
                            disabled={lesson.is_completed}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.35rem 0.75rem",
                              borderRadius: "999px",
                              border: "none",
                              background: lesson.is_completed ? "#10b981" : "#059669",
                              color: "#ecfdf5",
                              cursor: lesson.is_completed ? "default" : "pointer",
                              fontWeight: 600,
                            }}
                          >
                            {lesson.is_completed ? "Completed" : "Mark complete"}
                          </button>
                          <button
                            onClick={() => openReport(lesson)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.35rem 0.75rem",
                              borderRadius: "999px",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                              color: "#4b5563",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Report
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      {/* Report modal */}
      {reportingLesson && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "1.1rem",
              padding: "1.25rem 1.25rem 1.35rem",
              maxWidth: 420,
              width: "100%",
              margin: "0 1rem",
              boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "0.25rem",
              }}
            >
              Report lesson
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                marginBottom: "0.9rem",
              }}
            >
              You are reporting:{" "}
              <span style={{ fontWeight: 600 }}>
                {reportingLesson.title}
              </span>
            </p>

            <form onSubmit={handleSubmitReport} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <textarea
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  outline: "none",
                }}
                placeholder="Describe the issue (spam, abuse, incorrect content, etc.)"
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setReportingLesson(null)}
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.4rem 0.9rem",
                    borderRadius: "999px",
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.4rem 0.9rem",
                    borderRadius: "999px",
                    border: "none",
                    background: "#4f46e5",
                    color: "#eef2ff",
                    cursor: "pointer",
                    fontWeight: 600,
                    opacity: reportSubmitting ? 0.7 : 1,
                  }}
                >
                  {reportSubmitting ? "Sending..." : "Submit report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const pageMainStyle = {
  flex: 1,
  width: "100%",
  maxWidth: 960,
  margin: "0 auto",
  padding: "2.5rem 1.75rem 3.5rem",
};

const primaryButtonStyle = {
  padding: "0.6rem 0.9rem",
  borderRadius: "999px",
  border: "none",
  background: "#4f46e5",
  color: "#eef2ff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
};

export default CoursePage;

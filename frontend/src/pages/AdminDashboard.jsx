import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import "./Dashboard.css";

function AdminDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {},
    trends: { users: [], enrollments: [], courses: [] },
    pending_instructors: [],
    pending_courses: [],
    reports: [],
  });
  const [expanded, setExpanded] = useState({});
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    if (!currentUser?.is_staff) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/admin/overview/`, {
          credentials: "include",
        });
        const payload = await res.json();
        if (res.ok) {
          setData(payload);
        }
      } catch (error) {
        console.error("Failed to load admin overview", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const stats = data.stats || {};

  const trendCards = useMemo(() => {
    const totalUsers = stats.total_users || 0;
    const totalEnrollments = stats.total_enrollments || 0;
    const totalCourses = stats.total_courses || 0;
    return [
      {
        title: "Total Users",
        value: totalUsers,
        delta: `${stats.pending_instructors || 0} pending instructors`,
        series: data.trends?.users || [],
        color: "#0ea5e9",
      },
      {
        title: "Enrollments",
        value: totalEnrollments,
        delta: `${stats.completion_rate || 0}% completion`,
        series: data.trends?.enrollments || [],
        color: "#10b981",
      },
      {
        title: "Courses",
        value: totalCourses,
        delta: `${stats.pending_courses || 0} pending approvals`,
        series: data.trends?.courses || [],
        color: "#f59e0b",
      },
    ];
  }, [data.trends, stats]);

  const handleApproveInstructor = async (id) => {
    const res = await fetch(`${API_BASE}/admin/instructors/${id}/approve/`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleRejectInstructor = async (id) => {
    if (!confirm("Reject this instructor application?")) return;
    const res = await fetch(`${API_BASE}/admin/instructors/${id}/reject/`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleApproveCourse = async (id) => {
    const res = await fetch(`${API_BASE}/admin/courses/${id}/approve/`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleRejectCourse = async (id) => {
    const reason = prompt("Reason for rejection (optional):");
    const res = await fetch(`${API_BASE}/admin/courses/${id}/reject/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openDetail = (item, type) => setDetailItem({ ...item, detailType: type });
  const closeDetail = () => setDetailItem(null);

  useEffect(() => {
    if (detailItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailItem]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span className="dash-brand__dot" />
          Admin Studio
        </div>
        <nav className="dash-nav">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={activeTab === "instructors" ? "active" : ""}
            onClick={() => setActiveTab("instructors")}
          >
            Instructor Reviews
          </button>
          <button
            className={activeTab === "courses" ? "active" : ""}
            onClick={() => setActiveTab("courses")}
          >
            Course Approvals
          </button>
          <button
            className={activeTab === "reports" ? "active" : ""}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
          <button className="muted" onClick={() => navigate("/")}
            style={{ marginTop: "1rem" }}>
            ← Back to site
          </button>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1 className="dash-title">Admin command center</h1>
            <p className="dash-subtitle">Live approvals, moderation, and growth signals.</p>
          </div>
          <div className="action-row">
            <button className="action-btn" onClick={() => setActiveTab("instructors")}>
              Review instructors
            </button>
            <button className="action-btn secondary" onClick={() => setActiveTab("courses")}>
              Review courses
            </button>
          </div>
        </header>

        {activeTab === "overview" && (
          <>
            <section className="dash-kpis">
              {trendCards.map((card) => (
                <div className="kpi-card" key={card.title}>
                  <span className="kpi-label">{card.title}</span>
                  <span className="kpi-value">{card.value}</span>
                  <span className="kpi-delta">{card.delta}</span>
                  <Sparkline data={card.series} stroke={card.color} />
                </div>
              ))}
            </section>

            <section className="dash-grid">
              <div className="dash-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Pending instructors</div>
                    <div className="panel-muted">Latest applications</div>
                  </div>
                  <span className="pill">{data.pending_instructors.length}</span>
                </div>
                {data.pending_instructors.length === 0 ? (
                  <p className="panel-muted">No pending applications.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Expertise</th>
                        <th className="actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pending_instructors.map((inst) => (
                        <tr key={inst.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{inst.name}</div>
                            <div className="panel-muted ellipsis">{inst.email}</div>
                            <button
                              className="action-btn secondary"
                              style={{ marginTop: "0.5rem" }}
                              onClick={() => openDetail(inst, "instructor")}
                            >
                              View details
                            </button>
                          </td>
                          <td className="allow-expand">
                            <span
                              className={`ellipsis expandable ${
                                expanded[`expertise-${inst.id}`] ? "expanded" : ""
                              }`}
                              onClick={() => toggleExpand(`expertise-${inst.id}`)}
                              title="Click to expand"
                            >
                              {inst.expertise?.join(", ") || "Not provided"}
                            </span>
                          </td>
                          <td className="actions">
                            <div className="action-row">
                              <button className="action-btn" onClick={() => handleApproveInstructor(inst.id)}>
                                Approve
                              </button>
                              <button className="action-btn secondary" onClick={() => handleRejectInstructor(inst.id)}>
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="dash-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Moderation queue</div>
                    <div className="panel-muted">Active reports</div>
                  </div>
                  <span className="pill">{data.reports.length}</span>
                </div>
                {data.reports.length === 0 ? (
                  <p className="panel-muted">No unresolved reports.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Reporter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reports.map((report) => (
                        <tr key={report.id}>
                          <td>
                            <span className="status-pill warning">{report.type}</span>
                          </td>
                          <td>{report.lesson_title || report.course_title || "-"}</td>
                          <td>{report.reporter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === "instructors" && (
          <section className="dash-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Instructor applications</div>
                <div className="panel-muted">Review applications and approve in minutes.</div>
              </div>
              <span className="pill">{data.pending_instructors.length}</span>
            </div>
            {data.pending_instructors.length === 0 ? (
              <p className="panel-muted">No pending applications.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Instructor</th>
                    <th>Bio</th>
                    <th>Expertise</th>
                        <th className="actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending_instructors.map((inst) => (
                    <tr key={inst.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inst.name}</div>
                        <div className="panel-muted ellipsis">{inst.email}</div>
                        <button
                          className="action-btn secondary"
                          style={{ marginTop: "0.5rem" }}
                          onClick={() => openDetail(inst, "instructor")}
                        >
                          View details
                        </button>
                      </td>
                      <td className="allow-expand">
                        <span
                          className={`ellipsis expandable ${
                            expanded[`bio-${inst.id}`] ? "expanded" : ""
                          }`}
                          onClick={() => toggleExpand(`bio-${inst.id}`)}
                          title="Click to expand"
                        >
                          {inst.bio || "No bio"}
                        </span>
                      </td>
                      <td className="allow-expand">
                        <span
                          className={`ellipsis expandable ${
                            expanded[`expertise-${inst.id}`] ? "expanded" : ""
                          }`}
                          onClick={() => toggleExpand(`expertise-${inst.id}`)}
                          title="Click to expand"
                        >
                          {inst.expertise?.join(", ") || "Not provided"}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="action-row">
                          <button className="action-btn" onClick={() => handleApproveInstructor(inst.id)}>
                            Approve
                          </button>
                          <button className="action-btn secondary" onClick={() => handleRejectInstructor(inst.id)}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === "courses" && (
          <section className="dash-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Course approvals</div>
                <div className="panel-muted">Publish quality courses faster.</div>
              </div>
              <span className="pill">{data.pending_courses.length}</span>
            </div>
            {data.pending_courses.length === 0 ? (
              <p className="panel-muted">No pending courses.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Lessons</th>
                    <th className="actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending_courses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{course.title}</div>
                        <div className="panel-muted">{course.instructor_name}</div>
                        <button
                          className="action-btn secondary"
                          style={{ marginTop: "0.5rem" }}
                          onClick={() => openDetail(course, "course")}
                        >
                          View details
                        </button>
                      </td>
                      <td>{course.category || "-"}</td>
                      <td>{course.lesson_count}</td>
                      <td className="actions">
                        <div className="action-row">
                          <button className="action-btn" onClick={() => handleApproveCourse(course.id)}>
                            Approve
                          </button>
                          <button className="action-btn secondary" onClick={() => handleRejectCourse(course.id)}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === "reports" && (
          <section className="dash-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Moderation reports</div>
                <div className="panel-muted">Resolve flagged content quickly.</div>
              </div>
              <span className="pill">{data.reports.length}</span>
            </div>
            {data.reports.length === 0 ? (
              <p className="panel-muted">No unresolved reports.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Reporter</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <span className="status-pill warning">{report.type}</span>
                      </td>
                      <td>{report.lesson_title || report.course_title || "-"}</td>
                      <td>{report.reporter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {detailItem && detailItem.detailType === "instructor" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1.5rem",
            }}
            onClick={closeDetail}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "1rem",
                maxWidth: 560,
                width: "100%",
                maxHeight: "80vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 30px 60px rgba(15,23,42,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#fff",
                  padding: "1.5rem 1.5rem 0.75rem",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{detailItem.name}</h3>
                  <p className="panel-muted" style={{ marginTop: "0.25rem" }}>{detailItem.email}</p>
                </div>
                <button className="action-btn secondary" onClick={closeDetail}>
                  Close
                </button>
              </div>
              <div style={{ padding: "0.75rem 1.5rem 1.5rem", overflowY: "auto" }}>
                {detailItem.profile_image_url && (
                  <div style={{ marginTop: "1rem" }}>
                  <img
                    src={detailItem.profile_image_url}
                    alt={`${detailItem.name} profile`}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #e2e8f0",
                    }}
                  />
                  </div>
                )}
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Bio</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                  {detailItem.bio || "No bio provided."}
                </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Expertise</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                  {detailItem.expertise?.join(", ") || "Not specified."}
                </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Experience</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6 }}>
                  {detailItem.years_of_experience ? `${detailItem.years_of_experience} years` : "Not specified."}
                </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Teaching experience</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                  {detailItem.teaching_experience || "Not provided."}
                </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Why teach</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                  {detailItem.why_teach || "Not provided."}
                </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Sample course topic</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                  {detailItem.sample_course_topic || "Not provided."}
                </p>
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Certifications</h4>
                {detailItem.certifications && detailItem.certifications.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569" }}>
                    {detailItem.certifications.map((cert, idx) => (
                      <li key={`${cert.name || "cert"}-${idx}`}>
                        {cert.name || "Certification"}{cert.issuer ? ` — ${cert.issuer}` : ""}{cert.date ? ` (${cert.date})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ marginTop: 0, color: "#475569" }}>None listed.</p>
                )}
                </div>
                <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.4rem" }}>Links & resume</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", color: "#475569" }}>
                  <span>
                    LinkedIn:{" "}
                    {detailItem.linkedin_url ? (
                      <a href={detailItem.linkedin_url} target="_blank" rel="noreferrer">
                        View profile
                      </a>
                    ) : (
                      "Not provided."
                    )}
                  </span>
                  <span>
                    Portfolio:{" "}
                    {detailItem.portfolio_url ? (
                      <a href={detailItem.portfolio_url} target="_blank" rel="noreferrer">
                        View site
                      </a>
                    ) : (
                      "Not provided."
                    )}
                  </span>
                  <span>
                    Resume:{" "}
                    {detailItem.resume_url ? (
                      <a href={detailItem.resume_url} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    ) : (
                      "Not uploaded."
                    )}
                  </span>
                </div>
                </div>
                {detailItem.created_at && (
                  <div style={{ marginTop: "1rem" }}>
                    <h4 style={{ marginBottom: "0.4rem" }}>Submitted</h4>
                    <p style={{ marginTop: 0, color: "#475569" }}>
                      {new Date(detailItem.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {detailItem && detailItem.detailType === "course" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1.5rem",
            }}
            onClick={closeDetail}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "1rem",
                maxWidth: 560,
                width: "100%",
                maxHeight: "80vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 30px 60px rgba(15,23,42,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "#fff",
                  padding: "1.5rem 1.5rem 0.75rem",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{detailItem.title}</h3>
                  <p className="panel-muted" style={{ marginTop: "0.25rem" }}>
                    {detailItem.instructor_name || "Unknown instructor"}{detailItem.instructor_email ? ` • ${detailItem.instructor_email}` : ""}
                  </p>
                </div>
                <button className="action-btn secondary" onClick={closeDetail}>
                  Close
                </button>
              </div>
              <div style={{ padding: "0.75rem 1.5rem 1.5rem", overflowY: "auto" }}>
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.4rem" }}>Description</h4>
                  <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                    {detailItem.description || "No description provided."}
                  </p>
                </div>
                <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span className="pill">{detailItem.category || "Uncategorized"}</span>
                  <span className="pill">{detailItem.level || "Level not set"}</span>
                  <span className="pill">{detailItem.lesson_count} lessons</span>
                  <span className="pill">
                    {detailItem.estimated_duration_hours ? `${detailItem.estimated_duration_hours} hrs` : "Duration n/a"}
                  </span>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.4rem" }}>Learning objectives</h4>
                  {detailItem.learning_objectives && detailItem.learning_objectives.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569" }}>
                      {detailItem.learning_objectives.map((obj, idx) => (
                        <li key={`${obj}-${idx}`} style={{ overflowWrap: "anywhere" }}>{obj}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ marginTop: 0, color: "#475569" }}>None listed.</p>
                  )}
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.4rem" }}>Status</h4>
                  <p style={{ marginTop: 0, color: "#475569" }}>
                    {detailItem.is_approved ? "Approved" : "Pending approval"} • {detailItem.is_published ? "Published" : "Unpublished"}
                  </p>
                </div>
                {detailItem.created_at && (
                  <div style={{ marginTop: "1rem" }}>
                    <h4 style={{ marginBottom: "0.4rem" }}>Submitted</h4>
                    <p style={{ marginTop: 0, color: "#475569" }}>
                      {new Date(detailItem.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Sparkline({ data, stroke }) {
  if (!data || data.length === 0) return <svg className="sparkline" />;
  const values = data.map((d) => d.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1 || 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  });

  return (
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        points={points.join(" ")}
      />
    </svg>
  );
}

export default AdminDashboard;

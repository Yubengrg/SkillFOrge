import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LessonManagement from "../components/LessonManagement";
import { API_BASE } from "../config";
import "./Dashboard.css";

function InstructorDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState({
    stats: {},
    trends: { enrollments: [] },
    courses: [],
  });
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [managingLessons, setManagingLessons] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    learning_objectives: "",
    estimated_duration_hours: 0,
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    document.body.classList.add("dashboard-page");
    return () => {
      document.body.classList.remove("dashboard-page");
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [overviewRes, coursesRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/instructor/overview/`, { credentials: "include" }),
          fetch(`${API_BASE}/instructor/courses/`, { credentials: "include" }),
          fetch(`${API_BASE}/instructor/categories/`, { credentials: "include" }),
        ]);

        const overviewData = await overviewRes.json();
        const coursesData = await coursesRes.json();
        const categoriesData = await categoriesRes.json();

        if (overviewRes.ok) setOverview(overviewData);
        if (coursesRes.ok) setCourses(coursesData.courses || []);
        if (categoriesRes.ok) setCategories(categoriesData.categories || []);
      } catch (error) {
        console.error("Error fetching instructor dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const stats = overview.stats || {};
  const trend = overview.trends?.enrollments || [];

  const quickStats = useMemo(() => ([
    {
      title: "Total Courses",
      value: stats.total_courses || 0,
      delta: `${stats.published_courses || 0} published`,
      color: "#14b8a6",
    },
    {
      title: "Total Students",
      value: stats.total_students || 0,
      delta: `${stats.pending_courses || 0} pending`,
      color: "#38bdf8",
    },
    {
      title: "Avg Rating",
      value: stats.avg_rating || 0,
      delta: "Based on latest reviews",
      color: "#f59e0b",
    },
  ]), [stats]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();

    try {
      const objectives = formData.learning_objectives
        .split(",")
        .map((obj) => obj.trim())
        .filter((obj) => obj);

      const res = await fetch(`${API_BASE}/instructor/courses/create/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          learning_objectives: objectives,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setShowCreateForm(false);
        setFormData({
          title: "",
          description: "",
          category: "",
          level: "beginner",
          learning_objectives: "",
          estimated_duration_hours: 0,
        });
        window.location.reload();
      } else {
        alert(data.error || "Failed to create course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Error creating course");
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const res = await fetch(`${API_BASE}/instructor/courses/${courseId}/delete/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        alert("Course deleted");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    } finally {
      navigate("/");
    }
  };

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
        <div className="dash-sidebar__top">
          <div className="dash-brand">
            <span className="dash-brand__dot" />
            Instructor Studio
          </div>
          <button
            type="button"
            className="dash-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
        <nav className="dash-nav">
          <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
            Overview
          </button>
          <button className={activeTab === "courses" ? "active" : ""} onClick={() => setActiveTab("courses")}>
            My Courses
          </button>
          <button className="muted" onClick={() => navigate("/")} style={{ marginTop: "1rem" }}>
            ← Back to site
          </button>
        </nav>
        {mobileMenuOpen && (
          <div className="dash-mobile-menu">
            <div className="dash-mobile-user">
              <span className="dash-mobile-avatar">
                {currentUser?.first_name
                  ? currentUser.first_name[0].toUpperCase()
                  : currentUser?.email?.[0]?.toUpperCase() || "U"}
              </span>
              <div>
                <div className="dash-mobile-name">
                  {currentUser?.first_name || currentUser?.email || "User"}
                </div>
                <div className="dash-mobile-email">{currentUser?.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/profile");
              }}
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/");
              }}
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/my-learning");
              }}
            >
              My Learning
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/become-instructor");
              }}
            >
              Teach
            </button>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1 className="dash-title">Instructor performance hub</h1>
            <p className="dash-subtitle">Track enrollments, engagement, and course health.</p>
          </div>
          <div className="action-row">
            <button className="action-btn" onClick={() => setShowCreateForm(true)}>
              + New course
            </button>
            <button className="action-btn secondary" onClick={() => setActiveTab("courses")}>Manage courses</button>
          </div>
        </header>

        {activeTab === "overview" && (
          <>
            <section className="dash-kpis">
              {quickStats.map((item) => (
                <div className="kpi-card" key={item.title}>
                  <span className="kpi-label">{item.title}</span>
                  <span className="kpi-value">{item.value}</span>
                  <span className="kpi-delta">{item.delta}</span>
                </div>
              ))}
              <div className="kpi-card">
                <span className="kpi-label">Enrollments (14 days)</span>
                <span className="kpi-value">
                  {trend.reduce((sum, day) => sum + day.count, 0)}
                </span>
                <span className="kpi-delta">Recent growth</span>
                <Sparkline data={trend} stroke="#14b8a6" />
              </div>
            </section>

            <section className="dash-grid">
              <div className="dash-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Top performing courses</div>
                    <div className="panel-muted">Sorted by enrollments</div>
                  </div>
                  <span className="pill">{overview.courses.length}</span>
                </div>
                <div className="course-grid">
                  {overview.courses.map((course) => (
                    <div key={course.id} className="course-card">
                      <div>
                        <h3>{course.title}</h3>
                        <div className="meta">{course.category || "Uncategorized"} · {course.level}</div>
                      </div>
                      <div>
                        <div className="metric">{course.enrollments}</div>
                        <div className="meta">Enrollments</div>
                      </div>
                      <div className="meta">
                        Completion {course.completion_rate}% · Quiz pass {course.quiz_pass_rate}%
                      </div>
                      <div className="action-row">
                        <button className="action-btn" onClick={() => setManagingLessons(course.id)}>
                          Manage lessons
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dash-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Course health signals</div>
                    <div className="panel-muted">Quick checks before publishing.</div>
                  </div>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Avg progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.courses.map((course) => (
                      <tr key={course.id}>
                        <td>{course.title}</td>
                        <td>{course.avg_progress}%</td>
                        <td>
                          <span className={`status-pill ${course.is_published ? "success" : "warning"}`}>
                            {course.is_published ? "Published" : "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === "courses" && (
          <section className="dash-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Your courses</div>
                <div className="panel-muted">Manage lessons, approval status, and enrollments.</div>
              </div>
              <span className="pill">{courses.length}</span>
            </div>
            {courses.length === 0 ? (
              <p className="panel-muted">You haven't created any courses yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Students</th>
                    <th>Status</th>
                    <th className="actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{course.title}</div>
                        <div className="panel-muted">{course.category} · {course.level}</div>
                      </td>
                      <td>{course.enrollment_count}</td>
                      <td>
                        <span className={`status-pill ${course.is_approved ? "success" : "warning"}`}>
                          {course.is_approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="action-row">
                          <button className="action-btn" onClick={() => setManagingLessons(course.id)}>
                            Lessons
                          </button>
                          <button className="action-btn danger" onClick={() => handleDeleteCourse(course.id)}>
                            Delete
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

        {showCreateForm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: "1.2rem",
              maxWidth: "600px",
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
                Create new course
              </h2>
              <form onSubmit={handleCreateCourse}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Course Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "0.7rem", border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Description *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "0.7rem", border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "0.7rem", border: "1px solid #e5e7eb" }}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "0.7rem", border: "1px solid #e5e7eb" }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Learning Objectives</label>
                  <input
                    type="text"
                    value={formData.learning_objectives}
                    onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                    placeholder="HTML, CSS, JavaScript"
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "0.7rem", border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600 }}>Estimated Duration (hours)</label>
                  <input
                    type="number"
                    value={formData.estimated_duration_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "0.7rem", border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div className="action-row">
                  <button type="submit" className="action-btn">Create course</button>
                  <button type="button" className="action-btn secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {managingLessons && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              background: "#fff",
              borderRadius: "1rem",
              maxWidth: "1200px",
              width: "95%",
              maxHeight: "90vh",
              overflow: "hidden",
            }}>
              <LessonManagement courseId={managingLessons} onClose={() => setManagingLessons(null)} />
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

export default InstructorDashboard;

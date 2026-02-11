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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState("all");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userDetail, setUserDetail] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentSearch, setPaymentSearch] = useState("");

  useEffect(() => {
    if (!currentUser?.is_staff) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    document.body.classList.add("dashboard-page");
    return () => {
      document.body.classList.remove("dashboard-page");
    };
  }, []);

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

  useEffect(() => {
    if (activeTab !== "users") return;

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError("");
        const params = new URLSearchParams();
        if (userQuery.trim()) params.set("search", userQuery.trim());
        if (userRole !== "all") params.set("role", userRole);
        const res = await fetch(`${API_BASE}/admin/users/?${params.toString()}`, {
          credentials: "include",
        });
        const payload = await res.json();
        if (res.ok) {
          setUsers(payload.users || []);
        } else {
          setUsersError(payload.error || "Unable to load users.");
        }
      } catch (error) {
        console.error("Failed to load users", error);
        setUsersError("Unable to load users.");
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab, userQuery, userRole]);

  useEffect(() => {
    if (activeTab !== "payments") return;

    const fetchPayments = async () => {
      try {
        setPaymentsLoading(true);
        setPaymentsError("");
        const params = new URLSearchParams();
        if (paymentSearch.trim()) params.set("search", paymentSearch.trim());
        if (paymentStatus !== "all") params.set("status", paymentStatus);
        const res = await fetch(`${API_BASE}/admin/payments/?${params.toString()}`, {
          credentials: "include",
        });
        const payload = await res.json();
        if (res.ok) {
          setPayments(payload.payments || []);
        } else {
          setPaymentsError(payload.error || "Unable to load payments.");
        }
      } catch (error) {
        console.error("Failed to load payments", error);
        setPaymentsError("Unable to load payments.");
      } finally {
        setPaymentsLoading(false);
      }
    };

    fetchPayments();
  }, [activeTab, paymentSearch, paymentStatus]);

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

  const fetchUserDetail = async (userId) => {
    try {
      setUserDetailLoading(true);
      setUserActionMessage("");
      const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
        credentials: "include",
      });
      const payload = await res.json();
      if (res.ok) {
        setUserDetail(payload);
      } else {
        setUserActionMessage(payload.error || "Unable to load user details.");
      }
    } catch (error) {
      console.error("Failed to load user detail", error);
      setUserActionMessage("Unable to load user details.");
    } finally {
      setUserDetailLoading(false);
    }
  };

  const runUserAction = async (userId, endpoint, method = "POST", body) => {
    try {
      setUserActionMessage("");
      const res = await fetch(`${API_BASE}/admin/users/${userId}/${endpoint}/`, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json();
      if (!res.ok) {
        setUserActionMessage(payload.error || "Action failed.");
        return;
      }
      if (endpoint === "delete") {
        setUserDetail(null);
        await fetchUsersAfterAction();
        return;
      }
      if (payload.temp_password) {
        setUserActionMessage(`Temporary password: ${payload.temp_password}`);
      } else if (payload.sessions_cleared !== undefined) {
        setUserActionMessage(`Sessions cleared: ${payload.sessions_cleared}`);
      } else {
        setUserActionMessage("Action completed.");
      }
      await fetchUsersAfterAction();
      await fetchUserDetail(userId);
    } catch (error) {
      console.error("User action failed", error);
      setUserActionMessage("Action failed.");
    }
  };

  const exportUserData = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/export/`, {
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) {
        setUserActionMessage(payload.error || "Export failed.");
        return;
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-${userId}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      setUserActionMessage("Export failed.");
    }
  };

  const updatePaymentStatus = async (paymentId, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/update/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setPaymentsError(payload.error || "Payment update failed.");
        return;
      }
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status } : p))
      );
    } catch (error) {
      console.error("Payment update failed", error);
      setPaymentsError("Payment update failed.");
    }
  };

  const fetchUsersAfterAction = async () => {
    const params = new URLSearchParams();
    if (userQuery.trim()) params.set("search", userQuery.trim());
    if (userRole !== "all") params.set("role", userRole);
    const res = await fetch(`${API_BASE}/admin/users/?${params.toString()}`, {
      credentials: "include",
    });
    const payload = await res.json();
    if (res.ok) {
      setUsers(payload.users || []);
    }
  };

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
        <div className="dash-sidebar__top">
          <div className="dash-brand">
            <span className="dash-brand__dot" />
            Admin Studio
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
          <button
            className={activeTab === "payments" ? "active" : ""}
            onClick={() => setActiveTab("payments")}
          >
            Payments
          </button>
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            User Management
          </button>
          <button className="muted" onClick={() => navigate("/")}
            style={{ marginTop: "1rem" }}>
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
                    <th>Price</th>
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
                      <td>{course.price_npr > 0 ? `NPR ${course.price_npr}` : "Free"}</td>
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

        {activeTab === "payments" && (
          <section className="dash-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Payments</div>
                <div className="panel-muted">Review and update payment status.</div>
              </div>
              <span className="pill">{payments.length}</span>
            </div>

            <div className="admin-filter-row">
              <input
                className="admin-input"
                type="search"
                placeholder="Search by email, course, or reference"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
              />
              <select
                className="admin-select"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {paymentsLoading ? (
              <p className="panel-muted">Loading payments...</p>
            ) : paymentsError ? (
              <p className="panel-muted">{paymentsError}</p>
            ) : payments.length === 0 ? (
              <p className="panel-muted">No payments found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Course</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{payment.user_email}</div>
                        <div className="panel-muted">{payment.provider_reference || "-"}</div>
                      </td>
                      <td>{payment.course_title}</td>
                      <td>{payment.amount} {payment.currency}</td>
                      <td>
                        <span className={`status-pill ${payment.status === "paid" ? "success" : payment.status === "refunded" ? "warning" : ""}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="action-row">
                          <button
                            className="action-btn secondary"
                            onClick={() => updatePaymentStatus(payment.id, "paid")}
                          >
                            Mark Paid
                          </button>
                          <button
                            className="action-btn"
                            onClick={() => updatePaymentStatus(payment.id, "refunded")}
                          >
                            Refund
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

        {activeTab === "users" && (
          <section className="dash-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">User management</div>
                <div className="panel-muted">Search, filter, and audit user activity.</div>
              </div>
              <span className="pill">{users.length}</span>
            </div>

            <div className="admin-filter-row">
              <input
                className="admin-input"
                type="search"
                placeholder="Search by name or email"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <select
                className="admin-select"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option value="all">All roles</option>
                <option value="admin">Admins</option>
                <option value="instructor">Instructors</option>
                <option value="learner">Learners</option>
              </select>
            </div>

            {usersLoading ? (
              <p className="panel-muted">Loading users...</p>
            ) : usersError ? (
              <p className="panel-muted">{usersError}</p>
            ) : users.length === 0 ? (
              <p className="panel-muted">No users found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last login</th>
                    <th className="actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    let roleLabel = "Learner";
                    if (user.is_staff) roleLabel = "Admin";
                    else if (user.is_instructor) roleLabel = "Instructor";
                    return (
                      <tr key={user.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{user.name}</div>
                          <div className="panel-muted ellipsis">{user.email}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${roleLabel === "Admin" ? "warning" : ""}`}>
                            {roleLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${user.is_active ? "success" : "warning"}`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{user.date_joined ? new Date(user.date_joined).toLocaleString() : "-"}</td>
                        <td>{user.last_login ? new Date(user.last_login).toLocaleString() : "-"}</td>
                        <td className="actions">
                          <button
                            className="action-btn secondary"
                            onClick={() => fetchUserDetail(user.id)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        {userDetail && (
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
            onClick={() => setUserDetail(null)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "1rem",
                maxWidth: 720,
                width: "100%",
                maxHeight: "85vh",
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
                  <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{userDetail.user.name}</h3>
                  <p className="panel-muted" style={{ marginTop: "0.25rem" }}>{userDetail.user.email}</p>
                </div>
                <button className="action-btn secondary" onClick={() => setUserDetail(null)}>
                  Close
                </button>
              </div>

              <div style={{ padding: "1rem 1.5rem", overflowY: "auto" }}>
                {userDetailLoading ? (
                  <p className="panel-muted">Loading user details...</p>
                ) : (
                  <>
                    <div className="admin-action-row">
                      <button
                        className="action-btn secondary"
                        onClick={() => {
                          setUserDetail(null);
                          navigate(`/profile/${userDetail.user.id}`);
                        }}
                      >
                        View Profile
                      </button>
                    </div>

                    <div className="admin-action-row">
                      <button
                        className="action-btn"
                        onClick={() => runUserAction(userDetail.user.id, "activate", "POST", { is_active: !userDetail.user.is_active })}
                      >
                        {userDetail.user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={() => runUserAction(userDetail.user.id, "make-admin")}
                      >
                        Make Admin
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={() => runUserAction(userDetail.user.id, "remove-admin")}
                      >
                        Remove Admin
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => runUserAction(userDetail.user.id, "approve-instructor")}
                      >
                        Approve Instructor
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={() => runUserAction(userDetail.user.id, "revoke-instructor")}
                      >
                        Revoke Instructor
                      </button>
                    </div>

                    <div className="admin-action-row">
                      <button
                        className="action-btn secondary"
                        onClick={() => runUserAction(userDetail.user.id, "force-logout")}
                      >
                        Force Logout
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={() => runUserAction(userDetail.user.id, "reset-password")}
                      >
                        Reset Password
                      </button>
                      <button
                        className="action-btn secondary"
                        onClick={() => exportUserData(userDetail.user.id)}
                      >
                        Export JSON
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => {
                          if (confirm("Delete this user? This cannot be undone.")) {
                            runUserAction(userDetail.user.id, "delete", "DELETE");
                          }
                        }}
                      >
                        Delete User
                      </button>
                    </div>

                    {userActionMessage && (
                      <p className="panel-muted" style={{ marginTop: "0.75rem" }}>
                        {userActionMessage}
                      </p>
                    )}

                    <div style={{ marginTop: "1rem" }}>
                      <h4 style={{ marginBottom: "0.4rem" }}>Profile</h4>
                      <p className="panel-muted">
                        {userDetail.profile.bio || "No bio"}
                      </p>
                      {userDetail.profile.profile_photo && (
                        <img
                          src={userDetail.profile.profile_photo}
                          alt="Profile"
                          style={{ width: 80, height: 80, borderRadius: "50%", marginTop: "0.5rem" }}
                        />
                      )}
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      <h4 style={{ marginBottom: "0.4rem" }}>Recent activity</h4>
                      {userDetail.activities.length === 0 ? (
                        <p className="panel-muted">No recent activity.</p>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569" }}>
                          {userDetail.activities.map((activity, idx) => (
                            <li key={`${activity.type}-${idx}`}>
                              {activity.description} — {new Date(activity.created_at).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      <h4 style={{ marginBottom: "0.4rem" }}>Payments</h4>
                      {userDetail.payments.length === 0 ? (
                        <p className="panel-muted">No payments.</p>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569" }}>
                          {userDetail.payments.map((payment) => (
                            <li key={payment.id}>
                              {payment.course_title} — {payment.amount} {payment.currency} ({payment.status})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
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

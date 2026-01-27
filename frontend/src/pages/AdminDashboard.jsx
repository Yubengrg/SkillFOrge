// Admin Dashboard - Main Page
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000/api";

function AdminDashboard({ currentUser }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [pendingInstructors, setPendingInstructors] = useState([]);
    const [pendingCourses, setPendingCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    // Check if user is admin
    useEffect(() => {
        if (!currentUser?.is_staff) {
            navigate("/");
        }
    }, [currentUser, navigate]);

    // Fetch data
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch stats
            const statsRes = await fetch(`${API_BASE}/admin/stats/`, {
                credentials: "include",
            });
            const statsData = await statsRes.json();
            setStats(statsData.stats);

            // Fetch pending instructors
            const instructorsRes = await fetch(`${API_BASE}/admin/instructors/pending/`, {
                credentials: "include",
            });
            const instructorsData = await instructorsRes.json();
            setPendingInstructors(instructorsData.instructors || []);

            // Fetch pending courses
            const coursesRes = await fetch(`${API_BASE}/admin/courses/pending/`, {
                credentials: "include",
            });
            const coursesData = await coursesRes.json();
            setPendingCourses(coursesData.courses || []);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveInstructor = async (instructorId) => {
        try {
            const res = await fetch(`${API_BASE}/admin/instructors/${instructorId}/approve/`, {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                alert("Instructor approved!");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Error approving instructor:", error);
        }
    };

    const handleRejectInstructor = async (instructorId) => {
        if (!confirm("Are you sure you want to reject this instructor application?")) return;

        try {
            const res = await fetch(`${API_BASE}/admin/instructors/${instructorId}/reject/`, {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                alert("Instructor rejected");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Error rejecting instructor:", error);
        }
    };

    const handleApproveCourse = async (courseId) => {
        try {
            const res = await fetch(`${API_BASE}/admin/courses/${courseId}/approve/`, {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                alert("Course approved and published!");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Error approving course:", error);
        }
    };

    const handleRejectCourse = async (courseId) => {
        const reason = prompt("Reason for rejection (optional):");

        try {
            const res = await fetch(`${API_BASE}/admin/courses/${courseId}/reject/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
            });

            if (res.ok) {
                alert("Course rejected");
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Error rejecting course:", error);
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
        <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
            {/* Sidebar */}
            <aside style={{
                width: "250px",
                background: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                padding: "2rem 1rem",
                position: "fixed",
                height: "100vh",
                overflowY: "auto"
            }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>
                    Admin Panel
                </h2>

                <nav>
                    <button
                        onClick={() => setActiveTab("overview")}
                        style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            background: activeTab === "overview" ? "rgba(255,255,255,0.2)" : "transparent",
                            border: "none",
                            color: "#fff",
                            textAlign: "left",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            marginBottom: "0.5rem",
                            fontSize: "0.95rem"
                        }}
                    >
                        📊 Overview
                    </button>

                    <button
                        onClick={() => setActiveTab("instructors")}
                        style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            background: activeTab === "instructors" ? "rgba(255,255,255,0.2)" : "transparent",
                            border: "none",
                            color: "#fff",
                            textAlign: "left",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            marginBottom: "0.5rem",
                            fontSize: "0.95rem"
                        }}
                    >
                        👨‍🏫 Instructors ({stats?.pending_instructors || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab("courses")}
                        style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            background: activeTab === "courses" ? "rgba(255,255,255,0.2)" : "transparent",
                            border: "none",
                            color: "#fff",
                            textAlign: "left",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            marginBottom: "0.5rem",
                            fontSize: "0.95rem"
                        }}
                    >
                        📚 Courses ({stats?.pending_courses || 0})
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            textAlign: "left",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            marginTop: "2rem",
                            fontSize: "0.95rem"
                        }}
                    >
                        ← Back to Site
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: "250px", flex: 1, padding: "2rem" }}>
                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
                            Dashboard Overview
                        </h1>

                        {/* Stats Cards */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "1.5rem",
                            marginBottom: "3rem"
                        }}>
                            <StatsCard
                                title="Total Users"
                                value={stats?.total_users || 0}
                                subtitle={`+${stats?.new_users_last_month || 0} this month`}
                                icon="👥"
                                color="#667eea"
                            />
                            <StatsCard
                                title="Total Courses"
                                value={stats?.total_courses || 0}
                                subtitle={`${stats?.pending_courses || 0} pending approval`}
                                icon="📚"
                                color="#10b981"
                            />
                            <StatsCard
                                title="Total Enrollments"
                                value={stats?.total_enrollments || 0}
                                subtitle={`+${stats?.new_enrollments_last_month || 0} this month`}
                                icon="✅"
                                color="#f59e0b"
                            />
                            <StatsCard
                                title="Instructors"
                                value={stats?.total_instructors || 0}
                                subtitle={`${stats?.pending_instructors || 0} pending approval`}
                                icon="👨‍🏫"
                                color="#ef4444"
                            />
                        </div>

                        {/* Quick Actions */}
                        <div style={{
                            background: "#fff",
                            padding: "2rem",
                            borderRadius: "1rem",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.08)"
                        }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                Quick Actions
                            </h2>
                            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                                <button
                                    onClick={() => setActiveTab("instructors")}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        background: "#667eea",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        cursor: "pointer",
                                        fontWeight: 600
                                    }}
                                >
                                    Review Instructors ({stats?.pending_instructors || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab("courses")}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        background: "#10b981",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        cursor: "pointer",
                                        fontWeight: 600
                                    }}
                                >
                                    Review Courses ({stats?.pending_courses || 0})
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructors Tab */}
                {activeTab === "instructors" && (
                    <div>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
                            Pending Instructor Applications
                        </h1>

                        {pendingInstructors.length === 0 ? (
                            <p style={{ color: "#6b7280" }}>No pending instructor applications</p>
                        ) : (
                            <div style={{ display: "grid", gap: "1.5rem" }}>
                                {pendingInstructors.map((instructor) => (
                                    <div
                                        key={instructor.id}
                                        style={{
                                            background: "#fff",
                                            padding: "1.5rem",
                                            borderRadius: "1rem",
                                            boxShadow: "0 4px 15px rgba(0,0,0,0.08)"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                                    {instructor.name}
                                                </h3>
                                                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                                                    {instructor.email}
                                                </p>
                                                <p style={{ marginBottom: "1rem" }}>
                                                    <strong>Bio:</strong> {instructor.bio || "No bio provided"}
                                                </p>
                                                <p>
                                                    <strong>Expertise:</strong> {instructor.expertise?.join(", ") || "None specified"}
                                                </p>
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button
                                                    onClick={() => handleApproveInstructor(instructor.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "#10b981",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "0.5rem",
                                                        cursor: "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectInstructor(instructor.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "#ef4444",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "0.5rem",
                                                        cursor: "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Courses Tab */}
                {activeTab === "courses" && (
                    <div>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
                            Pending Course Approvals
                        </h1>

                        {pendingCourses.length === 0 ? (
                            <p style={{ color: "#6b7280" }}>No pending course approvals</p>
                        ) : (
                            <div style={{ display: "grid", gap: "1.5rem" }}>
                                {pendingCourses.map((course) => (
                                    <div
                                        key={course.id}
                                        style={{
                                            background: "#fff",
                                            padding: "1.5rem",
                                            borderRadius: "1rem",
                                            boxShadow: "0 4px 15px rgba(0,0,0,0.08)"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                                    {course.title}
                                                </h3>
                                                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                                                    by {course.instructor_name} • {course.category} • {course.level}
                                                </p>
                                                <p style={{ marginBottom: "1rem" }}>
                                                    {course.description}
                                                </p>
                                                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                                                    {course.lesson_count} lessons
                                                </p>
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button
                                                    onClick={() => handleApproveCourse(course.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "#10b981",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "0.5rem",
                                                        cursor: "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectCourse(course.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "#ef4444",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "0.5rem",
                                                        cursor: "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// Stats Card Component
function StatsCard({ title, value, subtitle, icon, color }) {
    return (
        <div style={{
            background: "#fff",
            padding: "1.5rem",
            borderRadius: "1rem",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            borderLeft: `4px solid ${color}`
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                    <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        {title}
                    </p>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>
                        {value}
                    </p>
                    <p style={{ color: "#10b981", fontSize: "0.85rem" }}>
                        {subtitle}
                    </p>
                </div>
                <div style={{ fontSize: "2.5rem" }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;

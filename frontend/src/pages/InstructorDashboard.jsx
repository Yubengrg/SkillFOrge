// Instructor Dashboard - Main Page
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LessonManagement from "../components/LessonManagement";

const API_BASE = "http://localhost:8000/api";

function InstructorDashboard({ currentUser }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [managingLessons, setManagingLessons] = useState(null); // Course ID for lesson management

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        level: "beginner",
        learning_objectives: "",
        estimated_duration_hours: 0
    });

    // Check if user is approved instructor
    useEffect(() => {
        checkInstructorStatus();
    }, [currentUser]);

    const checkInstructorStatus = async () => {
        if (!currentUser) {
            navigate("/login");
            return;
        }

        // Check if user is an approved instructor
        // This would ideally come from currentUser object
        // For now, we'll try to fetch instructor stats
        try {
            const res = await fetch(`${API_BASE}/instructor/stats/`, {
                credentials: "include",
            });

            if (!res.ok) {
                alert("You are not an approved instructor");
                navigate("/");
            }
        } catch (error) {
            console.error("Error checking instructor status:", error);
            navigate("/");
        }
    };

    // Fetch data
    useEffect(() => {
        if (currentUser) {
            fetchDashboardData();
        }
    }, [currentUser]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch stats
            const statsRes = await fetch(`${API_BASE}/instructor/stats/`, {
                credentials: "include",
            });
            const statsData = await statsRes.json();
            setStats(statsData.stats);

            // Fetch courses
            const coursesRes = await fetch(`${API_BASE}/instructor/courses/`, {
                credentials: "include",
            });
            const coursesData = await coursesRes.json();
            setCourses(coursesData.courses || []);

            // Fetch categories
            const categoriesRes = await fetch(`${API_BASE}/instructor/categories/`, {
                credentials: "include",
            });
            const categoriesData = await categoriesRes.json();
            setCategories(categoriesData.categories || []);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();

        try {
            const objectives = formData.learning_objectives
                .split(",")
                .map(obj => obj.trim())
                .filter(obj => obj);

            const res = await fetch(`${API_BASE}/instructor/courses/create/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    learning_objectives: objectives
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
                    estimated_duration_hours: 0
                });
                fetchDashboardData();
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
                fetchDashboardData();
            }
        } catch (error) {
            console.error("Error deleting course:", error);
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
                background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                padding: "2rem 1rem",
                position: "fixed",
                height: "100vh",
                overflowY: "auto"
            }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>
                    Instructor Portal
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
                        📚 My Courses ({courses.length})
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
                            Instructor Dashboard
                        </h1>

                        {/* Stats Cards */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "1.5rem",
                            marginBottom: "3rem"
                        }}>
                            <StatsCard
                                title="Total Courses"
                                value={stats?.total_courses || 0}
                                subtitle={`${stats?.published_courses || 0} published`}
                                icon="📚"
                                color="#10b981"
                            />
                            <StatsCard
                                title="Total Students"
                                value={stats?.total_students || 0}
                                subtitle="Across all courses"
                                icon="👥"
                                color="#667eea"
                            />
                            <StatsCard
                                title="Pending Approval"
                                value={stats?.pending_courses || 0}
                                subtitle="Awaiting admin review"
                                icon="⏳"
                                color="#f59e0b"
                            />
                            <StatsCard
                                title="Average Rating"
                                value={stats?.avg_rating || 0}
                                subtitle="⭐⭐⭐⭐⭐"
                                icon="⭐"
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
                            <button
                                onClick={() => setShowCreateForm(true)}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: "#10b981",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "1rem"
                                }}
                            >
                                + Create New Course
                            </button>
                        </div>
                    </div>
                )}

                {/* Courses Tab */}
                {activeTab === "courses" && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
                                My Courses
                            </h1>
                            <button
                                onClick={() => setShowCreateForm(true)}
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
                                + Create New Course
                            </button>
                        </div>

                        {courses.length === 0 ? (
                            <p style={{ color: "#6b7280" }}>You haven't created any courses yet</p>
                        ) : (
                            <div style={{ display: "grid", gap: "1.5rem" }}>
                                {courses.map((course) => (
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
                                                    {course.category} • {course.level} • {course.lesson_count} lessons
                                                </p>
                                                <p style={{ marginBottom: "1rem" }}>
                                                    {course.description}
                                                </p>
                                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                    <span style={{
                                                        padding: "0.25rem 0.75rem",
                                                        background: course.is_published ? "#10b981" : "#6b7280",
                                                        color: "#fff",
                                                        borderRadius: "1rem",
                                                        fontSize: "0.85rem"
                                                    }}>
                                                        {course.is_published ? "Published" : "Unpublished"}
                                                    </span>
                                                    <span style={{
                                                        padding: "0.25rem 0.75rem",
                                                        background: course.is_approved ? "#10b981" : "#f59e0b",
                                                        color: "#fff",
                                                        borderRadius: "1rem",
                                                        fontSize: "0.85rem"
                                                    }}>
                                                        {course.is_approved ? "Approved" : "Pending Approval"}
                                                    </span>
                                                    <span style={{
                                                        padding: "0.25rem 0.75rem",
                                                        background: "#667eea",
                                                        color: "#fff",
                                                        borderRadius: "1rem",
                                                        fontSize: "0.85rem"
                                                    }}>
                                                        {course.enrollment_count} students
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button
                                                    onClick={() => setManagingLessons(course.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "#667eea",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "0.5rem",
                                                        cursor: "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    Manage Lessons
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCourse(course.id)}
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
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Create Course Modal */}
                {showCreateForm && (
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
                        zIndex: 1000
                    }}>
                        <div style={{
                            background: "#fff",
                            padding: "2rem",
                            borderRadius: "1rem",
                            maxWidth: "600px",
                            width: "90%",
                            maxHeight: "90vh",
                            overflowY: "auto"
                        }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                Create New Course
                            </h2>

                            <form onSubmit={handleCreateCourse}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Course Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Description *
                                    </label>
                                    <textarea
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Level
                                    </label>
                                    <select
                                        value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Learning Objectives (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.learning_objectives}
                                        onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                                        placeholder="HTML, CSS, JavaScript, React"
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Estimated Duration (hours)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.estimated_duration_hours}
                                        onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    />
                                </div>

                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: "0.75rem",
                                            background: "#10b981",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "0.5rem",
                                            cursor: "pointer",
                                            fontWeight: 600,
                                            fontSize: "1rem"
                                        }}
                                    >
                                        Create Course
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        style={{
                                            flex: 1,
                                            padding: "0.75rem",
                                            background: "#6b7280",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "0.5rem",
                                            cursor: "pointer",
                                            fontWeight: 600,
                                            fontSize: "1rem"
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Lesson Management Modal */}
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
                        zIndex: 1000
                    }}>
                        <div style={{
                            background: "#fff",
                            borderRadius: "1rem",
                            maxWidth: "1200px",
                            width: "95%",
                            maxHeight: "90vh",
                            overflow: "hidden"
                        }}>
                            <LessonManagement
                                courseId={managingLessons}
                                onClose={() => setManagingLessons(null)}
                            />
                        </div>
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

export default InstructorDashboard;

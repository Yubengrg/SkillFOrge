// Professional User Profile Page
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LearningStreakHeatmap from "../components/LearningStreakHeatmap";

const API_BASE = "http://localhost:8000/api";

function ProfilePage({ currentUser }) {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const isOwnProfile = !userId || (currentUser && currentUser.id === parseInt(userId));

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const endpoint = userId ? `/profile/${userId}/` : "/profile/me/";
            const res = await fetch(API_BASE + endpoint, {
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(data.profile);
                setEditForm({
                    first_name: data.profile.first_name,
                    last_name: data.profile.last_name,
                    bio: data.profile.bio || "",
                    location: data.profile.location || "",
                    website: data.profile.website || "",
                    social_links: data.profile.social_links || {},
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const formData = new FormData();
            formData.append("first_name", editForm.first_name);
            formData.append("last_name", editForm.last_name);
            formData.append("bio", editForm.bio || "");
            formData.append("location", editForm.location || "");
            formData.append("website", editForm.website || "");
            formData.append("social_links", JSON.stringify(editForm.social_links || {}));

            if (photoFile) {
                formData.append("profile_photo", photoFile);
            }

            const res = await fetch(API_BASE + "/profile/update/", {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (res.ok) {
                setIsEditing(false);
                setPhotoFile(null);
                setPhotoPreview(null);
                fetchProfile();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return (
            <main style={{ flex: 1, padding: "3rem 2rem", background: "#f9fafb" }}>
                <div style={{ textAlign: "center", color: "#6b7280" }}>Loading profile...</div>
            </main>
        );
    }

    if (!profile) {
        return (
            <main style={{ flex: 1, padding: "3rem 2rem", background: "#f9fafb" }}>
                <div style={{ textAlign: "center", color: "#6b7280" }}>Profile not found</div>
            </main>
        );
    }

    const getInitials = () => {
        const first = profile.first_name?.charAt(0) || "";
        const last = profile.last_name?.charAt(0) || "";
        return (first + last).toUpperCase() || "U";
    };

    return (
        <main style={{ flex: 1, background: "#f9fafb", padding: "2rem 1rem" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto" }}>
                {/* Profile Header */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "1rem",
                        padding: "2.5rem",
                        marginBottom: "2rem",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                    }}
                >
                    <div style={{ display: "flex", gap: "2rem", alignItems: "start", flexWrap: "wrap" }}>
                        {/* Avatar */}
                        <div
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: "50%",
                                background: profile.profile_photo ? "transparent" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ffffff",
                                fontSize: "2.5rem",
                                fontWeight: 700,
                                flexShrink: 0,
                                overflow: "hidden",
                                border: "4px solid #ffffff",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            }}
                        >
                            {profile.profile_photo ? (
                                <img src={profile.profile_photo} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                getInitials()
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 250 }}>
                            {isEditing ? (
                                <div>
                                    {/* Photo Upload */}
                                    <div style={{ marginBottom: "1rem", textAlign: "center" }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            style={{ display: "none" }}
                                            id="photo-upload"
                                        />
                                        <label
                                            htmlFor="photo-upload"
                                            style={{
                                                display: "inline-block",
                                                padding: "0.5rem 1rem",
                                                background: "#eef2ff",
                                                color: "#667eea",
                                                borderRadius: "0.5rem",
                                                cursor: "pointer",
                                                fontSize: "0.875rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            📷 {photoPreview ? "Change Photo" : "Upload Photo"}
                                        </label>
                                        {photoPreview && (
                                            <div style={{ marginTop: "0.75rem" }}>
                                                <img
                                                    src={photoPreview}
                                                    alt="Preview"
                                                    style={{
                                                        width: 80,
                                                        height: 80,
                                                        borderRadius: "50%",
                                                        objectFit: "cover",
                                                        border: "3px solid #667eea",
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        placeholder="First Name"
                                        style={{
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginRight: "0.5rem",
                                            marginBottom: "0.5rem",
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        placeholder="Last Name"
                                        style={{
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "1rem",
                                        }}
                                    />
                                    <textarea
                                        value={editForm.bio || ""}
                                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                        placeholder="Bio (tell us about yourself...)"
                                        rows={4}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            fontFamily: "inherit",
                                            marginBottom: "0.75rem",
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={editForm.location || ""}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        placeholder="Location (e.g., San Francisco, CA)"
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "0.5rem",
                                        }}
                                    />
                                    <input
                                        type="url"
                                        value={editForm.website || ""}
                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        placeholder="Website (https://...)"
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "0.5rem",
                                        }}
                                    />
                                    <input
                                        type="url"
                                        value={editForm.social_links?.linkedin || ""}
                                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, linkedin: e.target.value } })}
                                        placeholder="LinkedIn URL"
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "0.5rem",
                                        }}
                                    />
                                    <input
                                        type="url"
                                        value={editForm.social_links?.twitter || ""}
                                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, twitter: e.target.value } })}
                                        placeholder="Twitter URL"
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "0.5rem",
                                        }}
                                    />
                                    <input
                                        type="url"
                                        value={editForm.social_links?.github || ""}
                                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, github: e.target.value } })}
                                        placeholder="GitHub URL"
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "1rem",
                                        }}
                                    />
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button
                                            onClick={handleSaveProfile}
                                            style={{
                                                padding: "0.5rem 1.5rem",
                                                background: "#667eea",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "0.5rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            style={{
                                                padding: "0.5rem 1.5rem",
                                                background: "#e5e7eb",
                                                color: "#374151",
                                                border: "none",
                                                borderRadius: "0.5rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                        {profile.first_name} {profile.last_name}
                                    </h1>
                                    <div
                                        style={{
                                            display: "inline-block",
                                            padding: "0.35rem 1rem",
                                            background: profile.role === "instructor" ? "#eef2ff" : "#f0fdf4",
                                            color: profile.role === "instructor" ? "#667eea" : "#10b981",
                                            borderRadius: "50px",
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                            marginBottom: "1rem",
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {profile.role}
                                    </div>
                                    {profile.bio && (
                                        <p style={{ color: "#6b7280", lineHeight: 1.6, marginBottom: "1rem" }}>
                                            {profile.bio}
                                        </p>
                                    )}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.9rem", color: "#6b7280", marginTop: "0.75rem" }}>
                                        {profile.location && <span>📍 {profile.location}</span>}
                                        {profile.website && (
                                            <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: "#667eea", textDecoration: "none" }}>
                                                🔗 Website
                                            </a>
                                        )}
                                        {profile.social_links?.linkedin && (
                                            <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: "#667eea", textDecoration: "none" }}>
                                                💼 LinkedIn
                                            </a>
                                        )}
                                        {profile.social_links?.twitter && (
                                            <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ color: "#667eea", textDecoration: "none" }}>
                                                🐦 Twitter
                                            </a>
                                        )}
                                        {profile.social_links?.github && (
                                            <a href={profile.social_links.github} target="_blank" rel="noopener noreferrer" style={{ color: "#667eea", textDecoration: "none" }}>
                                                💻 GitHub
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "0.75rem" }}>
                                        Joined {new Date(profile.joined_date).toLocaleDateString("en-US", {
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Edit Button */}
                        {isOwnProfile && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: "#667eea",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Expertise Tags (Instructor) */}
                    {profile.role === "instructor" && profile.expertise && profile.expertise.length > 0 && (
                        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #f3f4f6" }}>
                            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.75rem" }}>
                                Expertise
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {profile.expertise.map((skill, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            background: "#eef2ff",
                                            color: "#667eea",
                                            borderRadius: "50px",
                                            fontSize: "0.875rem",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                {profile.stats && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "1.5rem",
                            marginBottom: "2rem",
                        }}
                    >
                        {profile.role === "instructor" && (
                            <>
                                <StatCard
                                    title="Total Courses"
                                    value={profile.stats.total_courses}
                                    color="#667eea"
                                    bgColor="#eef2ff"
                                />
                                <StatCard
                                    title="Total Students"
                                    value={profile.stats.total_students}
                                    color="#10b981"
                                    bgColor="#d1fae5"
                                />
                                <StatCard
                                    title="Avg Rating"
                                    value={profile.stats.avg_rating.toFixed(1)}
                                    color="#f59e0b"
                                    bgColor="#fef3c7"
                                    suffix="⭐"
                                />
                            </>
                        )}
                        {profile.role === "student" && (
                            <>
                                <StatCard
                                    title="Courses Completed"
                                    value={profile.stats.courses_completed}
                                    color="#10b981"
                                    bgColor="#d1fae5"
                                />
                                <StatCard
                                    title="In Progress"
                                    value={profile.stats.courses_in_progress}
                                    color="#667eea"
                                    bgColor="#eef2ff"
                                />
                                <StatCard
                                    title="Total Enrolled"
                                    value={profile.stats.total_enrolled}
                                    color="#f59e0b"
                                    bgColor="#fef3c7"
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Learning Streak Heatmap (own profile only) */}
                {isOwnProfile && profile.activity_heatmap && (
                    <LearningStreakHeatmap activityData={profile.activity_heatmap} />
                )}

                {/* Tabs */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "1rem",
                        padding: "2rem",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                    }}
                >
                    {/* Tab Headers */}
                    <div style={{ borderBottom: "2px solid #f3f4f6", marginBottom: "2rem" }}>
                        <div style={{ display: "flex", gap: "2rem" }}>
                            <TabButton
                                label="Overview"
                                active={activeTab === "overview"}
                                onClick={() => setActiveTab("overview")}
                            />
                            {profile.role === "instructor" && profile.courses && (
                                <TabButton
                                    label={`Courses (${profile.courses.length})`}
                                    active={activeTab === "courses"}
                                    onClick={() => setActiveTab("courses")}
                                />
                            )}
                            {profile.role === "student" && isOwnProfile && profile.enrollments && (
                                <TabButton
                                    label={`Learning (${profile.enrollments.length})`}
                                    active={activeTab === "learning"}
                                    onClick={() => setActiveTab("learning")}
                                />
                            )}
                            {profile.achievements && profile.achievements.length > 0 && (
                                <TabButton
                                    label={`Achievements (${profile.achievements.length})`}
                                    active={activeTab === "achievements"}
                                    onClick={() => setActiveTab("achievements")}
                                />
                            )}
                            {isOwnProfile && profile.activities && profile.activities.length > 0 && (
                                <TabButton
                                    label="Activity"
                                    active={activeTab === "activity"}
                                    onClick={() => setActiveTab("activity")}
                                />
                            )}
                        </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "overview" && (
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
                                About
                            </h3>
                            {profile.bio ? (
                                <p style={{ color: "#6b7280", lineHeight: 1.8 }}>{profile.bio}</p>
                            ) : (
                                <p style={{ color: "#9ca3af", fontStyle: "italic" }}>No bio available</p>
                            )}
                        </div>
                    )}

                    {activeTab === "courses" && profile.courses && (
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                Courses Created
                            </h3>
                            <div style={{ display: "grid", gap: "1rem" }}>
                                {profile.courses.map((course) => (
                                    <div
                                        key={course.id}
                                        onClick={() => navigate(`/courses/${course.slug}`)}
                                        style={{
                                            padding: "1.5rem",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "0.75rem",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = "#667eea";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102,126,234,0.15)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = "#e5e7eb";
                                            e.currentTarget.style.boxShadow = "none";
                                        }}
                                    >
                                        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                            {course.title}
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                                            {course.category && <span>📚 {course.category}</span>}
                                            <span>👥 {course.students} students</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "learning" && profile.enrollments && (
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                My Learning
                            </h3>
                            <div style={{ display: "grid", gap: "1rem" }}>
                                {profile.enrollments.map((enrollment, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => navigate(`/courses/${enrollment.course_slug}`)}
                                        style={{
                                            padding: "1.5rem",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "0.75rem",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                                            {enrollment.course_title}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                            <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: "50px" }}>
                                                <div
                                                    style={{
                                                        width: `${enrollment.progress}%`,
                                                        height: "100%",
                                                        background: "#667eea",
                                                        borderRadius: "50px",
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#667eea" }}>
                                                {Math.round(enrollment.progress)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "achievements" && profile.achievements && (
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                Achievements
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                                {profile.achievements.map((achievement, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: "1.5rem",
                                            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                                            borderRadius: "0.75rem",
                                            textAlign: "center",
                                        }}
                                    >
                                        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{achievement.icon}</div>
                                        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#92400e", marginBottom: "0.25rem" }}>
                                            {achievement.title}
                                        </div>
                                        <div style={{ fontSize: "0.875rem", color: "#b45309" }}>
                                            {achievement.description}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#d97706", marginTop: "0.5rem" }}>
                                            {new Date(achievement.earned_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "activity" && profile.activities && (
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                Recent Activity
                            </h3>
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                {profile.activities.map((activity, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: "1rem 1.5rem",
                                            background: "#f9fafb",
                                            borderLeft: "4px solid #667eea",
                                            borderRadius: "0.5rem",
                                        }}
                                    >
                                        <div style={{ fontSize: "0.95rem", color: "#374151", marginBottom: "0.25rem" }}>
                                            {activity.description}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                            {new Date(activity.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

function StatCard({ title, value, color, bgColor, suffix = "" }) {
    return (
        <div
            style={{
                background: "#ffffff",
                padding: "1.5rem",
                borderRadius: "1rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            }}
        >
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                {title}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color }}>
                {value}{suffix}
            </div>
        </div>
    );
}

function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "0.75rem 0",
                background: "none",
                border: "none",
                borderBottom: active ? "3px solid #667eea" : "3px solid transparent",
                color: active ? "#667eea" : "#6b7280",
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
            }}
        >
            {label}
        </button>
    );
}

export default ProfilePage;

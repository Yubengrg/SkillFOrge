// Lesson Management Component for Instructor Dashboard
import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

function LessonManagement({ courseId, onClose }) {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        video_url: "",
        video_source: "youtube",
        video_transcript: "",
        duration_minutes: "",
        thumbnail_url: "",
        is_published: true,
        is_free: false,
    });
    const [uploadMode, setUploadMode] = useState("url"); // "url" or "file"
    const [videoFile, setVideoFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetchLessons();
    }, [courseId]);

    const fetchLessons = async () => {
        try {
            const res = await fetch(`${API_BASE}/instructor/courses/${courseId}/lessons/`, {
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok) {
                setLessons(data.lessons || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const detectVideoSource = (url) => {
        if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
        if (url.includes("vimeo.com")) return "vimeo";
        return "direct";
    };

    const handleOpenModal = (lesson = null) => {
        if (lesson) {
            setEditingLesson(lesson);
            setFormData({
                title: lesson.title,
                description: lesson.description,
                video_url: lesson.video_url,
                video_source: lesson.video_source,
                video_transcript: lesson.video_transcript || "",
                duration_minutes: lesson.duration_minutes,
                thumbnail_url: lesson.thumbnail_url || "",
                is_published: lesson.is_published,
                is_free: lesson.is_free,
            });
            // Set upload mode based on existing data
            setUploadMode(lesson.video_file ? "file" : "url");
        } else {
            setEditingLesson(null);
            setFormData({
                title: "",
                description: "",
                video_url: "",
                video_source: "youtube",
                video_transcript: "",
                duration_minutes: "",
                thumbnail_url: "",
                is_published: true,
                is_free: false,
            });
            setUploadMode("url");
        }
        setVideoFile(null);
        setUploadProgress(0);
        setShowModal(true);
        setError("");
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingLesson(null);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.title) {
            setError("Title is required");
            return;
        }

        if (uploadMode === "url" && !formData.video_url) {
            setError("Video URL is required");
            return;
        }

        if (uploadMode === "file" && !videoFile && !editingLesson) {
            setError("Please select a video file");
            return;
        }

        try {
            let body;
            let headers = {};

            if (uploadMode === "file" && videoFile) {
                // Use FormData for file uploads
                body = new FormData();
                body.append("title", formData.title);
                body.append("description", formData.description);
                body.append("video_file", videoFile);
                body.append("video_transcript", formData.video_transcript || "");
                body.append("duration_minutes", formData.duration_minutes || 0);
                body.append("thumbnail_url", formData.thumbnail_url || "");
                body.append("is_published", formData.is_published);
                body.append("is_free", formData.is_free);
                // Don't set Content-Type - browser will set it with boundary
            } else {
                // Use JSON for URL-based lessons
                headers["Content-Type"] = "application/json";
                body = JSON.stringify({
                    ...formData,
                    video_source: detectVideoSource(formData.video_url),
                });
            }

            const url = editingLesson
                ? `${API_BASE}/instructor/lessons/${editingLesson.id}/update/`
                : `${API_BASE}/instructor/courses/${courseId}/lessons/add/`;

            const method = editingLesson ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers,
                credentials: "include",
                body,
            });

            if (res.ok) {
                handleCloseModal();
                fetchLessons();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save lesson");
            }
        } catch (err) {
            setError("Network error: " + err.message);
        }
    };

    const handleDelete = async (lessonId) => {
        if (!confirm("Are you sure you want to delete this lesson?")) return;

        try {
            const res = await fetch(`${API_BASE}/instructor/lessons/${lessonId}/delete/`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                fetchLessons();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const moveLesson = async (lessonId, direction) => {
        const index = lessons.findIndex((l) => l.id === lessonId);
        if (index === -1) return;

        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= lessons.length) return;

        const newOrder = lessons[newIndex].order;

        try {
            const res = await fetch(`${API_BASE}/instructor/lessons/${lessonId}/reorder/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ order: newOrder }),
            });

            if (res.ok) {
                fetchLessons();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return <div style={{ padding: "2rem", textAlign: "center" }}>Loading lessons...</div>;
    }

    return (
        <div style={{ padding: "2rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Manage Lessons</h2>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                        onClick={() => handleOpenModal()}
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
                        + Add Lesson
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "0.5rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Lessons List */}
            {lessons.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                    No lessons yet. Click "Add Lesson" to create your first lesson.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {lessons.map((lesson, index) => (
                        <div
                            key={lesson.id}
                            style={{
                                padding: "1.5rem",
                                background: "#ffffff",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.75rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            {/* Lesson Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#6b7280" }}>
                                        #{lesson.order}
                                    </span>
                                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{lesson.title}</h3>
                                    {!lesson.is_published && (
                                        <span
                                            style={{
                                                padding: "0.25rem 0.75rem",
                                                background: "#fef3c7",
                                                color: "#92400e",
                                                borderRadius: "1rem",
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Draft
                                        </span>
                                    )}
                                    {lesson.is_free && (
                                        <span
                                            style={{
                                                padding: "0.25rem 0.75rem",
                                                background: "#d1fae5",
                                                color: "#065f46",
                                                borderRadius: "1rem",
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Free
                                        </span>
                                    )}
                                </div>
                                <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                                    {lesson.description || "No description"}
                                </p>
                                <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                                    <span>⏱️ {lesson.duration_minutes} min</span>
                                    <span>🎥 {lesson.video_source}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                {/* Reorder buttons */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    <button
                                        onClick={() => moveLesson(lesson.id, "up")}
                                        disabled={index === 0}
                                        style={{
                                            padding: "0.25rem 0.5rem",
                                            background: index === 0 ? "#f3f4f6" : "#eef2ff",
                                            color: index === 0 ? "#9ca3af" : "#667eea",
                                            border: "none",
                                            borderRadius: "0.25rem",
                                            cursor: index === 0 ? "not-allowed" : "pointer",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => moveLesson(lesson.id, "down")}
                                        disabled={index === lessons.length - 1}
                                        style={{
                                            padding: "0.25rem 0.5rem",
                                            background: index === lessons.length - 1 ? "#f3f4f6" : "#eef2ff",
                                            color: index === lessons.length - 1 ? "#9ca3af" : "#667eea",
                                            border: "none",
                                            borderRadius: "0.25rem",
                                            cursor: index === lessons.length - 1 ? "not-allowed" : "pointer",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        ▼
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleOpenModal(lesson)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: "#eef2ff",
                                        color: "#667eea",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(lesson.id)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: "#fee2e2",
                                        color: "#dc2626",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div
                    style={{
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
                    }}
                    onClick={handleCloseModal}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            padding: "2rem",
                            borderRadius: "1rem",
                            maxWidth: "600px",
                            width: "90%",
                            maxHeight: "90vh",
                            overflowY: "auto",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                            {editingLesson ? "Edit Lesson" : "Add New Lesson"}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "1rem",
                                }}
                                required
                            />

                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    fontFamily: "inherit",
                                    marginBottom: "1rem",
                                }}
                            />

                            {/* Upload Mode Toggle */}
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Video Source
                            </label>
                            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode("url")}
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        background: uploadMode === "url" ? "#667eea" : "#f3f4f6",
                                        color: uploadMode === "url" ? "#ffffff" : "#374151",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    🔗 YouTube/Vimeo URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode("file")}
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        background: uploadMode === "file" ? "#667eea" : "#f3f4f6",
                                        color: uploadMode === "file" ? "#ffffff" : "#374151",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    ⬆️ Upload Video File
                                </button>
                            </div>

                            {uploadMode === "url" ? (
                                <>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Video URL * (YouTube, Vimeo, or Direct)
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.video_url}
                                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "1rem",
                                        }}
                                    />
                                </>
                            ) : (
                                <>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                        Video File * (MP4, WebM, MOV, AVI, MKV)
                                    </label>
                                    <input
                                        type="file"
                                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Check file size (500MB = 524288000 bytes)
                                                if (file.size > 524288000) {
                                                    setError("File too large. Maximum size: 500MB");
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setVideoFile(file);
                                                setError("");
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "2px solid #e5e7eb",
                                            borderRadius: "0.5rem",
                                            marginBottom: "0.5rem",
                                        }}
                                    />
                                    <div style={{ padding: "0.5rem 0", marginBottom: "1rem" }}>
                                        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                            Note: For uploaded videos, please provide a transcript below for higher-quality AI quiz generation.
                                        </p>
                                    </div>

                                    {videoFile && (
                                        <div style={{
                                            padding: "0.75rem",
                                            background: "#f0fdf4",
                                            borderRadius: "0.5rem",
                                            marginBottom: "1rem",
                                            fontSize: "0.875rem",
                                        }}>
                                            <strong>Selected:</strong> {videoFile.name} ({(videoFile.size / 1048576).toFixed(2)} MB)
                                        </div>
                                    )}

                                    {uploadProgress > 0 && uploadProgress < 100 && (
                                        <div style={{ marginBottom: "1rem" }}>
                                            <div style={{
                                                width: "100%",
                                                height: "8px",
                                                background: "#e5e7eb",
                                                borderRadius: "999px",
                                                overflow: "hidden",
                                            }}>
                                                <div style={{
                                                    width: `${uploadProgress}%`,
                                                    height: "100%",
                                                    background: "#667eea",
                                                    borderRadius: "999px",
                                                    transition: "width 0.3s",
                                                }} />
                                            </div>
                                            <p style={{
                                                fontSize: "0.875rem",
                                                color: "#6b7280",
                                                marginTop: "0.5rem",
                                                textAlign: "center",
                                            }}>
                                                Uploading: {uploadProgress}%
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}

                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Video Transcript / Script (Optional)
                            </label>
                            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                                Paste the transcript or key notes here. The AI will use this to generate quiz questions.
                            </p>
                            <textarea
                                value={formData.video_transcript}
                                onChange={(e) => setFormData({ ...formData, video_transcript: e.target.value })}
                                rows={5}
                                placeholder="Paste the script or important points from your video here..."
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    fontFamily: "inherit",
                                    marginBottom: "1rem",
                                }}
                            />

                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "1rem",
                                }}
                            />

                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                                Thumbnail URL (optional)
                            </label>
                            <input
                                type="url"
                                value={formData.thumbnail_url}
                                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "1rem",
                                }}
                            />

                            <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_published}
                                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                    />
                                    <span>Published</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_free}
                                        onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                                    />
                                    <span>Free Preview</span>
                                </label>
                            </div>

                            {error && (
                                <div
                                    style={{
                                        padding: "0.75rem",
                                        background: "#fee2e2",
                                        color: "#dc2626",
                                        borderRadius: "0.5rem",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        background: "#f3f4f6",
                                        color: "#374151",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        background: "#667eea",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "0.5rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    {editingLesson ? "Update" : "Add"} Lesson
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LessonManagement;

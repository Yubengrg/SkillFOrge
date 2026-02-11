// Course Learning Page - Main learning interface
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LessonQuiz from "../components/LessonQuiz";
import { API_BASE } from "../config";

function CourseLearningPage({ currentUser }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const mediaBase = API_BASE.replace(/\/api$/, "");

    const [lessons, setLessons] = useState([]);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [courseTitle, setCourseTitle] = useState("");
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showQuiz, setShowQuiz] = useState(false);
    const [autoPlayLessonId, setAutoPlayLessonId] = useState(null);
    const [showCompletion, setShowCompletion] = useState(false);
    const [certificate, setCertificate] = useState(null);

    const fetchProgress = async () => {
        if (!currentUser || !slug) return;
        try {
            const progressRes = await fetch(`${API_BASE}/learning/courses/${slug}/progress/`, {
                credentials: "include",
            });

            if (progressRes.ok) {
                const progressData = await progressRes.json();
                setProgress(progressData);
                if (progressData.is_complete && !showCompletion) {
                    try {
                        const certRes = await fetch(`${API_BASE}/learning/courses/${slug}/certificate/`, {
                            credentials: "include",
                        });
                        const certData = await certRes.json();
                        if (certRes.ok && certData.certificate) {
                            setCertificate(certData.certificate);
                        }
                        setShowCompletion(true);
                    } catch (err) {
                        console.error("Error fetching certificate:", err);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching progress:", err);
        }
    };

    // Check authentication
    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
        }
    }, [currentUser, navigate]);

    // Fetch lessons and progress
    useEffect(() => {
        if (!currentUser || !slug) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch lessons
                const lessonsRes = await fetch(`${API_BASE}/learning/courses/${slug}/lessons/`, {
                    credentials: "include",
                });

                if (!lessonsRes.ok) {
                    const data = await lessonsRes.json();
                    setError(data.error || "Failed to load lessons");
                    return;
                }

                const lessonsData = await lessonsRes.json();
                setLessons(lessonsData.lessons || []);
                setCourseTitle(lessonsData.course_title || "");

                // Set first lesson as current if available
                if (lessonsData.lessons && lessonsData.lessons.length > 0) {
                    const params = new URLSearchParams(location.search);
                    const requestedLessonId = params.get("lesson");
                    const requestedLesson = requestedLessonId
                        ? lessonsData.lessons.find((l) => String(l.id) === requestedLessonId)
                        : null;
                    setCurrentLesson(requestedLesson || lessonsData.lessons[0]);
                    setAutoPlayLessonId(
                        params.get("autoplay") === "1" && requestedLesson
                            ? requestedLesson.id
                            : null
                    );
                }

                // Fetch progress
                await fetchProgress();

            } catch (err) {
                console.error("Error fetching course data:", err);
                setError("Failed to load course");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser, slug, location.search]);

    const handleLessonClick = (lesson) => {
        if (!lesson.is_unlocked) {
            alert("🔒 This lesson is locked. Please pass the quiz in the previous lesson to continue.");
            return;
        }
        setCurrentLesson(lesson);
        setShowQuiz(false); // Reset quiz view when switching lessons
    };

    const handleQuizPassed = (newProgressPercent) => {
        // Update current lesson as completed
        const updatedLessons = lessons.map(l =>
            l.id === currentLesson.id ? { ...l, is_completed: true, quiz_passed: true } : l
        );

        // Find next lesson and unlock it
        const currentIndex = updatedLessons.findIndex(l => l.id === currentLesson.id);
        if (currentIndex < updatedLessons.length - 1) {
            updatedLessons[currentIndex + 1].is_unlocked = true;
        }

        setLessons(updatedLessons);
        setCurrentLesson({ ...currentLesson, is_completed: true, quiz_passed: true });

        if (newProgressPercent !== undefined) {
            setProgress({
                ...progress,
                progress_percent: newProgressPercent,
            });
        }
        fetchProgress();

        // Close quiz modal after a short delay
        setTimeout(() => {
            setShowQuiz(false);
            // Optionally auto-advance
            if (currentIndex < updatedLessons.length - 1) {
                setCurrentLesson(updatedLessons[currentIndex + 1]);
            }
        }, 2000);
    };

    const handleCompleteLesson = async () => {
        if (!currentLesson) return;

        try {
            const res = await fetch(`${API_BASE}/learning/lessons/${currentLesson.id}/complete/`, {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();

                // Update lesson as completed in the list
                const updatedLessons = lessons.map(l =>
                    l.id === currentLesson.id ? { ...l, is_completed: true } : l
                );

                // Unlock next lesson
                const currentIndex = updatedLessons.findIndex(l => l.id === currentLesson.id);
                if (currentIndex < updatedLessons.length - 1) {
                    updatedLessons[currentIndex + 1].is_unlocked = true;
                }

                setLessons(updatedLessons);
                setCurrentLesson({ ...currentLesson, is_completed: true });

                if (data.progress_percent !== undefined) {
                    setProgress({
                        ...progress,
                        progress_percent: data.progress_percent,
                    });
                }
                fetchProgress();
            }
        } catch (err) {
            console.error("Error completing lesson:", err);
        }
    };

    const handleNextLesson = () => {
        const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
        if (currentIndex < lessons.length - 1) {
            const nextLesson = lessons[currentIndex + 1];
            if (nextLesson.is_unlocked) {
                setCurrentLesson(nextLesson);
                setShowQuiz(false);
            } else {
                alert("🔒 Next lesson is locked. Please pass the quiz first!");
            }
        }
    };

    const handlePrevLesson = () => {
        const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id);
        if (currentIndex > 0) {
            setCurrentLesson(lessons[currentIndex - 1]);
            setShowQuiz(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <p>Loading course...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <p style={{ color: "#ef4444" }}>{error}</p>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        marginTop: "1rem",
                        padding: "0.5rem 1rem",
                        background: "#4f46e5",
                        color: "#fff",
                        border: "none",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                    }}
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", minHeight: "calc(100vh - 60px)", background: "#000" }}>
            {showCompletion && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,23,42,0.65)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "1.5rem",
                }}>
                    <div style={{
                        background: "#fff",
                        borderRadius: "1.5rem",
                        padding: "2rem",
                        maxWidth: 540,
                        width: "100%",
                        textAlign: "center",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
                    }}>
                        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                            {Array.from({ length: 24 }).map((_, i) => (
                                <span
                                    key={`conf-${i}`}
                                    className="confetti-piece"
                                    style={{
                                        left: `${(i * 7) % 100}%`,
                                        animationDelay: `${(i % 6) * 0.2}s`,
                                    }}
                                />
                            ))}
                        </div>
                        <h2 style={{ marginTop: 0, fontSize: "1.6rem", color: "#0f172a" }}>
                            Congratulations!
                        </h2>
                        <p style={{ color: "#475569", marginBottom: "1.25rem" }}>
                            You completed the course. Your certificate is ready.
                        </p>
                        {certificate && (
                            <div style={{
                                background: "#f8fafc",
                                borderRadius: "1rem",
                                padding: "1rem",
                                marginBottom: "1rem",
                                border: "1px solid #e2e8f0",
                            }}>
                                <div style={{ fontWeight: 700 }}>{certificate.course_title}</div>
                                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                                    Certificate ID: {certificate.id}
                                </div>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                            <button
                                className="btn btn--ghost"
                                onClick={() => setShowCompletion(false)}
                            >
                                Close
                            </button>
                            {certificate && (
                                <button
                                    className="btn btn--primary"
                                    onClick={() => window.location.assign(`/certificate/${certificate.id}`)}
                                >
                                    View Certificate
                                </button>
                            )}
                        </div>
                        <style>{`
                            .confetti-piece {
                                position: absolute;
                                top: -20px;
                                width: 10px;
                                height: 18px;
                                border-radius: 4px;
                                background: #f59e0b;
                                opacity: 0.9;
                                animation: confetti-fall 2.5s linear infinite;
                            }
                            .confetti-piece:nth-child(3n) { background: #10b981; }
                            .confetti-piece:nth-child(4n) { background: #3b82f6; }
                            .confetti-piece:nth-child(5n) { background: #ec4899; }
                            @keyframes confetti-fall {
                                0% { transform: translateY(0) rotate(0deg); }
                                100% { transform: translateY(420px) rotate(220deg); }
                            }
                        `}</style>
                    </div>
                </div>
            )}
            {/* Lesson Sidebar */}
            <aside
                style={{
                    width: 320,
                    background: "#1f2937",
                    color: "#fff",
                    overflowY: "auto",
                    borderRight: "1px solid #374151",
                }}
            >
                <div style={{ padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                        {courseTitle}
                    </h2>
                    {progress && (
                        <div style={{ marginBottom: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                                <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Lessons</span>
                                <span style={{ fontSize: "0.85rem", color: "#10b981" }}>
                                    {Math.round(progress.lessons?.percent || 0)}%
                                </span>
                            </div>
                            <div style={{
                                width: "100%",
                                height: 6,
                                background: "#374151",
                                borderRadius: 999,
                                overflow: "hidden",
                                marginBottom: "0.6rem",
                            }}>
                                <div style={{
                                    width: `${progress.lessons?.percent || 0}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #10b981, #34d399)",
                                    transition: "width 0.3s",
                                }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                                <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Quizzes</span>
                                <span style={{ fontSize: "0.85rem", color: "#f59e0b" }}>
                                    {Math.round(progress.quizzes?.percent || 0)}%
                                </span>
                            </div>
                            <div style={{
                                width: "100%",
                                height: 6,
                                background: "#374151",
                                borderRadius: 999,
                                overflow: "hidden",
                            }}>
                                <div style={{
                                    width: `${progress.quizzes?.percent || 0}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                                    transition: "width 0.3s",
                                }} />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: "0 0.5rem" }}>
                    <h3 style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        padding: "0 1rem",
                        marginBottom: "0.5rem",
                    }}>
                        Lessons ({lessons.length})
                    </h3>
                    {lessons.map((lesson, index) => (
                        <button
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            style={{
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: currentLesson?.id === lesson.id ? "#374151" : "transparent",
                                border: "none",
                                borderLeft: currentLesson?.id === lesson.id ? "3px solid #4f46e5" : "3px solid transparent",
                                color: "#fff",
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                if (currentLesson?.id !== lesson.id) {
                                    e.currentTarget.style.background = "#2d3748";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentLesson?.id !== lesson.id) {
                                    e.currentTarget.style.background = "transparent";
                                }
                            }}
                        >
                            {lesson.thumbnail_url ? (
                                <img
                                    src={lesson.thumbnail_url.startsWith("http") ? lesson.thumbnail_url : `${mediaBase}${lesson.thumbnail_url}`}
                                    alt={`${lesson.title} thumbnail`}
                                    style={{
                                        width: 46,
                                        height: 32,
                                        borderRadius: "0.4rem",
                                        objectFit: "cover",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        background: "#111827",
                                        flexShrink: 0,
                                    }}
                                />
                            ) : lesson.video_file ? (
                                <video
                                    muted
                                    playsInline
                                    preload="metadata"
                                    src={`${lesson.video_file.startsWith("http") ? lesson.video_file : `${mediaBase}${lesson.video_file}`}#t=0.1`}
                                    style={{
                                        width: 46,
                                        height: 32,
                                        borderRadius: "0.4rem",
                                        objectFit: "cover",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        background: "#111827",
                                        flexShrink: 0,
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: 46,
                                        height: 32,
                                        borderRadius: "0.4rem",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        background: "#111827",
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                            <span style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: lesson.is_completed
                                    ? "#10b981"
                                    : !lesson.is_unlocked
                                        ? "#6b7280"
                                        : "#374151",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                flexShrink: 0,
                            }}>
                                {lesson.is_completed ? "✓" : !lesson.is_unlocked ? "🔒" : index + 1}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                                    {lesson.title}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem", display: "flex", gap: "0.5rem" }}>
                                    <span>{lesson.duration_minutes} min</span>
                                    {lesson.quiz_required && !lesson.is_completed && lesson.is_unlocked && (
                                        <span style={{ color: "#f59e0b" }}>📝 Quiz</span>
                                    )}
                                    {lesson.quiz_passed && (
                                        <span style={{ color: "#10b981" }}>✅ Passed</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Video Area */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: showQuiz ? "#f3f4f6" : "#000" }}>
                {currentLesson ? (
                    showQuiz ? (
                        <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
                            <div style={{
                                background: "#fff",
                                borderRadius: "1rem",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                minHeight: "600px",
                                color: "#1f2937"
                            }}>
                                <LessonQuiz
                                    lessonId={currentLesson.id}
                                    onQuizPassed={handleQuizPassed}
                                    onClose={() => setShowQuiz(false)}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Video Player Section */}
                            <div style={{
                                width: "100%",
                                flex: 1, // Let video take available space
                                background: "#000",
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 0, // Crucial for flex overflow
                                maxHeight: "calc(100vh - 220px)",
                            }}>
                                {currentLesson.video_url || currentLesson.video_file ? (
                                    <VideoPlayer
                                        videoUrl={currentLesson.video_url}
                                        videoFile={currentLesson.video_file}
                                        videoSource={currentLesson.video_source}
                                        lessonId={currentLesson.id}
                                        lastPosition={currentLesson.last_position_seconds}
                                        autoplayLessonId={autoPlayLessonId}
                                    />
                                ) : (
                                    <div style={{
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#9ca3af",
                                    }}>
                                        <p>No video available for this lesson</p>
                                    </div>
                                )}
                            </div>

                            {/* Lesson Info & Controls Section */}
                            <div style={{
                                background: "#111827",
                                color: "#fff",
                                padding: "1.5rem",
                                borderTop: "1px solid #374151",
                            }}>
                                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                        {currentLesson.title}
                                    </h1>
                                    {currentLesson.description && (
                                        <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
                                            {currentLesson.description}
                                        </p>
                                    )}

                                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                                        <button
                                            onClick={handlePrevLesson}
                                            disabled={lessons.findIndex(l => l.id === currentLesson.id) === 0}
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                background: "#374151",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "0.5rem",
                                                cursor: "pointer",
                                                fontSize: "0.95rem",
                                                fontWeight: 600,
                                                opacity: lessons.findIndex(l => l.id === currentLesson.id) === 0 ? 0.5 : 1,
                                            }}
                                        >
                                            ← Previous
                                        </button>

                                        {currentLesson.quiz_required && !currentLesson.is_completed ? (
                                            <button
                                                onClick={() => setShowQuiz(true)}
                                                style={{
                                                    padding: "0.75rem 2rem",
                                                    background: "linear-gradient(to right, #4f46e5, #6366f1)",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "0.5rem",
                                                    cursor: "pointer",
                                                    fontSize: "0.95rem",
                                                    fontWeight: 600,
                                                    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)"
                                                }}
                                            >
                                                📝 Take Required Quiz
                                            </button>
                                        ) : !currentLesson.is_completed ? (
                                            <button
                                                onClick={handleCompleteLesson}
                                                style={{
                                                    padding: "0.75rem 1.5rem",
                                                    background: "#10b981",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "0.5rem",
                                                    cursor: "pointer",
                                                    fontSize: "0.95rem",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                ✓ Mark as Complete
                                            </button>
                                        ) : null}

                                        {currentLesson.is_completed && !currentLesson.quiz_required && (
                                            <span style={{
                                                padding: "0.75rem 1.5rem",
                                                background: "#065f46",
                                                color: "#d1fae5",
                                                borderRadius: "0.5rem",
                                                fontSize: "0.95rem",
                                                fontWeight: 600,
                                            }}>
                                                ✓ Completed
                                            </span>
                                        )}

                                        {currentLesson.quiz_passed && (
                                            <span style={{
                                                padding: "0.75rem 1.5rem",
                                                background: "#065f46",
                                                color: "#d1fae5",
                                                borderRadius: "0.5rem",
                                                fontSize: "0.95rem",
                                                fontWeight: 600,
                                            }}>
                                                ✓ Quiz Passed
                                            </span>
                                        )}

                                        <button
                                            onClick={handleNextLesson}
                                            disabled={lessons.findIndex(l => l.id === currentLesson.id) === lessons.length - 1}
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                background: "#4f46e5",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "0.5rem",
                                                cursor: "pointer",
                                                fontSize: "0.95rem",
                                                fontWeight: 600,
                                                opacity: lessons.findIndex(l => l.id === currentLesson.id) === lessons.length - 1 ? 0.5 : 1,
                                            }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                ) : (
                    <div style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                    }}>
                        <p>No lessons available</p>
                    </div>
                )}
            </main>
        </div>
    );
}

// Video Player Component
function VideoPlayer({ videoUrl, videoFile, videoSource, lessonId, lastPosition, autoplayLessonId }) {
    const isAutoplay = lessonId === autoplayLessonId;
    // If video file exists, use native HTML5 video player
    if (videoFile) {
        const mediaBase = API_BASE.replace(/\/api$/, "");
        const videoSrc = videoFile.startsWith("http") ? videoFile : `${mediaBase}${videoFile}`;
        return (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <video
                    controls
                    autoPlay={isAutoplay}
                    muted={isAutoplay}
                    style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#000",
                    }}
                    src={videoSrc}
                    controlsList="nodownload"  // Optional: prevent download button
                >
                    Your browser does not support video playback.
                </video>
            </div>
        );
    }

    // Otherwise, use embed for YouTube/Vimeo
    const getEmbedUrl = (url, source) => {
        if (source === "youtube") {
            // Extract video ID from various YouTube URL formats
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&\n?#]+)/)?.[1];
            return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${isAutoplay ? 1 : 0}&start=${lastPosition || 0}` : url;
        } else if (source === "vimeo") {
            const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
            return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=${isAutoplay ? 1 : 0}` : url;
        }
        return url;
    };

    const embedUrl = getEmbedUrl(videoUrl, videoSource);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <iframe
                src={embedUrl}
                style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson Video"
            />
        </div>
    );
}

export default CourseLearningPage;

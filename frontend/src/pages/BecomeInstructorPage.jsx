// Enhanced Multi-Step Instructor Application Form
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

function BecomeInstructorPage({ currentUser }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        bio: "",
        expertise: [],
        years_of_experience: "",
        linkedin_url: "",
        portfolio_url: "",
        teaching_experience: "",
        why_teach: "",
        sample_course_topic: "",
        certifications: [],
        resume: null,
    });

    const [expertiseInput, setExpertiseInput] = useState("");
    const [certInput, setCertInput] = useState({ name: "", issuer: "", date: "" });

    const handleAddExpertise = () => {
        if (expertiseInput.trim()) {
            setFormData({ ...formData, expertise: [...formData.expertise, expertiseInput.trim()] });
            setExpertiseInput("");
        }
    };

    const handleRemoveExpertise = (index) => {
        setFormData({
            ...formData,
            expertise: formData.expertise.filter((_, i) => i !== index),
        });
    };

    const handleAddCertification = () => {
        if (certInput.name && certInput.issuer) {
            setFormData({
                ...formData,
                certifications: [...formData.certifications, certInput],
            });
            setCertInput({ name: "", issuer: "", date: "" });
        }
    };

    const handleRemoveCertification = (index) => {
        setFormData({
            ...formData,
            certifications: formData.certifications.filter((_, i) => i !== index),
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            setFormData({ ...formData, resume: file });
        } else {
            setError("Please upload a PDF file");
        }
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.bio || formData.bio.length < 100) {
                setError("Bio must be at least 100 characters");
                return false;
            }
            if (formData.expertise.length === 0) {
                setError("Add at least one area of expertise");
                return false;
            }
        }
        if (step === 2) {
            if (!formData.years_of_experience) {
                setError("Years of experience is required");
                return false;
            }
        }
        if (step === 4) {
            if (!formData.why_teach || formData.why_teach.length < 50) {
                setError("Please explain why you want to teach (at least 50 characters)");
                return false;
            }
        }
        setError("");
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setError("");
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        setLoading(true);
        setError("");

        try {
            const data = new FormData();
            data.append("bio", formData.bio);
            data.append("expertise", JSON.stringify(formData.expertise));
            data.append("years_of_experience", formData.years_of_experience);
            data.append("linkedin_url", formData.linkedin_url);
            data.append("portfolio_url", formData.portfolio_url);
            data.append("teaching_experience", formData.teaching_experience);
            data.append("why_teach", formData.why_teach);
            data.append("sample_course_topic", formData.sample_course_topic);
            data.append("certifications", JSON.stringify(formData.certifications));

            if (formData.resume) {
                data.append("resume", formData.resume);
            }

        const res = await fetch(API_BASE + "/auth/apply-instructor/", {
                method: "POST",
                credentials: "include",
                body: data,
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message || "Application submitted successfully!");
                navigate("/");
            } else {
                setError(result.error || "Failed to submit application");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
                            Step 1: Basic Information
                        </h2>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Professional Bio *
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Tell us about your professional background, experience, and what makes you qualified to teach..."
                            rows={6}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                fontFamily: "inherit",
                                marginBottom: "1rem",
                            }}
                        />
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                            {formData.bio.length}/100 characters minimum
                        </div>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Areas of Expertise *
                        </label>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <input
                                type="text"
                                value={expertiseInput}
                                onChange={(e) => setExpertiseInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddExpertise())}
                                placeholder="e.g., Web Development, Machine Learning"
                                style={{
                                    flex: 1,
                                    padding: "0.5rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddExpertise}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#667eea",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                Add
                            </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {formData.expertise.map((tag, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: "#eef2ff",
                                        color: "#667eea",
                                        borderRadius: "1rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExpertise(idx)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#667eea",
                                            cursor: "pointer",
                                            fontSize: "1.25rem",
                                            lineHeight: 1,
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
                            Step 2: Professional Background
                        </h2>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Years of Professional Experience *
                        </label>
                        <select
                            value={formData.years_of_experience}
                            onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                marginBottom: "1.5rem",
                            }}
                        >
                            <option value="">Select years of experience</option>
                            <option value="0">Less than 1 year</option>
                            <option value="1">1-2 years</option>
                            <option value="3">3-5 years</option>
                            <option value="6">6-10 years</option>
                            <option value="11">10+ years</option>
                        </select>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            LinkedIn Profile URL
                        </label>
                        <input
                            type="url"
                            value={formData.linkedin_url}
                            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                            placeholder="https://linkedin.com/in/yourprofile"
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                marginBottom: "1.5rem",
                            }}
                        />

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Portfolio/Website URL
                        </label>
                        <input
                            type="url"
                            value={formData.portfolio_url}
                            onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                            placeholder="https://yourportfolio.com"
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                marginBottom: "1.5rem",
                            }}
                        />

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Teaching Experience
                        </label>
                        <textarea
                            value={formData.teaching_experience}
                            onChange={(e) => setFormData({ ...formData, teaching_experience: e.target.value })}
                            placeholder="Describe any previous teaching, mentoring, or training experience..."
                            rows={4}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                fontFamily: "inherit",
                            }}
                        />
                    </div>
                );

            case 3:
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
                            Step 3: Credentials & Documents
                        </h2>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Resume/CV (PDF)
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                marginBottom: "1.5rem",
                            }}
                        />
                        {formData.resume && (
                            <div style={{ fontSize: "0.875rem", color: "#10b981", marginBottom: "1.5rem" }}>
                                ✓ {formData.resume.name} uploaded
                            </div>
                        )}

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Certifications
                        </label>
                        <div style={{ marginBottom: "1rem" }}>
                            <input
                                type="text"
                                value={certInput.name}
                                onChange={(e) => setCertInput({ ...certInput, name: e.target.value })}
                                placeholder="Certification name"
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "0.5rem",
                                }}
                            />
                            <input
                                type="text"
                                value={certInput.issuer}
                                onChange={(e) => setCertInput({ ...certInput, issuer: e.target.value })}
                                placeholder="Issuing organization"
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "0.5rem",
                                }}
                            />
                            <input
                                type="text"
                                value={certInput.date}
                                onChange={(e) => setCertInput({ ...certInput, date: e.target.value })}
                                placeholder="Date obtained (e.g., Jan 2024)"
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "0.5rem",
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddCertification}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#667eea",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                Add Certification
                            </button>
                        </div>

                        {formData.certifications.map((cert, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: "1rem",
                                    background: "#f9fafb",
                                    borderRadius: "0.5rem",
                                    marginBottom: "0.5rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "start",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600 }}>{cert.name}</div>
                                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                        {cert.issuer} • {cert.date}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCertification(idx)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#ef4444",
                                        cursor: "pointer",
                                        fontSize: "1.25rem",
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                );

            case 4:
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
                            Step 4: Motivation & Goals
                        </h2>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Why do you want to teach on SkillForge? *
                        </label>
                        <textarea
                            value={formData.why_teach}
                            onChange={(e) => setFormData({ ...formData, why_teach: e.target.value })}
                            placeholder="Share your passion for teaching and what motivates you to educate others..."
                            rows={5}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                fontFamily: "inherit",
                                marginBottom: "1rem",
                            }}
                        />
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                            {formData.why_teach.length}/50 characters minimum
                        </div>

                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                            Sample Course Topic
                        </label>
                        <input
                            type="text"
                            value={formData.sample_course_topic}
                            onChange={(e) => setFormData({ ...formData, sample_course_topic: e.target.value })}
                            placeholder="What would you like to teach? (e.g., 'Introduction to React')"
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "2px solid #e5e7eb",
                                borderRadius: "0.5rem",
                            }}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <main style={{ flex: 1, padding: "3rem 2rem", background: "#f9fafb" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                        Become an Instructor
                    </h1>
                    <p style={{ fontSize: "1.125rem", color: "#6b7280" }}>
                        Share your knowledge and inspire learners worldwide
                    </p>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                style={{
                                    flex: 1,
                                    height: "4px",
                                    background: s <= step ? "#667eea" : "#e5e7eb",
                                    marginRight: s < 4 ? "0.5rem" : 0,
                                    borderRadius: "2px",
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center" }}>
                        Step {step} of 4
                    </div>
                </div>

                {/* Form Card */}
                <div
                    style={{
                        background: "#ffffff",
                        padding: "2rem",
                        borderRadius: "1rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                >
                    {renderStep()}

                    {error && (
                        <div
                            style={{
                                marginTop: "1rem",
                                padding: "1rem",
                                background: "#fee2e2",
                                color: "#dc2626",
                                borderRadius: "0.5rem",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    background: "#f3f4f6",
                                    color: "#374151",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    cursor: loading ? "not-allowed" : "pointer",
                                }}
                            >
                                Back
                            </button>
                        )}
                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    background: "#667eea",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem",
                                    background: loading ? "#9ca3af" : "#10b981",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "0.5rem",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    cursor: loading ? "not-allowed" : "pointer",
                                }}
                            >
                                {loading ? "Submitting..." : "Submit Application"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default BecomeInstructorPage;

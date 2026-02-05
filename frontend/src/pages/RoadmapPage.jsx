import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import "./Roadmap.css";

function RoadmapPage({ currentUser }) {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [badges, setBadges] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [slotName, setSlotName] = useState("");
  const [slotRole, setSlotRole] = useState("");
  const [slotTrack, setSlotTrack] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [rolesRes, slotsRes] = await Promise.all([
          fetch(`${API_BASE}/learning/roadmaps/roles/`, { credentials: "include" }),
          fetch(`${API_BASE}/learning/roadmaps/slots/`, { credentials: "include" }),
        ]);
        const rolesData = await rolesRes.json();
        const slotsData = await slotsRes.json();
        setRoles(rolesData.roles || []);
        setSlots(slotsData.slots || []);
        if ((slotsData.slots || []).length > 0) {
          setSelectedSlot(slotsData.slots[0]);
        }
      } catch (err) {
        console.error("Failed to load roadmap", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const fetchSlot = async () => {
      if (!selectedSlot) return;
      const res = await fetch(`${API_BASE}/learning/roadmaps/slots/${selectedSlot.id}/`, {
        credentials: "include",
      });
      const data = await res.json();
      setRoadmap(data.roadmap);
      setBadges(data.badges || []);
      setCertificate(data.certificate || null);
    };

    fetchSlot();
  }, [selectedSlot]);

  const createSlot = async (e) => {
    e.preventDefault();
    if (!slotName || !slotRole) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/learning/roadmaps/slots/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: slotName, role: slotRole, track: slotTrack }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create slot");
        return;
      }
      const updated = [data, ...slots];
      setSlots(updated);
      setSelectedSlot(data);
      setSlotName("");
      setSlotRole("");
      setSlotTrack("");
    } finally {
      setCreating(false);
    }
  };

  const generateRoadmap = async () => {
    if (!selectedSlot) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/learning/roadmaps/slots/${selectedSlot.id}/generate/`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate roadmap");
        return;
      }
      setRoadmap(data.roadmap);
      setBadges(data.badges || []);
      setCertificate(data.certificate || null);
      const refreshed = slots.map((s) => (s.id === selectedSlot.id ? { ...s, has_roadmap: true } : s));
      setSlots(refreshed);
    } finally {
      setGenerating(false);
    }
  };

  const renameSlot = async (slot) => {
    const name = prompt("Rename slot", slot.name);
    if (!name) return;
    const res = await fetch(`${API_BASE}/learning/roadmaps/slots/${slot.id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated = slots.map((s) => (s.id === slot.id ? { ...s, name } : s));
      setSlots(updated);
      if (selectedSlot?.id === slot.id) {
        setSelectedSlot({ ...slot, name });
      }
    }
  };

  const deleteSlot = async (slot) => {
    if (!confirm("Delete this roadmap slot?")) return;
    const res = await fetch(`${API_BASE}/learning/roadmaps/slots/${slot.id}/`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      const updated = slots.filter((s) => s.id !== slot.id);
      setSlots(updated);
      setSelectedSlot(updated[0] || null);
      setRoadmap(null);
    }
  };

  if (loading) {
    return (
      <main className="container" style={{ padding: "3rem 0" }}>
        <p>Loading roadmaps...</p>
      </main>
    );
  }

  return (
    <main className="container roadmap-page">
      <div className="roadmap-grid">
        <section className="roadmap-panel">
          <h2 style={{ marginTop: 0 }}>Roadmap slots</h2>
          <form onSubmit={createSlot} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <input
              className="input"
              placeholder="Slot name"
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              required
            />
            <select
              className="input"
              value={slotRole}
              onChange={(e) => {
                setSlotRole(e.target.value);
                setSlotTrack("");
              }}
              required
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.role} value={role.role}>{role.role}</option>
              ))}
            </select>
            <select
              className="input"
              value={slotTrack}
              onChange={(e) => setSlotTrack(e.target.value)}
              disabled={!slotRole}
            >
              <option value="">{slotRole ? "Select track (optional)" : "Select role first"}</option>
              {roles.find((r) => r.role === slotRole)?.tracks?.map((track) => (
                <option key={track} value={track}>{track}</option>
              ))}
            </select>
            <button type="submit" className="btn btn--primary" disabled={creating}>
              {creating ? "Creating..." : "Create slot"}
            </button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                style={{
                  textAlign: "left",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: slot.id === selectedSlot?.id ? "2px solid var(--brand)" : "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <strong>{slot.name}</strong>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {slot.role}{slot.track ? ` · ${slot.track}` : ""}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button type="button" className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); renameSlot(slot); }}>
                    Rename
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); deleteSlot(slot); }}>
                    Delete
                  </button>
                </div>
              </button>
            ))}
            {slots.length === 0 && <p style={{ color: "var(--muted)" }}>No slots yet.</p>}
          </div>
        </section>

        <section>
          {selectedSlot ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <header className="roadmap-header">
                <div>
                  <h2 style={{ margin: 0 }}>{selectedSlot.name}</h2>
                  <p style={{ color: "var(--muted)", margin: 0 }}>
                    {selectedSlot.role}{selectedSlot.track ? ` · ${selectedSlot.track}` : ""}
                  </p>
                </div>
                <button className="btn btn--primary" onClick={generateRoadmap} disabled={generating}>
                  {generating ? "Generating..." : roadmap ? "Regenerate" : "Generate roadmap"}
                </button>
              </header>
              {generating && (
                <div style={{ color: "var(--muted)" }}>Generating roadmap… this may take a minute.</div>
              )}

              {certificate && (
                <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", padding: "1rem", borderRadius: "0.75rem" }}>
                  🎓 Certificate earned: {certificate.certificate_id}
                </div>
              )}

              {badges.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {badges.map((badge) => (
                    <span key={badge.title} className="pill">{badge.icon} {badge.title}</span>
                  ))}
                </div>
              )}

              {!roadmap && (
                <p style={{ color: "var(--muted)" }}>Generate a roadmap to start learning.</p>
              )}

              {roadmap && (
                <div className="roadmap-canvas">
                  {roadmap.levels.map((level, idx) => (
                    <div key={`${level.title}-${idx}`} className="roadmap-level">
                      <div className="roadmap-level-title">{level.title} · {level.progress || 0}%</div>
                      {level.modules.map((module, mIdx) => (
                        <div key={`${module.title}-${mIdx}`} className="roadmap-module-row">
                          <div className="roadmap-left">
                            <div className="roadmap-note">{module.title}</div>
                          </div>
                          <div className="roadmap-center">
                            <div className="roadmap-node">{module.title}</div>
                          </div>
                          <div className="roadmap-right">
                            {module.lessons.map((lesson, lIdx) => {
                              const handleClick = () => {
                                if (lesson.link_type === "course" && lesson.course_slug) {
                                  navigate(`/courses/${lesson.course_slug}`);
                                }
                                if (lesson.link_type === "lesson" && lesson.course_slug) {
                                  navigate(`/learn/${lesson.course_slug}?lesson=${lesson.lesson_id}`);
                                }
                              };
                              return (
                                <span
                                  key={`${lesson.title}-${lIdx}`}
                                  className={`roadmap-pill ${lesson.completed ? "completed" : ""}`}
                                  onClick={lesson.link_type !== "none" ? handleClick : undefined}
                                >
                                  {lesson.completed ? "✓ " : ""}{lesson.title}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>Create a slot to get started.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default RoadmapPage;

// Reusable Stats Card Component
import React from "react";

function StatsCard({ title, value, subtitle, icon, color = "#4f46e5" }) {
    return (
        <div
            style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "1rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                borderLeft: `4px solid ${color}`,
                transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.08)";
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                }}
            >
                <div>
                    <p
                        style={{
                            color: "#6b7280",
                            fontSize: "0.9rem",
                            marginBottom: "0.5rem",
                            fontWeight: 500,
                        }}
                    >
                        {title}
                    </p>
                    <p
                        style={{
                            fontSize: "2rem",
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: "0.25rem",
                        }}
                    >
                        {value}
                    </p>
                    <p style={{ color: color, fontSize: "0.85rem", fontWeight: 500 }}>
                        {subtitle}
                    </p>
                </div>
                <div style={{ fontSize: "2.5rem" }}>{icon}</div>
            </div>
        </div>
    );
}

export default StatsCard;

// Loading Skeleton Component
import React from "react";

export function LoadingSkeleton({ width = "100%", height = "20px", borderRadius = "0.5rem" }) {
    return (
        <div
            style={{
                width,
                height,
                borderRadius,
                background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
            }}
        >
            <style>
                {`
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}
            </style>
        </div>
    );
}

export function StatsCardSkeleton() {
    return (
        <div
            style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "1rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                    <LoadingSkeleton width="60%" height="16px" />
                    <div style={{ marginTop: "0.75rem" }}>
                        <LoadingSkeleton width="80px" height="32px" />
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                        <LoadingSkeleton width="50%" height="14px" />
                    </div>
                </div>
                <LoadingSkeleton width="48px" height="48px" borderRadius="50%" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ columns = 4 }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: "1rem",
                padding: "1rem",
                borderBottom: "1px solid #e5e7eb",
            }}
        >
            {Array.from({ length: columns }).map((_, i) => (
                <LoadingSkeleton key={i} height="16px" />
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div
            style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "1rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            }}
        >
            <LoadingSkeleton width="70%" height="24px" />
            <div style={{ marginTop: "1rem" }}>
                <LoadingSkeleton width="100%" height="16px" />
            </div>
            <div style={{ marginTop: "0.5rem" }}>
                <LoadingSkeleton width="90%" height="16px" />
            </div>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <LoadingSkeleton width="80px" height="32px" borderRadius="1rem" />
                <LoadingSkeleton width="100px" height="32px" borderRadius="1rem" />
            </div>
        </div>
    );
}

export default LoadingSkeleton;

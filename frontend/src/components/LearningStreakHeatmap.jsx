// Learning Streak Heatmap Component (GitHub-style)
import React from "react";

function LearningStreakHeatmap({ activityData }) {
    const getColor = (count) => {
        if (count === 0) return "#ebedf0";
        if (count === 1) return "#9be9a8";
        if (count <= 3) return "#40c463";
        if (count <= 5) return "#30a14e";
        return "#216e39";
    };

    const generateCalendar = () => {
        const weeks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364); // Last 365 days

        // Start from the first Sunday before or on startDate
        const firstDay = new Date(startDate);
        firstDay.setDate(startDate.getDate() - startDate.getDay());

        let currentDate = new Date(firstDay);
        let week = [];

        // Generate all weeks including today
        while (currentDate <= today || week.length > 0) {
            if (currentDate <= today) {
                const dateStr = currentDate.toISOString().split("T")[0];
                const count = activityData[dateStr] || 0;
                const isToday = currentDate.toDateString() === today.toDateString();

                week.push({
                    date: new Date(currentDate),
                    count,
                    dateStr,
                    isToday,
                });
            } else {
                // Fill remaining cells with null
                week.push(null);
            }

            if (week.length === 7) {
                weeks.push(week);
                week = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return weeks;
    };

    const weeks = generateCalendar();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "0.75rem", marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#374151" }}>
                📅 Learning Activity (Last 365 Days)
            </h3>
            <div style={{ overflowX: "auto" }}>
                <div style={{ display: "inline-block", minWidth: "100%" }}>
                    {/* Month labels */}
                    <div style={{ display: "flex", marginBottom: "0.5rem", paddingLeft: "30px" }}>
                        {months.map((month, idx) => (
                            <div
                                key={idx}
                                style={{
                                    fontSize: "0.75rem",
                                    color: "#6b7280",
                                    width: `${100 / 12}%`,
                                    textAlign: "left",
                                }}
                            >
                                {month}
                            </div>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    <div style={{ display: "flex", gap: "3px" }}>
                        {/* Day labels */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginRight: "5px" }}>
                            <div style={{ height: 11, fontSize: "0.65rem", color: "#6b7280" }}>Mon</div>
                            <div style={{ height: 11 }}></div>
                            <div style={{ height: 11, fontSize: "0.65rem", color: "#6b7280" }}>Wed</div>
                            <div style={{ height: 11 }}></div>
                            <div style={{ height: 11, fontSize: "0.65rem", color: "#6b7280" }}>Fri</div>
                            <div style={{ height: 11 }}></div>
                            <div style={{ height: 11 }}></div>
                        </div>

                        {/* Weeks */}
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                {week.map((day, dayIdx) => {
                                    if (!day) {
                                        return <div key={dayIdx} style={{ width: 11, height: 11 }} />;
                                    }
                                    return (
                                        <div
                                            key={dayIdx}
                                            title={`${day.dateStr}: ${day.count} ${day.count === 1 ? "lesson" : "lessons"} completed${day.isToday ? " (Today)" : ""}`}
                                            style={{
                                                width: 11,
                                                height: 11,
                                                backgroundColor: getColor(day.count),
                                                borderRadius: "2px",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                border: day.isToday ? "2px solid #667eea" : "none",
                                                boxSizing: "border-box",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "scale(1.3)";
                                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "scale(1)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", fontSize: "0.75rem", color: "#6b7280" }}>
                        <span>Less</span>
                        <div style={{ display: "flex", gap: "3px" }}>
                            {[0, 1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    style={{
                                        width: 11,
                                        height: 11,
                                        backgroundColor: getColor(level === 0 ? 0 : level === 1 ? 1 : level === 2 ? 3 : level === 3 ? 5 : 6),
                                        borderRadius: "2px",
                                    }}
                                />
                            ))}
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LearningStreakHeatmap;

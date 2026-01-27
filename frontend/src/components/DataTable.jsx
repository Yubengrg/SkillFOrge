// Reusable DataTable Component
import React, { useState } from "react";
import LoadingSkeleton, { TableRowSkeleton } from "./LoadingSkeleton";

function DataTable({
    columns,
    data,
    loading = false,
    emptyMessage = "No data available",
    onRowClick,
}) {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");

    const handleSort = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(columnKey);
            setSortDirection("asc");
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortColumn) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            if (aVal === bVal) return 0;

            const comparison = aVal > bVal ? 1 : -1;
            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [data, sortColumn, sortDirection]);

    if (loading) {
        return (
            <div
                style={{
                    background: "#fff",
                    borderRadius: "1rem",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                    overflow: "hidden",
                }}
            >
                {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={columns.length} />
                ))}
            </div>
        );
    }

    return (
        <div
            style={{
                background: "#fff",
                borderRadius: "1rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                overflow: "hidden",
            }}
        >
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                    style={{
                                        padding: "1rem",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        color: "#374151",
                                        fontSize: "0.9rem",
                                        cursor: column.sortable ? "pointer" : "default",
                                        userSelect: "none",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        {column.label}
                                        {column.sortable && sortColumn === column.key && (
                                            <span style={{ fontSize: "0.75rem" }}>
                                                {sortDirection === "asc" ? "▲" : "▼"}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    style={{
                                        padding: "3rem",
                                        textAlign: "center",
                                        color: "#6b7280",
                                    }}
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    style={{
                                        borderBottom: "1px solid #e5e7eb",
                                        cursor: onRowClick ? "pointer" : "default",
                                        transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (onRowClick) e.currentTarget.style.background = "#f9fafb";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (onRowClick) e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            style={{
                                                padding: "1rem",
                                                color: "#111827",
                                                fontSize: "0.9rem",
                                            }}
                                        >
                                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataTable;

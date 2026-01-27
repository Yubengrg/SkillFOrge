// Toast Notification System
import React, { useState, useEffect, createContext, useContext } from "react";

const ToastContext = createContext();

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = "info", duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const showSuccess = (message, duration) => addToast(message, "success", duration);
    const showError = (message, duration) => addToast(message, "error", duration);
    const showInfo = (message, duration) => addToast(message, "info", duration);
    const showWarning = (message, duration) => addToast(message, "warning", duration);

    return (
        <ToastContext.Provider
            value={{ showSuccess, showError, showInfo, showWarning }}
        >
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onRemove }) {
    return (
        <div
            style={{
                position: "fixed",
                top: "1rem",
                right: "1rem",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
            }}
        >
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

function Toast({ toast, onRemove }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    const colors = {
        success: { bg: "#10b981", icon: "✓" },
        error: { bg: "#ef4444", icon: "✕" },
        warning: { bg: "#f59e0b", icon: "⚠" },
        info: { bg: "#3b82f6", icon: "ℹ" },
    };

    const config = colors[toast.type] || colors.info;

    return (
        <div
            style={{
                background: "#fff",
                padding: "1rem 1.25rem",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                minWidth: "300px",
                maxWidth: "500px",
                borderLeft: `4px solid ${config.bg}`,
                animation: isExiting ? "slideOut 0.3s ease-out" : "slideIn 0.3s ease-out",
            }}
        >
            <div
                style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: config.bg,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    flexShrink: 0,
                }}
            >
                {config.icon}
            </div>
            <p style={{ flex: 1, margin: 0, color: "#111827", fontSize: "0.95rem" }}>
                {toast.message}
            </p>
            <button
                onClick={handleClose}
                style={{
                    background: "transparent",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                    padding: "0.25rem",
                    lineHeight: 1,
                    flexShrink: 0,
                }}
                aria-label="Close notification"
            >
                ×
            </button>
            <style>
                {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideOut {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(100%);
            }
          }
        `}
            </style>
        </div>
    );
}

export default ToastProvider;

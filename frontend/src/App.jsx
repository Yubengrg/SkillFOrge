// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyPage from "./pages/VerifyPage";
import CoursePage from "./pages/CoursePage";
import MyLearningPage from "./pages/MyLearningPage";
import AdminDashboard from "./pages/AdminDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import CourseLearningPage from "./pages/CourseLearningPage";
import BecomeInstructorPage from "./pages/BecomeInstructorPage";
import ProfilePage from "./pages/ProfilePage";
import { ToastProvider } from "./components/Toast";

const AUTH_API = "http://localhost:8000/api/auth/";

function App() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // auth form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  // navbar dropdown (optional)
  const [menuOpen, setMenuOpen] = useState(false);

  // Check session on first load
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch(AUTH_API + "me/", {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data && data.user) {
          setCurrentUser(data.user);
        } else if (res.ok && data && !data.user && data.email) {
          // if backend returns plain user data
          setCurrentUser(data);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error(err);
        setCurrentUser(null);
      }
    }

    fetchMe();
  }, []);

  const resetAuthForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
  };

  // SIGNUP
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(AUTH_API + "signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          password_confirm: passwordConfirm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Signup failed");
        return;
      }

      setMessage(data.message || "Account created. Please verify your email.");
      setUnverifiedEmail(email);
      resetAuthForm();
      navigate("/verify");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(AUTH_API + "login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      // not verified case from backend
      if (res.status === 403 && data.code === "not_verified") {
        setUnverifiedEmail(data.email || email);
        setMessage(data.error || "Please verify your email first.");
        return;
      }

      if (!res.ok) {
        setMessage(data.error || "Invalid credentials");
        return;
      }

      const user = data.user || data;
      setCurrentUser(user);
      setMessage("");
      setEmail("");
      setPassword("");
      navigate("/");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND VERIFICATION
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    try {
      setResendLoading(true);
      setMessage("");

      const res = await fetch(AUTH_API + "resend-verification/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Could not resend verification email.");
        return;
      }

      setMessage(data.message || "Verification email resent. Please check your inbox.");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong while resending email.");
    } finally {
      setResendLoading(false);
    }
  };

  // GOOGLE LOGIN
  const handleGoogleCredential = async (credential) => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(AUTH_API + "google/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Google login failed");
        return;
      }

      const user = data.user || data;
      setCurrentUser(user);
      setMessage("");
      navigate("/");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong with Google login.");
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await fetch(AUTH_API + "logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCurrentUser(null);
      setMenuOpen(false);
      navigate("/");
    }
  };

  return (
    <ToastProvider>
      <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", flexDirection: "column" }}>
        {/* NAVBAR */}
        <header
          style={{
            width: "100%",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "0.75rem 3rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "0.95rem",
                  background:
                    "linear-gradient(135deg,#4f46e5,#f97316)",
                }}
              />
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                SkillForge
              </span>
            </Link>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
              }}
            >
              {currentUser && (
                <Link
                  to="/my-learning"
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.35rem 0.8rem",
                    borderRadius: "999px",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    color: "#374151",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  My learning
                </Link>
              )}

              {!currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    style={{
                      fontSize: "0.85rem",
                      padding: "0.35rem 0.8rem",
                      borderRadius: "999px",
                      border: "none",
                      background: "transparent",
                      color: "#4b5563",
                      cursor: "pointer",
                    }}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    style={{
                      fontSize: "0.85rem",
                      padding: "0.4rem 0.9rem",
                      borderRadius: "999px",
                      border: "none",
                      background: "#f97316",
                      color: "#111827",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Get started
                  </button>
                </>
              ) : (
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.35rem 0.7rem",
                      borderRadius: "999px",
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "999px",
                        background: "#4f46e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#eef2ff",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {currentUser.first_name
                        ? currentUser.first_name[0].toUpperCase()
                        : currentUser.email[0].toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#111827",
                      }}
                    >
                      {currentUser.first_name || currentUser.email}
                    </span>
                  </button>

                  {menuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "115%",
                        background: "#ffffff",
                        borderRadius: "0.9rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                        minWidth: 180,
                        padding: "0.3rem 0.25rem",
                        zIndex: 30,
                      }}
                    >
                      <button
                        type="button"
                        style={menuItemStyle}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/profile");
                        }}
                      >
                        My Profile
                      </button>
                      <button
                        type="button"
                        style={menuItemStyle}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/my-learning");
                        }}
                      >
                        My learning
                      </button>
                      {currentUser?.is_staff && (
                        <button
                          type="button"
                          style={menuItemStyle}
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/admin-dashboard");
                          }}
                        >
                          Admin Dashboard
                        </button>
                      )}
                      {currentUser?.is_instructor && (
                        <button
                          type="button"
                          style={menuItemStyle}
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/instructor-dashboard");
                          }}
                        >
                          Instructor Dashboard
                        </button>
                      )}
                      {!currentUser?.is_instructor && !currentUser?.is_staff && (
                        <button
                          type="button"
                          style={menuItemStyle}
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/become-instructor");
                          }}
                        >
                          Become an Instructor
                        </button>
                      )}
                      <button
                        type="button"
                        style={menuItemStyle}
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onSignupClick={() => navigate("/signup")}
                onLoginClick={() => navigate("/login")}
              />
            }
          />
          <Route
            path="/login"
            element={
              <LoginPage
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                onSubmit={handleLogin}
                loading={loading}
                message={message}
                unverifiedEmail={unverifiedEmail}
                onResendVerification={handleResendVerification}
                resendLoading={resendLoading}
                onGoogleCredential={handleGoogleCredential}
              />
            }
          />
          <Route
            path="/signup"
            element={
              <SignupPage
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                passwordConfirm={passwordConfirm}
                setPasswordConfirm={setPasswordConfirm}
                onSubmit={handleSignup}
                loading={loading}
                message={message}
              />
            }
          />
          <Route path="/verify" element={<VerifyPage />} />
          <Route
            path="/courses/:slug"
            element={<CoursePage currentUser={currentUser} />}
          />
          <Route
            path="/my-learning"
            element={<MyLearningPage currentUser={currentUser} />}
          />
          <Route
            path="/admin-dashboard"
            element={<AdminDashboard currentUser={currentUser} />}
          />
          <Route
            path="/instructor-dashboard"
            element={<InstructorDashboard currentUser={currentUser} />}
          />
          <Route
            path="/learn/:slug"
            element={<CourseLearningPage currentUser={currentUser} />}
          />
          <Route
            path="/become-instructor"
            element={<BecomeInstructorPage currentUser={currentUser} />}
          />
          <Route
            path="/profile"
            element={<ProfilePage currentUser={currentUser} />}
          />
          <Route
            path="/profile/:userId"
            element={<ProfilePage currentUser={currentUser} />}
          />
        </Routes>
      </div>
    </ToastProvider>
  );
}

const menuItemStyle = {
  width: "100%",
  padding: "0.45rem 1rem",
  textAlign: "left",
  border: "none",
  background: "transparent",
  fontSize: "0.85rem",
  color: "#111827",
  cursor: "pointer",
};

export default App;

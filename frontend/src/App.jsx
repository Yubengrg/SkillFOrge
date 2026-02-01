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
import { AUTH_API } from "./config";

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
      <div className="app">
        {/* NAVBAR */}
        <header className="nav">
          <div className="container nav__inner">
            <Link to="/" className="nav__logo">
              <span className="logo-mark" />
              <span>SkillForge</span>
            </Link>

            <nav className="nav__links">
              <Link to="/">Explore</Link>
              <Link to="/my-learning">My learning</Link>
              <Link to="/become-instructor">Teach</Link>
            </nav>

            <div className="nav__actions">
              {!currentUser ? (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => navigate("/signup")}
                  >
                    Get started
                  </button>
                </>
              ) : (
                <div className="menu">
                  <button
                    type="button"
                    className="menu__trigger"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <span className="menu__avatar">
                      {currentUser.first_name
                        ? currentUser.first_name[0].toUpperCase()
                        : currentUser.email[0].toUpperCase()}
                    </span>
                    <span className="menu__label">
                      {currentUser.first_name || currentUser.email}
                    </span>
                  </button>

                  {menuOpen && (
                    <div className="menu__dropdown">
                      <button
                        type="button"
                        className="menu__item"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/profile");
                        }}
                      >
                        My Profile
                      </button>
                      <button
                        type="button"
                        className="menu__item"
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
                          className="menu__item"
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
                          className="menu__item"
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
                          className="menu__item"
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
                        className="menu__item"
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

export default App;

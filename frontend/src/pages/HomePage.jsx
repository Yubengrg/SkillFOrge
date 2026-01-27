// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8000/api";

// Sample course data with enhanced fields
const sampleCourses = [
  {
    id: 1,
    title: "Complete Web Development Bootcamp",
    description: "Learn HTML, CSS, JavaScript, React, Node.js and more",
    category: "Web Development",
    instructor: "Sarah Johnson",
    rating: 4.8,
    students: 12453,
    price: "Free",
    level: "Beginner",
    slug: "web-dev-bootcamp",
  },
  {
    id: 2,
    title: "Data Science with Python",
    description: "Master data analysis, visualization, and machine learning",
    category: "Data Science",
    instructor: "Dr. Michael Chen",
    rating: 4.9,
    students: 8921,
    price: "$49",
    level: "Intermediate",
    slug: "data-science-python",
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    description: "Create beautiful, user-friendly interfaces",
    category: "Design",
    instructor: "Emma Williams",
    rating: 4.7,
    students: 6234,
    price: "Free",
    level: "Beginner",
    slug: "uiux-fundamentals",
  },
  {
    id: 4,
    title: "Machine Learning A-Z",
    description: "Build intelligent systems with ML algorithms",
    category: "AI & ML",
    instructor: "Prof. David Kumar",
    rating: 4.9,
    students: 15678,
    price: "$79",
    level: "Advanced",
    slug: "machine-learning-az",
  },
];

function HomePage({ onSignupClick, onLoginClick }) {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE}/categories/`);
        const data = await res.json();
        if (res.ok && data.categories && data.categories.length > 0) {
          setCategories(["All", ...data.categories.map(cat => cat.name)]);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch courses
  useEffect(() => {
    async function fetchCourses() {
      try {
        setCoursesLoading(true);
        const res = await fetch(`${API_BASE}/courses/`);
        const data = await res.json();
        if (res.ok && data.courses && data.courses.length > 0) {
          setCourses(data.courses);
        } else {
          // Use sample data if no courses from backend
          setCourses(sampleCourses);
        }
      } catch (err) {
        console.error(err);
        // Use sample data on error
        setCourses(sampleCourses);
      } finally {
        setCoursesLoading(false);
      }
    }

    fetchCourses();
  }, []);

  // Filter courses by category and search
  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      selectedCategory === "All" || course.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main style={{ flex: 1, background: "#f9fafb" }}>
      {/* Hero Section */}
      <section
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "4rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "1.5rem",
                lineHeight: 1.1,
              }}
            >
              Learn without limits
            </h1>
            <p
              style={{
                fontSize: "1.25rem",
                color: "rgba(255,255,255,0.95)",
                marginBottom: "2.5rem",
                lineHeight: 1.6,
              }}
            >
              Start, switch, or advance your career with thousands of courses,
              Professional Certificates, and degrees from world-class
              universities and companies.
            </p>

            {/* Search Bar */}
            <div
              style={{
                display: "flex",
                maxWidth: 600,
                margin: "0 auto 2rem",
                background: "#ffffff",
                borderRadius: "50px",
                padding: "0.5rem 1rem",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
            >
              <input
                type="text"
                placeholder="What do you want to learn?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "1rem",
                  padding: "0.75rem 1rem",
                  background: "transparent",
                }}
              />
              <button
                style={{
                  background: "#667eea",
                  border: "none",
                  borderRadius: "50px",
                  padding: "0.75rem 2rem",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Search
              </button>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "3rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  10,000+
                </div>
                <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>
                  Learners
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  500+
                </div>
                <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>
                  Courses
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  50+
                </div>
                <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>
                  Instructors
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            zIndex: 0,
          }}
        />
      </section>

      {/* Categories */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "3rem 2rem 1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#111827",
            marginBottom: "1.5rem",
          }}
        >
          Explore by category
        </h2>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            overflowX: "auto",
            paddingBottom: "0.5rem",
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 #f1f5f9",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "0.65rem 1.5rem",
                borderRadius: "50px",
                border: selectedCategory === cat ? "2px solid #667eea" : "2px solid #e5e7eb",
                background: selectedCategory === cat ? "#eef2ff" : "#ffffff",
                color: selectedCategory === cat ? "#667eea" : "#4b5563",
                fontSize: "0.95rem",
                fontWeight: selectedCategory === cat ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== cat) {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== cat) {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.background = "#ffffff";
                }
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Courses Grid */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "2rem 2rem 4rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {selectedCategory === "All" ? "Popular courses" : selectedCategory}
          </h2>
          <span style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            {filteredCourses.length} courses
          </span>
        </div>

        {coursesLoading && (
          <p style={{ fontSize: "1rem", color: "#6b7280" }}>Loading courses...</p>
        )}

        {!coursesLoading && filteredCourses.length === 0 && (
          <p style={{ fontSize: "1rem", color: "#6b7280" }}>
            No courses found. Try a different category or search term.
          </p>
        )}

        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </main>
  );
}

// Course Card Component
function CourseCard({ course }) {
  const [isHovered, setIsHovered] = useState(false);

  // Generate a gradient based on category
  const getCategoryGradient = (category) => {
    const gradients = {
      "Web Development": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "Data Science": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "Design": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "AI & ML": "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "Cloud & DevOps": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      "Business": "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    };
    return gradients[category] || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  };

  return (
    <Link
      to={`/courses/${course.slug}`}
      style={{
        display: "block",
        textDecoration: "none",
        borderRadius: "1rem",
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: isHovered
          ? "0 20px 50px rgba(0,0,0,0.15)"
          : "0 4px 15px rgba(0,0,0,0.08)",
        transform: isHovered ? "translateY(-8px)" : "translateY(0)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Course Image */}
      <div
        style={{
          height: "180px",
          background: getCategoryGradient(course.category),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: "3rem",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 700,
          }}
        >
          {course.title.charAt(0)}
        </div>
        {course.price === "Free" && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "#10b981",
              color: "#ffffff",
              padding: "0.35rem 0.75rem",
              borderRadius: "50px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            FREE
          </div>
        )}
      </div>

      {/* Course Info */}
      <div style={{ padding: "1.25rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#667eea",
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: "0.5rem",
            letterSpacing: "0.05em",
          }}
        >
          {course.category}
        </div>

        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "#111827",
            marginBottom: "0.5rem",
            lineHeight: 1.3,
          }}
        >
          {course.title}
        </h3>

        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginBottom: "1rem",
            lineHeight: 1.5,
          }}
        >
          {course.description}
        </p>

        {/* Instructor */}
        {course.instructor && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {course.instructor.charAt(0)}
            </div>
            <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>
              {course.instructor}
            </span>
          </div>
        )}

        {/* Rating and Students */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.75rem",
            borderTop: "1px solid #f3f4f6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ color: "#fbbf24", fontSize: "1rem" }}>★</span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>
              {course.rating || "4.5"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              ({course.students?.toLocaleString() || "1,234"})
            </span>
          </div>
          {course.price && course.price !== "Free" && (
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {course.price}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default HomePage;

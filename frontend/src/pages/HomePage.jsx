// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config";

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

function HomePage() {
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
          setCategories(["All", ...data.categories.map((cat) => cat.name)]);
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
          setCourses(sampleCourses);
        }
      } catch (err) {
        console.error(err);
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
    <main>
      <section className="hero">
        <div className="container hero__layout">
          <div>
            <span className="eyebrow">SkillForge Academy</span>
            <h1 className="headline">
              Build real skills with a guided, human-first learning path.
            </h1>
            <p className="subhead">
              Curated courses, instructor-led learning, and a personal roadmap
              that adapts to your pace. Start free and grow into career-ready
              mastery.
            </p>

            <div className="searchbar" style={{ marginTop: "1.5rem" }}>
              <input
                type="text"
                placeholder="Search courses, skills, or instructors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn btn--primary">Search</button>
            </div>

            <div className="stats">
              <div className="stat">
                <strong>10,000+</strong>
                <div className="muted">Learners</div>
              </div>
              <div className="stat">
                <strong>500+</strong>
                <div className="muted">Courses</div>
              </div>
              <div className="stat">
                <strong>95%</strong>
                <div className="muted">Satisfaction</div>
              </div>
            </div>
          </div>

          <div className="hero__card">
            <span className="pill">New: AI-powered roadmaps</span>
            <h3 style={{ marginTop: "1.2rem", fontSize: "1.4rem" }}>
              A learning plan built around your goals.
            </h3>
            <p className="muted" style={{ marginTop: "0.6rem" }}>
              SkillForge evaluates your current level, maps real-world outcomes,
              and keeps you progressing with quizzes and milestones.
            </p>
            <div style={{ display: "grid", gap: "0.6rem", marginTop: "1.2rem" }}>
              <span className="pill">Weekly pacing recommendations</span>
              <span className="pill">Instructor-reviewed content</span>
              <span className="pill">Certificates with verification</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <div style={{ marginBottom: "2rem" }}>
            <span className="eyebrow">Explore</span>
            <h2 className="headline" style={{ fontSize: "2.4rem" }}>
              Browse standout courses
            </h2>
            <p className="subhead">
              Discover in-demand topics, structured lessons, and hands-on
              projects from experienced instructors.
            </p>
          </div>

          <div className="filters">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`filter-pill ${
                  selectedCategory === category ? "filter-pill--active" : ""
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {coursesLoading ? (
            <p className="muted" style={{ textAlign: "center", marginTop: "2rem" }}>
              Loading courses...
            </p>
          ) : (
            <div className="course-grid" style={{ marginTop: "2rem" }}>
              {filteredCourses.map((course) => (
                <div className="course-card" key={course.id}>
                  <div className="course-card__meta">
                    <span className="chip">{course.level || "All levels"}</span>
                    <span>⭐ {course.rating || "4.8"}</span>
                  </div>
                  <div className="course-card__title">{course.title}</div>
                  <p className="muted" style={{ fontSize: "0.9rem" }}>
                    {course.description}
                  </p>
                  <div className="course-card__actions">
                    <span className="pill">{course.price || "Free"}</span>
                    <Link to={`/courses/${course.slug}`} className="btn btn--ghost">
                      View course
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default HomePage;

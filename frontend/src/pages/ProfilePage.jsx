import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LearningStreakHeatmap from "../components/LearningStreakHeatmap";
import { API_BASE } from "../config";
import "./ProfilePage.css";

function ProfilePage({ currentUser }) {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [followStatus, setFollowStatus] = useState({
    is_following: false,
    follower_count: 0,
    following_count: 0,
  });

  const isOwnProfile = !userId || (currentUser && currentUser.id === Number(userId));

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUser) return;
    fetchFollowStatus();
  }, [userId, currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const endpoint = userId ? `/profile/${userId}/` : "/profile/me/";
      const res = await fetch(API_BASE + endpoint, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setEditForm({
          first_name: data.profile.first_name,
          last_name: data.profile.last_name,
          bio: data.profile.bio || "",
          location: data.profile.location || "",
          website: data.profile.website || "",
          social_links: data.profile.social_links || {},
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/social/follow/status/${userId}/`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFollowStatus(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const res = await fetch(`${API_BASE}/social/follow/${userId}/`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFollowStatus((prev) => ({
          ...prev,
          is_following: data.following,
          follower_count: Math.max(
            0,
            prev.follower_count + (data.following ? 1 : -1)
          ),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append("first_name", editForm.first_name || "");
      formData.append("last_name", editForm.last_name || "");
      formData.append("bio", editForm.bio || "");
      formData.append("location", editForm.location || "");
      formData.append("website", editForm.website || "");
      formData.append("social_links", JSON.stringify(editForm.social_links || {}));
      if (photoFile) {
        formData.append("profile_photo", photoFile);
      }

      const res = await fetch(API_BASE + "/profile/update/", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        setIsEditing(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const getInitials = () => {
    const first = profile?.first_name?.charAt(0) || "";
    const last = profile?.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <div className="profile-loading">Loading profile...</div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <div className="profile-loading">Profile not found.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <section className="profile-hero">
          <div className="profile-cover" />
          <div className="profile-hero-content">
            <div className="profile-avatar">
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt="Profile" />
              ) : (
                getInitials()
              )}
            </div>
            <div className="profile-identity">
              {isEditing ? (
                <div className="profile-edit">
                  <div className="profile-edit-photo">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      id="profile-photo-upload"
                      hidden
                    />
                    <label htmlFor="profile-photo-upload">Update photo</label>
                    {photoPreview && <img src={photoPreview} alt="Preview" />}
                  </div>
                  <div className="profile-edit-grid">
                    <input
                      type="text"
                      value={editForm.first_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={editForm.last_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>
                  <textarea
                    rows={4}
                    value={editForm.bio || ""}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Bio"
                  />
                  <input
                    type="text"
                    value={editForm.location || ""}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Location"
                  />
                  <input
                    type="url"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="Website"
                  />
                  <input
                    type="url"
                    value={editForm.social_links?.linkedin || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, social_links: { ...editForm.social_links, linkedin: e.target.value } })
                    }
                    placeholder="LinkedIn URL"
                  />
                  <input
                    type="url"
                    value={editForm.social_links?.twitter || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, social_links: { ...editForm.social_links, twitter: e.target.value } })
                    }
                    placeholder="Twitter URL"
                  />
                  <input
                    type="url"
                    value={editForm.social_links?.github || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, social_links: { ...editForm.social_links, github: e.target.value } })
                    }
                    placeholder="GitHub URL"
                  />
                  <div className="profile-edit-actions">
                    <button className="btn btn--primary" type="button" onClick={handleSaveProfile}>
                      Save
                    </button>
                    <button className="btn btn--ghost" type="button" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1>
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <div className={`profile-role ${profile.role || "student"}`}>
                    {(profile.role || "student").toUpperCase()}
                  </div>
                  <p className="profile-bio">{profile.bio || "No bio available yet."}</p>
                  <div className="profile-meta">
                    {profile.location && <span>📍 {profile.location}</span>}
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    )}
                    {profile.social_links?.linkedin && (
                      <a href={profile.social_links.linkedin} target="_blank" rel="noreferrer">
                        LinkedIn
                      </a>
                    )}
                    {profile.social_links?.twitter && (
                      <a href={profile.social_links.twitter} target="_blank" rel="noreferrer">
                        Twitter
                      </a>
                    )}
                    {profile.social_links?.github && (
                      <a href={profile.social_links.github} target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                    )}
                  </div>
                  <div className="profile-joined">
                    Joined{" "}
                    {new Date(profile.joined_date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </>
              )}
            </div>
            {isOwnProfile && !isEditing && (
              <button className="btn btn--primary profile-edit-trigger" type="button" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            )}
            {!isOwnProfile && currentUser && (
              <button
                className={`btn ${followStatus.is_following ? "btn--ghost" : "btn--primary"} profile-follow`}
                type="button"
                onClick={handleFollowToggle}
              >
                {followStatus.is_following ? "Following" : "Follow"}
              </button>
            )}
          </div>
          {profile.role === "instructor" && profile.expertise?.length > 0 && (
            <div className="profile-expertise">
              <span>Expertise</span>
              <div className="profile-tags">
                {profile.expertise.map((skill) => (
                  <span key={skill} className="profile-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {profile.stats && (
          <section className="profile-stats">
            {profile.role === "instructor" ? (
              <>
                <StatCard title="Total Courses" value={profile.stats.total_courses} />
                <StatCard title="Total Students" value={profile.stats.total_students} />
                <StatCard title="Avg Rating" value={`${profile.stats.avg_rating.toFixed(1)} ⭐`} />
              </>
            ) : (
              <>
                <StatCard title="Courses Completed" value={profile.stats.courses_completed} />
                <StatCard title="In Progress" value={profile.stats.courses_in_progress} />
                <StatCard title="Total Enrolled" value={profile.stats.total_enrolled} />
              </>
            )}
            <StatCard title="Followers" value={followStatus.follower_count} />
            <StatCard title="Following" value={followStatus.following_count} />
          </section>
        )}

        {isOwnProfile && profile.activity_heatmap && (
          <LearningStreakHeatmap activityData={profile.activity_heatmap} />
        )}

        <section className="profile-panel">
          <div className="profile-tabs">
            <button
              type="button"
              className={activeTab === "overview" ? "active" : ""}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            {profile.role === "instructor" && profile.courses && (
              <button
                type="button"
                className={activeTab === "courses" ? "active" : ""}
                onClick={() => setActiveTab("courses")}
              >
                Courses ({profile.courses.length})
              </button>
            )}
            {profile.role === "student" && isOwnProfile && profile.enrollments && (
              <button
                type="button"
                className={activeTab === "learning" ? "active" : ""}
                onClick={() => setActiveTab("learning")}
              >
                Learning ({profile.enrollments.length})
              </button>
            )}
            {profile.achievements?.length > 0 && (
              <button
                type="button"
                className={activeTab === "achievements" ? "active" : ""}
                onClick={() => setActiveTab("achievements")}
              >
                Achievements ({profile.achievements.length})
              </button>
            )}
            {isOwnProfile && profile.activities?.length > 0 && (
              <button
                type="button"
                className={activeTab === "activity" ? "active" : ""}
                onClick={() => setActiveTab("activity")}
              >
                Activity
              </button>
            )}
            {isOwnProfile && (
              <button
                type="button"
                className={activeTab === "certificates" ? "active" : ""}
                onClick={() => setActiveTab("certificates")}
              >
                Certificates ({profile.certificates?.length || 0})
              </button>
            )}
          </div>

          {activeTab === "overview" && (
            <div className="profile-section">
              <h3>About</h3>
              <p>{profile.bio || "No bio available yet."}</p>
            </div>
          )}

          {activeTab === "courses" && profile.courses && (
            <div className="profile-section">
              <h3>Courses Created</h3>
              <div className="profile-grid">
                {profile.courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    className="profile-card"
                    onClick={() => navigate(`/courses/${course.slug}`)}
                  >
                    <div className="profile-card-title">{course.title}</div>
                    <div className="profile-card-meta">
                      {course.category && <span>📚 {course.category}</span>}
                      <span>👥 {course.students} students</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "learning" && profile.enrollments && (
            <div className="profile-section">
              <h3>My Learning</h3>
              <div className="profile-grid">
                {profile.enrollments.map((enrollment, idx) => (
                  <button
                    key={`${enrollment.course_slug}-${idx}`}
                    type="button"
                    className="profile-card"
                    onClick={() => navigate(`/courses/${enrollment.course_slug}`)}
                  >
                    <div className="profile-card-title">{enrollment.course_title}</div>
                    <div className="profile-progress">
                      <div className="profile-progress-bar">
                        <span style={{ width: `${enrollment.progress}%` }} />
                      </div>
                      <strong>{Math.round(enrollment.progress)}%</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "achievements" && profile.achievements && (
            <div className="profile-section">
              <h3>Achievements</h3>
              <div className="profile-grid">
                {profile.achievements.map((achievement, idx) => (
                  <div key={idx} className="profile-achievement">
                    <div className="profile-achievement-icon">{achievement.icon}</div>
                    <div className="profile-achievement-title">{achievement.title}</div>
                    <div className="profile-achievement-desc">{achievement.description}</div>
                    <div className="profile-achievement-date">
                      {new Date(achievement.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "activity" && profile.activities && (
            <div className="profile-section">
              <h3>Recent Activity</h3>
              <div className="profile-activity">
                {profile.activities.map((activity, idx) => (
                  <div key={idx} className="profile-activity-item">
                    <div>{activity.description}</div>
                    <span>{new Date(activity.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "certificates" && (
            <div className="profile-section">
              <h3>Certificates</h3>
              {profile.certificates && profile.certificates.length > 0 ? (
                <div className="certificate-gallery">
                  {profile.certificates.map((cert) => (
                    <button
                      key={cert.id}
                      type="button"
                      className="certificate-thumb"
                      onClick={() => navigate(`/certificate/${cert.id}`)}
                    >
                      <div className="certificate-thumb__frame">
                        <div className="certificate-thumb__header">
                          <span className="certificate-thumb__brand">SkillForge</span>
                          <span className="certificate-thumb__title">Certificate</span>
                        </div>
                        <div className="certificate-thumb__body">
                          <span className="certificate-thumb__label">Awarded to</span>
                          <strong className="certificate-thumb__name">
                            {profile.first_name} {profile.last_name}
                          </strong>
                          <span className="certificate-thumb__label">for completing</span>
                          <div className="certificate-thumb__course">{cert.course_title}</div>
                        </div>
                        <div className="certificate-thumb__footer">
                          <span>{new Date(cert.issued_at).toLocaleDateString()}</span>
                          <span className="certificate-thumb__id">{cert.id}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p>No certificates yet.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="profile-stat">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ProfilePage;

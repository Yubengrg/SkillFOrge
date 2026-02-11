import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import "./CertificatePage.css";

function CertificatePage() {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/learning/certificates/${certificateId}/`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to load certificate");
        }
        setCertificate(data.certificate);
      } catch (err) {
        setError(err.message || "Unable to load certificate");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <main className="certificate-page">
        <div className="certificate-container">Loading certificate...</div>
      </main>
    );
  }

  if (error || !certificate) {
    return (
      <main className="certificate-page">
        <div className="certificate-container">
          <p className="certificate-error">{error || "Certificate not found."}</p>
          <button className="btn btn--primary" onClick={() => navigate("/")}>
            Back to home
          </button>
        </div>
      </main>
    );
  }

  const qrValue = `${window.location.origin}/certificate/${certificateId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrValue)}`;

  return (
    <main className="certificate-page">
      <div className="certificate-container">
        <div className="certificate-card">
          <div className="certificate-header">
            <div className="certificate-logo">SkillForge</div>
            <div className="certificate-title">Certificate of Completion</div>
          </div>

          <div className="certificate-body">
            <p className="certificate-subtitle">This certifies that</p>
            <h1 className="certificate-name">{certificate.student_name}</h1>
            <p className="certificate-subtitle">has successfully completed</p>
            <h2 className="certificate-course">{certificate.course_title}</h2>
          </div>

          <div className="certificate-footer">
            <div>
              <div className="certificate-label">Issued</div>
              <div>{new Date(certificate.issued_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="certificate-label">Completion</div>
              <div>{new Date(certificate.completion_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="certificate-label">Certificate ID</div>
              <div className="certificate-id">{certificate.id}</div>
            </div>
            <div className="certificate-qr">
              <div className="certificate-label">Verify</div>
              <img src={qrSrc} alt="Certificate QR" />
            </div>
          </div>
        </div>

        <div className="certificate-actions">
          <button className="btn btn--ghost" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button className="btn btn--primary" onClick={() => navigate("/profile")}>
            Back to profile
          </button>
        </div>
      </div>
    </main>
  );
}

export default CertificatePage;

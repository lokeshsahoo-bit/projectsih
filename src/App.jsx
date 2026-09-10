import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "https://sih-26188-backend.fastapicloud.dev";

const REQUIRED_DOCUMENTS = [
  { key: "passport", label: "PASSPORT IMAGE" },
  { key: "visa", label: "VISA IMAGE" },
  { key: "nationalId", label: "NATIONAL ID IMAGE" },
  { key: "drivingLicense", label: "DRIVING LICENSE" },
  { key: "permit", label: "PERMIT DOCUMENT" },
];

const CHECKS = [
  "Photo Replacement",
  "Text Manipulation",
  "Stamp Forgery Detection",
  "Image Metadata",
  "Face Verification",
];

const emptyIntake = {
  livePhoto: null,
  passport: null,
  visa: null,
  nationalId: null,
  drivingLicense: null,
  permit: null,
};

function App() {
  const [page, setPage] = useState("login");
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");

  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeFiles, setIntakeFiles] = useState(emptyIntake);
  const [intakeError, setIntakeError] = useState("");
  const [intakeStep, setIntakeStep] = useState("live");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState("live");
  const [capturedLivePhoto, setCapturedLivePhoto] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [backendResult, setBackendResult] = useState(null);
  const [lastRisk, setLastRisk] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const livePhotoInputRef = useRef(null);
  const scanningRef = useRef(null);

  const scanChecks = CHECKS;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (mode = "live") => {
    setCameraError("");
    setCameraMode(mode);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      console.error(error);
      setCameraError(
        "Camera unavailable. Allow camera permission or use the live-photo file option."
      );
      setCameraActive(false);
    }
  };

  const captureLivePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "live-person-photo.jpg", {
          type: "image/jpeg",
        });
        const preview = URL.createObjectURL(blob);

        setCapturedLivePhoto(preview);
        setIntakeFiles((prev) => ({ ...prev, livePhoto: file }));
        setIntakeStep("documents");
        stopCamera();
        setIntakeError("");
      },
      "image/jpeg",
      0.92
    );
  };

  const handleLivePhotoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCameraError("Please choose an image file.");
      return;
    }

    setIntakeFiles((prev) => ({ ...prev, livePhoto: file }));
    setCapturedLivePhoto(URL.createObjectURL(file));
    setIntakeStep("documents");
    setCameraError("");
  };

  const handleDocumentFile = (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|dng|raw|nef|cr2|arw)$/i.test(file.name)) {
      setIntakeError("Only image files are accepted for this prototype.");
      return;
    }

    setIntakeFiles((prev) => ({ ...prev, [key]: file }));
    setIntakeError("");
  };

  const documentsReadyCount = REQUIRED_DOCUMENTS.filter(
    (item) => intakeFiles[item.key]
  ).length;

  const openIntake = () => {
    stopCamera();
    setIntakeOpen(true);
    setIntakeStep("live");
    setIntakeError("");
    setCameraError("");
    setCapturedLivePhoto(null);
    setIntakeFiles(emptyIntake);
    setBackendResult(null);
    setBackendError("");

    requestAnimationFrame(() => {
      document.querySelector(".intake-modal")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    setTimeout(() => startCamera("live"), 250);
  };

  const closeIntake = () => {
    stopCamera();
    setIntakeOpen(false);
  };

  const beginScreening = () => {
    if (!intakeFiles.livePhoto) {
      setIntakeError("LIVE PERSON PHOTO is mandatory and must be captured first.");
      setIntakeStep("live");
      return;
    }

    // Document images are optional. Only the live person photo is mandatory.
    closeIntake();
    setPage("scanning");
    setScanProgress(0);
    setScanStage(0);
    setScanComplete(false);
    setBackendResult(null);
    setBackendError("");

    setTimeout(() => {
      scanningRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const analyzeWithBackend = async () => {
    if (!intakeFiles.livePhoto) {
      setBackendError("Live person photo is required for analysis.");
      return;
    }

    const primaryDocument = REQUIRED_DOCUMENTS
      .map(({ key }) => intakeFiles[key])
      .find(Boolean);

    setBackendLoading(true);
    setBackendError("");

    try {
      const formData = new FormData();
      if (primaryDocument) {
        formData.append("document", primaryDocument);
      }
      formData.append("face", intakeFiles.livePhoto);

      // Send all supplied intake images when the backend supports them.
      formData.append("live_photo", intakeFiles.livePhoto);
      REQUIRED_DOCUMENTS.forEach(({ key }) => {
        if (intakeFiles[key]) formData.append(key, intakeFiles[key]);
      });

      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const result = await response.json();
      setBackendResult(result);
      setLastRisk(result?.risk || null);
    } catch (error) {
      console.error("Backend analysis error:", error);
      setBackendError(
        "AI backend could not be reached. The frontend scan is complete, but no verified risk result was returned."
      );
    } finally {
      setBackendLoading(false);
    }
  };

  useEffect(() => {
    if (page !== "scanning") return;

    const durations = [700, 800, 800, 800, 900];
    let stage = 0;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 100;
      const progress =
        ((stage + Math.min(elapsed / durations[stage], 1)) / durations.length) * 100;

      setScanProgress(Math.min(99, Math.round(progress)));

      if (elapsed >= durations[stage]) {
        if (stage < durations.length - 1) {
          stage += 1;
          elapsed = 0;
          setScanStage(stage);
        } else {
          clearInterval(timer);
          setScanProgress(100);
          setScanComplete(true);
          analyzeWithBackend();
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [page]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleLogin = (event) => {
    event.preventDefault();
    if (officerId === "officer" && password === "ghost123") {
      setPage("dashboard");
    } else {
      alert("Invalid demo credentials");
    }
  };

  const logout = () => {
    stopCamera();
    setPage("login");
    setOfficerId("");
    setPassword("");
  };

  const riskScore = Number(lastRisk?.risk_score ?? backendResult?.risk?.risk_score ?? 0);
  const riskLevel = String(
    lastRisk?.risk_level ?? backendResult?.risk?.risk_level ?? "NO RESULT"
  ).toUpperCase();

  const riskPercent = Math.max(0, Math.min(100, riskScore));

  const resultCheck = (key) => {
    const root = backendResult || {};
    const tamper = root.tampering || {};
    const face = root.face_verification || {};
    const text = JSON.stringify(root).toLowerCase();

    if (key === "Face Verification") {
      if (face.match === true) return "PASS";
      if (face.second_face_detected === false) return "NOT PROVIDED";
      return "REVIEW";
    }

    if (key === "Photo Replacement") {
      return text.includes("photo") && text.includes("replace") ? "REVIEW" : "PASS";
    }

    if (key === "Text Manipulation") {
      return text.includes("text") && text.includes("tamper") ? "REVIEW" : "PASS";
    }

    if (key === "Stamp Forgery Detection") {
      return tamper.tampering_detected ? "REVIEW" : "PASS";
    }

    if (key === "Image Metadata") {
      return "PASS";
    }

    return "PASS";
  };

  if (page === "login") {
    return (
      <div className="app-shell login-shell">
        <div className="terminal-corner">GHOST SCAN // SECURE TERMINAL</div>
        <div className="system-online">● SYSTEM ONLINE</div>

        <main className="login-layout">
          <section className="login-brand">
            <div className="brand-emblem">◇</div>
            <h1>GHOST<span>SCAN</span></h1>
            <div className="brand-line"></div>
            <p>INTELLIGENT DOCUMENT & IDENTITY SCREENING</p>
            <small>Secure AI-assisted verification platform for authorized officers.</small>
          </section>

          <form className="login-card" onSubmit={handleLogin}>
            <span className="eyebrow">AUTHENTICATION MODULE</span>
            <h2>Officer Access</h2>
            <div className="secure-strip">● SECURE CHANNEL ESTABLISHED</div>

            <label>OFFICER IDENTIFICATION</label>
            <input
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              placeholder="ENTER OFFICER ID"
            />

            <label>ACCESS CREDENTIAL</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER ACCESS KEY"
            />

            <button className="primary-button" type="submit">
              AUTHENTICATE <span>→</span>
            </button>

            <div className="login-foot">
              <span>ENCRYPTED SESSION</span>
              <span>AUTH LEVEL: OFFICER</span>
            </div>
          </form>
        </main>

        <footer className="terminal-footer">
          <span>GHOST SCAN V1.0</span>
          <span>DOCUMENT INTELLIGENCE SYSTEM</span>
          <span>AUTHORIZED PERSONNEL ONLY</span>
        </footer>
      </div>
    );
  }

  if (page === "dashboard") {
    return (
      <div className="app-shell dashboard-page">
        <DashboardHeader onLogout={logout} />

        <main className="dashboard-main">
          <div className="authority-strip">
            <strong>MHA</strong>
            <span>|</span>
            <span>Sashastra Seema Bal</span>
            <span>|</span>
            <span>Police-II Division</span>
            <b>GHOST SCAN — SIH 2026</b>
          </div>

          <div className="dashboard-title">
            <div>
              <span className="eyebrow">OFFICER CONSOLE // NODE 01</span>
              <h1>Document Intelligence</h1>
              <p>Central screening and identity verification console.</p>
            </div>
            <button className="dashboard-action" onClick={openIntake}>
              + NEW SCREENING
            </button>
          </div>

          <section className="system-overview">
            <StatCard label="DOCUMENTS PROCESSED" value="0" note="TODAY" />
            <StatCard label="VERIFIED" value="0" note="NO SCREENINGS" tone="green" />
            <StatCard label="REVIEW REQUIRED" value="0" note="MANUAL REVIEW" tone="yellow" />
            <StatCard label="HIGH RISK" value="0" note="FLAGGED" tone="red" />
          </section>

          <section className="dashboard-panels">
            <div className="dashboard-panel risk-panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">LAST SCREENING</span>
                  <h2>Recent Screening Risk</h2>
                </div>
                <span className={`risk-badge ${riskLevel.toLowerCase().replace(/\s+/g, "-")}`}>
                  {riskLevel}
                </span>
              </div>

              <div className="risk-chart">
                <div className="risk-scale">
                  <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
                </div>
                <div className="risk-bars">
                  <div className="risk-grid-lines">
                    <i></i><i></i><i></i><i></i><i></i>
                  </div>
                  <div className="risk-column">
                    <div className="risk-bar" style={{ height: `${Math.max(6, riskPercent)}%` }}></div>
                    <span>{backendResult ? `${riskScore}/100` : "NO DATA"}</span>
                  </div>
                </div>
              </div>

              <div className="risk-summary">
                <span>LAST RESULT</span>
                <strong>{backendResult ? `${riskScore} / 100` : "—"}</strong>
              </div>
            </div>

            <div className="dashboard-panel quick-screening">
              <span className="eyebrow">QUICK ACTION</span>
              <h2>Begin New Screening</h2>
              <p>
                Every intake channel begins with a mandatory live person photo,
                then collects all required document images.
              </p>
              <button className="dashboard-action full-width" onClick={openIntake}>
                OPEN PHOTO / IMAGE INTAKE →
              </button>
            </div>
          </section>

          <div className="zero-history-note">
            <span>SCREENING HISTORY</span>
            <strong>0 RECORDS</strong>
            <small>Dashboard history is intentionally reset for the prototype.</small>
          </div>
        </main>

        {intakeOpen && (
          <IntakeModal
            intakeStep={intakeStep}
            setIntakeStep={setIntakeStep}
            intakeFiles={intakeFiles}
            capturedLivePhoto={capturedLivePhoto}
            cameraActive={cameraActive}
            cameraError={cameraError}
            intakeError={intakeError}
            videoRef={videoRef}
            livePhotoInputRef={livePhotoInputRef}
            fileInputRef={fileInputRef}
            startCamera={startCamera}
            captureLivePhoto={captureLivePhoto}
            handleLivePhotoFile={handleLivePhotoFile}
            handleDocumentFile={handleDocumentFile}
            documentsReadyCount={documentsReadyCount}
            beginScreening={beginScreening}
            closeIntake={closeIntake}
          />
        )}
      </div>
    );
  }

  if (page === "scanning") {
    return (
      <div className="app-shell scanning-page">
        <DashboardHeader onLogout={logout} />

        <main className="scanning-main" ref={scanningRef}>
          <div className="authority-strip">
            <strong>MHA</strong><span>|</span><span>Sashastra Seema Bal</span><span>|</span>
            <span>Police-II Division</span><b>GHOST SCAN — SIH 2026</b>
          </div>

          <div className="scanning-heading">
            <span className="eyebrow">MODULE 02 // SCREENING PROCESS</span>
            <h1>Document Intelligence Scan</h1>
            <p>Live person photo received. Running the requested checks on the supplied document images.</p>
          </div>

          <section className="scan-workspace">
            <div className="scan-visual-panel">
              <div className="scan-panel-header">
                <span>DOCUMENT INTAKE</span>
                <span className="scan-panel-live">● LIVE ANALYSIS</span>
              </div>

              <div className="scan-document-stage">
                {intakeFiles.passport ? (
                  <img
                    src={URL.createObjectURL(intakeFiles.passport)}
                    alt="Passport being scanned"
                    className="scan-document-image"
                  />
                ) : (
                  <div className="scan-document-placeholder">DOCUMENT READY</div>
                )}
                <div className="scan-document-overlay"></div>
                <div className="scan-horizontal-line"></div>
                <div className="scan-processing-label">
                  {scanComplete ? "ANALYSIS COMPLETE" : scanChecks[scanStage]}
                </div>
              </div>
            </div>

            <div className="scan-status-panel">
              <div className="scan-status-title">
                <span>SCREENING PROCESS</span>
                <strong>{scanProgress}%</strong>
              </div>

              <div className="scan-progress-track">
                <div className="scan-progress-fill" style={{ width: `${scanProgress}%` }} />
              </div>

              <div className="scan-stage-list">
                {scanChecks.map((check, index) => {
                  const done = index < scanStage || scanComplete;
                  const active = index === scanStage && !scanComplete;
                  return (
                    <div className={`scan-stage-row ${done ? "done" : ""} ${active ? "active" : ""}`} key={check}>
                      <span className="scan-stage-number">{done ? "✓" : String(index + 1).padStart(2, "0")}</span>
                      <div className="scan-stage-copy">
                        <strong>{check}</strong>
                        <span>{done ? "COMPLETE" : active ? "PROCESSING" : "QUEUED"}</span>
                      </div>
                      <span className="scan-stage-indicator">{done ? "OK" : active ? "RUN" : "--"}</span>
                    </div>
                  );
                })}
              </div>

              <div className="scan-backend-status">
                {backendLoading ? "AI BACKEND PROCESSING" : backendError ? "BACKEND REVIEW" : scanComplete ? "SCREENING COMPLETE" : "AI READY"}
              </div>
            </div>
          </section>

          {scanComplete && (
            <RiskAssessment
              backendResult={backendResult}
              backendLoading={backendLoading}
              backendError={backendError}
              resultCheck={resultCheck}
              riskScore={riskScore}
              riskLevel={riskLevel}
              onBack={() => setPage("dashboard")}
            />
          )}
        </main>
      </div>
    );
  }

  return null;
}

function IntakeModal({
  intakeStep,
  setIntakeStep,
  intakeFiles,
  capturedLivePhoto,
  cameraActive,
  cameraError,
  intakeError,
  videoRef,
  livePhotoInputRef,
  fileInputRef,
  startCamera,
  captureLivePhoto,
  handleLivePhotoFile,
  handleDocumentFile,
  documentsReadyCount,
  beginScreening,
  closeIntake,
}) {
  return (
    <div className="intake-overlay">
      <section className="intake-modal">
        <div className="intake-modal-header">
          <div>
            <span className="eyebrow">PHOTO / IMAGE INTAKE</span>
            <h2>Mandatory Capture Sequence</h2>
            <p>LIVE PERSON PHOTO must be completed first.</p>
          </div>
          <button className="modal-close" onClick={closeIntake}>×</button>
        </div>

        <div className="intake-priority">
          <div className={`priority-step ${intakeFiles.livePhoto ? "ready" : "active"}`}>
            <span>01</span>
            <div>
              <strong>LIVE PERSON PHOTO</strong>
              <small>{intakeFiles.livePhoto ? "CAPTURED" : "MANDATORY • FIRST"}</small>
            </div>
          </div>
          <div className={`priority-step ${documentsReadyCount > 0 ? "ready" : ""}`}>
            <span>02</span>
            <div>
              <strong>DOCUMENT IMAGES</strong>
              <small>{documentsReadyCount}/5 UPLOADED • OPTIONAL</small>
            </div>
          </div>
        </div>

        {!intakeFiles.livePhoto && (
          <div className="live-capture-box">
            <div className="live-camera-frame">
              {cameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted />
                  <div className="camera-frame-overlay">
                    <span>LIVE PERSON</span>
                    <i></i>
                  </div>
                </>
              ) : (
                <div className="camera-off">
                  <strong>CAMERA STANDBY</strong>
                  <span>Activating live camera...</span>
                </div>
              )}
            </div>

            <div className="live-capture-controls">
              {cameraActive && (
                <button className="primary-button" onClick={captureLivePhoto}>
                  ◉ CAPTURE LIVE PHOTO
                </button>
              )}
              <button className="secondary-button" onClick={() => livePhotoInputRef.current?.click()}>
                USE LIVE PHOTO FILE
              </button>
              <input
                ref={livePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLivePhotoFile}
                hidden
              />
            </div>

            {cameraError && <div className="intake-error">{cameraError}</div>}
          </div>
        )}

        {intakeFiles.livePhoto && (
          <div className="captured-live-row">
            <div className="captured-live-preview">
              {capturedLivePhoto && <img src={capturedLivePhoto} alt="Live person" />}
            </div>
            <div>
              <span className="eyebrow">01 // LIVE PHOTO</span>
              <strong>CAPTURE COMPLETE</strong>
              <small>{intakeFiles.livePhoto.name}</small>
            </div>
            <button className="secondary-button" onClick={() => setIntakeStep("live")}>
              RETAKE
            </button>
          </div>
        )}

        <div className={`document-intake-list ${!intakeFiles.livePhoto ? "locked" : ""}`}>
          <div className="document-list-heading">
            <div>
              <span className="eyebrow">02 // OPTIONAL IMAGES</span>
              <h3>Document Set</h3>
            </div>
            {!intakeFiles.livePhoto && <span className="lock-label">LOCKED UNTIL LIVE PHOTO</span>}
          </div>

          {REQUIRED_DOCUMENTS.map((item, index) => (
            <div className="required-file-row" key={item.key}>
              <span className="file-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="file-info">
                <strong>{item.label}</strong>
                <small>
                  {intakeFiles[item.key]
                    ? `${intakeFiles[item.key].name} • READY`
                    : "NOT UPLOADED"}
                </small>
              </div>
              <button
                className="secondary-button compact"
                disabled={!intakeFiles.livePhoto}
                onClick={() => {
                  fileInputRef.current.dataset.key = item.key;
                  fileInputRef.current.click();
                }}
              >
                {intakeFiles[item.key] ? "REPLACE" : "UPLOAD"}
              </button>
            </div>
          ))}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.dng,.raw,.nef,.cr2,.arw"
            hidden
            onChange={(e) => handleDocumentFile(e.target.dataset.key, e)}
          />
        </div>

        {intakeError && <div className="intake-error">{intakeError}</div>}

        <div className="intake-modal-footer">
          <div>
            <strong>{intakeFiles.livePhoto ? "READY TO SCREEN" : "INPUT INCOMPLETE"}</strong>
            <span>
              {intakeFiles.livePhoto
                ? `${documentsReadyCount}/5 optional documents ready`
                : "Live person photo required first"}
            </span>
          </div>
          <button
            className="primary-button proceed-button"
            disabled={!intakeFiles.livePhoto}
            onClick={beginScreening}
          >
            CONTINUE TO SCAN →
          </button>
        </div>
      </section>
    </div>
  );
}

function RiskAssessment({
  backendResult,
  backendLoading,
  backendError,
  resultCheck,
  riskScore,
  riskLevel,
  onBack,
}) {
  return (
    <section className="risk-assessment">
      <div className="risk-assessment-header">
        <div>
          <span className="eyebrow">FINAL SCREENING OUTPUT</span>
          <h2>Risk Assessment</h2>
          <p>Decision-support result generated from the returned screening signals.</p>
        </div>
        <span className={`risk-badge ${riskLevel.toLowerCase().replace(/\s+/g, "-")}`}>
          {riskLevel}
        </span>
      </div>

      <div className="risk-result-grid">
        <div className="risk-score-card">
          <span>RISK ASSESSMENT SCORE</span>
          <strong>{backendResult ? riskScore : "—"}</strong>
          <small>/ 100</small>
          <div className="score-ring" style={{ "--score": `${riskScore * 3.6}deg` }}>
            <div>{backendResult ? `${riskScore}%` : "—"}</div>
          </div>
        </div>

        <div className="check-results">
          <div className="check-results-heading">
            <span>VERIFICATION STATUS</span>
            <strong>{backendLoading ? "PROCESSING" : backendError ? "REVIEW" : "COMPLETE"}</strong>
          </div>

          {CHECKS.map((check) => {
            const status = backendResult ? resultCheck(check) : "PENDING";
            return (
              <div className="check-row" key={check}>
                <span>{check}</span>
                <strong className={status.toLowerCase().replace(/\s+/g, "-")}>{status}</strong>
              </div>
            );
          })}
        </div>
      </div>

      <div className="risk-explanation">
        <span className="eyebrow">ASSESSMENT</span>
        <p>
          {backendResult
            ? riskLevel === "LOW" || riskLevel === "SAFE"
              ? "Screening signals indicate a low-risk result. No high-risk signal was returned by the current analysis pipeline."
              : "One or more screening signals require officer review. The score is a risk indicator, not a final legal determination."
            : "The backend did not return a result. Do not treat the screening as verified until the AI result is available."}
        </p>
      </div>

      <button className="dashboard-action" onClick={onBack}>
        ← RETURN TO DASHBOARD
      </button>
    </section>
  );
}

function DashboardHeader({ onLogout }) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <span className="brand-symbol">◇</span>
        GHOST<span>SCAN</span>
      </div>
      <div className="header-center">OFFICER SCREENING CONSOLE</div>
      <div className="header-right">
        <span className="online-status">● ONLINE</span>
        <button className="logout-terminal" onClick={onLogout}>LOGOUT</button>
      </div>
    </header>
  );
}

function StatCard({ label, value, note, tone = "" }) {
  return (
    <div className="overview-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone ? `${tone}-text` : ""}>{note}</small>
    </div>
  );
}

export default App;

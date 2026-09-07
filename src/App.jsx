import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("login");

  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");

  const [selectedInput, setSelectedInput] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanStage, setScanStage] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [backendResult, setBackendResult] = useState(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  /* =========================
     LOGIN
     ========================= */

  const handleLogin = (event) => {
    event.preventDefault();

    if (
      officerId === "officer" &&
      password === "ghost123"
    ) {
      setPage("dashboard");
    } else {
      alert("Invalid demo credentials");
    }
  };


  /* =========================
     LOGOUT
     ========================= */

  const logout = () => {
    setPage("login");
    setOfficerId("");
    setPassword("");
    setSelectedInput(null);
  };


  /* =========================
     START SCREENING
     ========================= */

  const startScreening = () => {
    setSelectedInput(null);
    setPage("intake");
  };


  /* =========================
     SELECT INPUT
     ========================= */

  const selectInput = (input) => {
    setSelectedInput(input);
  };
  /* =========================
   CAMERA
   ========================= */

const startCamera = async () => {
  try {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is not supported by this browser.");
      return;
    }

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        },
        audio: false
      });

    streamRef.current = stream;

    setCameraActive(true);

    setTimeout(() => {

      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        videoRef.current.play();

      }

    }, 100);

  } catch (error) {

    console.error("Camera error:", error);

    alert(
      "Camera access denied or unavailable. Please allow camera permission."
    );

  }
};


const stopCamera = () => {

  if (streamRef.current) {

    streamRef.current
      .getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;

  }

  setCameraActive(false);
};


const captureDocument = () => {

  if (!videoRef.current) {
    return;
  }

  const video = videoRef.current;

  const canvas = document.createElement("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const image = canvas.toDataURL("image/jpeg", 0.9);

  setCapturedImage(image);

  stopCamera();
};


const retakeDocument = () => {
  setCapturedImage(null);
  setBackendResult(null);
  setBackendError("");
  startCamera();
};


/* =========================
   BACKEND AI ANALYSIS
   ========================= */

const analyzeDocumentWithBackend = async () => {

  if (!capturedImage) {
    alert("Please capture a document first.");
    return;
  }

  setBackendLoading(true);
  setBackendError("");
  setBackendResult(null);

  try {

    const formData = new FormData();

    const base64 = capturedImage.split(",")[1];

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob(
      [byteArray],
      { type: "image/jpeg" }
    );

    formData.append(
      "document",
      blob,
      "document.jpg"
    );

    const response = await fetch(
      "http://127.0.0.1:8000/analyze",
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(
        `Backend returned ${response.status}`
      );
    }

    const result = await response.json();

    console.log(
      "GHOST SCAN AI RESULT:",
      result
    );

    setBackendResult(result);

  } catch (error) {

    console.error(
      "Backend analysis error:",
      error
    );

    setBackendError(
      "Unable to connect to Ghost Scan AI backend."
    );

  } finally {

    setBackendLoading(false);

  }
};


useEffect(() => {
  return () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };
}, []);


  /* =========================
     START SCANNING
     ========================= */

  const startScanning = () => {

    stopCamera();

    setScanStage(0);
    setScanProgress(0);
    setScanComplete(false);
    setBackendResult(null);
    setBackendError("");

    setPage("scanning");
  };


  /* =========================
     SCANNING SIMULATION
     =========================
     Frontend-only for now.
     Backend models will replace this later.
  */

  useEffect(() => {
    if (page !== "scanning") return;

    const stages = [
      { name: "IMAGE ACQUISITION", duration: 900 },
      { name: "OCR EXTRACTION", duration: 1100 },
      { name: "MRZ ANALYSIS", duration: 1000 },
      { name: "DOCUMENT INTEGRITY", duration: 1100 },
      { name: "IDENTITY VERIFICATION", duration: 1000 },
      { name: "RISK ANALYSIS", duration: 900 },
    ];

    let stageIndex = 0;
    let elapsed = 0;

    const timer = setInterval(() => {
      const current = stages[stageIndex];
      elapsed += 100;

      setScanProgress(Math.min(99, Math.round(
        ((stageIndex + Math.min(elapsed / current.duration, 1)) / stages.length) * 100
      )));

      if (elapsed >= current.duration) {
        if (stageIndex < stages.length - 1) {
          stageIndex += 1;
          elapsed = 0;
          setScanStage(stageIndex);
        } else {
          setScanProgress(100);
          setScanComplete(true);
          clearInterval(timer);
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [page]);


  /* =========================
     SCANNING PAGE
     ========================= */

  if (page === "scanning") {
    const scanStages = [
      "IMAGE ACQUISITION",
      "OCR EXTRACTION",
      "MRZ ANALYSIS",
      "DOCUMENT INTEGRITY",
      "IDENTITY VERIFICATION",
      "RISK ANALYSIS",
    ];

    return (
      <div className="scanning-page">
        <div className="scanning-grid"></div>

        <div className="scanning-topbar">
          <div>GHOST SCAN // SCANNING CORE</div>
          <div className="scanning-live-status">
            <span className="scanning-status-dot"></span>
            {scanComplete ? "ANALYSIS COMPLETE" : "PROCESSING DOCUMENT"}
          </div>
        </div>

        <main className="scanning-main">
          <div className="scanning-heading">
            <span>MODULE 02 // MULTI-LAYER ANALYSIS</span>
            <h1>Document Intelligence Scan</h1>
            <p>
              The captured document is being passed through the Ghost Scan analysis pipeline.
            </p>
          </div>

          <section className="scan-workspace">
            <div className="scan-visual-panel">
              <div className="scan-panel-header">
                <span>INPUT IMAGE // {selectedInput?.title?.toUpperCase() || "DOCUMENT"}</span>
                <span className="scan-panel-live">LIVE ANALYSIS</span>
              </div>

              <div className="scan-document-stage">
                {capturedImage ? (
                  <img src={capturedImage} alt="Document being scanned" className="scan-document-image" />
                ) : (
                  <div className="scan-document-placeholder">
                    <div className="scan-placeholder-icon">DOC</div>
                    <span>DOCUMENT INPUT RECEIVED</span>
                  </div>
                )}
                <div className="scan-document-overlay"></div>
                <div className="scan-horizontal-line"></div>
                <div className="scan-corner scan-corner-tl"></div>
                <div className="scan-corner scan-corner-tr"></div>
                <div className="scan-corner scan-corner-bl"></div>
                <div className="scan-corner scan-corner-br"></div>

                <div className="scan-processing-label">
                  {scanComplete ? "ANALYSIS COMPLETE" : scanStages[scanStage]}
                </div>
              </div>
            </div>

            <div className="scan-status-panel">
              <div className="scan-status-title">
                <span>ANALYSIS PIPELINE</span>
                <strong>{scanProgress}%</strong>
              </div>

              <div className="scan-progress-track">
                <div className="scan-progress-fill" style={{ width: `${scanProgress}%` }}></div>
              </div>

              <div className="scan-stage-list">
                {scanStages.map((stage, index) => {
                  const done = index < scanStage || scanComplete;
                  const active = index === scanStage && !scanComplete;

                  return (
                    <div
                      className={`scan-stage-row ${done ? "done" : ""} ${active ? "active" : ""}`}
                      key={stage}
                    >
                      <span className="scan-stage-number">
                        {done ? "✓" : String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="scan-stage-copy">
                        <strong>{stage}</strong>
                        <span>{done ? "COMPLETE" : active ? "PROCESSING" : "QUEUED"}</span>
                      </div>
                      <span className="scan-stage-indicator">
                        {done ? "OK" : active ? "RUN" : "--"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="scan-demo-notice">
                {backendError ? (
                  <>
                    <span>BACKEND ERROR</span>
                    <p>{backendError}</p>
                  </>
                ) : backendResult ? (
                  <>
                    <span>AI BACKEND CONNECTED</span>
                    <p>
                      OCR, document verification, tamper analysis and
                      risk scoring returned successfully from the Ghost
                      Scan FastAPI backend.
                    </p>
                  </>
                ) : backendLoading ? (
                  <>
                    <span>AI BACKEND PROCESSING</span>
                    <p>
                      Sending the captured document to the Ghost Scan
                      FastAPI analysis pipeline.
                    </p>
                  </>
                ) : (
                  <>
                    <span>AI READY</span>
                    <p>
                      Frontend scan sequence complete. Start AI analysis
                      to send the captured document to the FastAPI backend.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          {backendResult && (
            <section
              style={{
                marginTop: "18px",
                padding: "18px",
                border: "1px solid rgba(69,230,163,.28)",
                background: "rgba(5,25,22,.55)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "20px",
                  flexWrap: "wrap"
                }}
              >
                <div>
                  <span
                    style={{
                      color: "#45e6a3",
                      fontFamily: "monospace",
                      fontSize: "9px",
                      letterSpacing: "1.5px"
                    }}
                  >
                    BACKEND AI RESULT
                  </span>
                  <h2
                    style={{
                      margin: "8px 0 0",
                      fontSize: "20px"
                    }}
                  >
                    {backendResult.risk?.risk_level || "ANALYSIS COMPLETE"}
                  </h2>
                </div>

                <div
                  style={{
                    fontFamily: "monospace",
                    textAlign: "right"
                  }}
                >
                  <span
                    style={{
                      color: "#6d8da0",
                      fontSize: "9px",
                      letterSpacing: "1px"
                    }}
                  >
                    RISK SCORE
                  </span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#e4f4ff",
                      fontSize: "28px"
                    }}
                  >
                    {backendResult.risk?.risk_score ?? "N/A"}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  marginTop: "15px",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(160px,1fr))",
                  gap: "10px"
                }}
              >
                <div className="core-card">
                  <div className="core-card-content">
                    <h3>OCR CONFIDENCE</h3>
                    <p>
                      {backendResult.ocr_confidence ?? "N/A"}%
                    </p>
                  </div>
                </div>

                <div className="core-card">
                  <div className="core-card-content">
                    <h3>TAMPERING</h3>
                    <p>
                      {backendResult.tampering?.tampering_detected
                        ? "DETECTED"
                        : "NOT DETECTED"}
                    </p>
                  </div>
                </div>

                <div className="core-card">
                  <div className="core-card-content">
                    <h3>DOCUMENT STATUS</h3>
                    <p>
                      {backendResult.verification?.status ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="scan-footer">
            <div>
              <span>INPUT CHANNEL</span>
              <strong>{selectedInput?.title || "DOCUMENT"}</strong>
            </div>
            <div>
              <span>CORE STATUS</span>
              <strong className={scanComplete ? "scan-complete-text" : ""}>
                {scanComplete ? "ANALYSIS COMPLETE" : "RUNNING"}
              </strong>
            </div>
            {scanComplete && !backendResult && (
              <button
                className="scan-result-button"
                onClick={analyzeDocumentWithBackend}
                disabled={backendLoading}
              >
                {backendLoading
                  ? "RUNNING GHOST SCAN AI..."
                  : "RUN AI ANALYSIS →"}
              </button>
            )}

            {backendResult && (
              <button
                className="scan-result-button"
                onClick={() => {
                  console.log(
                    "FULL GHOST SCAN RESULT:",
                    backendResult
                  );
                  alert(
                    `AI ANALYSIS COMPLETE\n\nRisk Score: ${
                      backendResult.risk?.risk_score ?? "N/A"
                    }\nRisk Level: ${
                      backendResult.risk?.risk_level ?? "N/A"
                    }`
                  );
                }}
              >
                VIEW AI RESULT →
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }


  /* =========================
     LOGIN PAGE
     ========================= */

  if (page === "login") {
    return (
      <div className="login-page">

        <div className="background-grid"></div>
        <div className="scan-line"></div>

        {/* SYSTEM BAR */}

        <div className="system-bar">

          <span>
            GHOST SCAN // SECURE TERMINAL
          </span>

          <span className="system-status">

            <span className="status-dot"></span>

            SYSTEM ONLINE

          </span>

        </div>


        {/* MAIN LOGIN */}

        <main className="login-container">

          {/* BRAND */}

          <section className="brand-section">

            <div className="ghost-symbol">
              ◈
            </div>

            <h1>
              GHOST<span>SCAN</span>
            </h1>

            <p className="brand-subtitle">
              INTELLIGENT DOCUMENT & IDENTITY SCREENING
            </p>

            <div className="brand-line"></div>

            <p className="brand-description">
              Secure AI-assisted verification platform
              for authorized officers.
            </p>

          </section>


          {/* LOGIN PANEL */}

          <section className="login-panel">

            <div className="panel-header">

              <div>

                <span className="panel-label">
                  AUTHENTICATION MODULE
                </span>

                <h2>
                  Officer Access
                </h2>

              </div>

              <div className="security-icon">
                ◉
              </div>

            </div>


            <div className="security-message">

              <span>●</span>

              SECURE CHANNEL ESTABLISHED

            </div>


            <form onSubmit={handleLogin}>

              <div className="input-group">

                <label>
                  OFFICER IDENTIFICATION
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    ID
                  </span>

                  <input
                    type="text"
                    placeholder="ENTER OFFICER ID"
                    value={officerId}
                    onChange={(event) =>
                      setOfficerId(event.target.value)
                    }
                  />

                </div>

              </div>


              <div className="input-group">

                <label>
                  ACCESS CREDENTIAL
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    ••
                  </span>

                  <input
                    type="password"
                    placeholder="ENTER ACCESS KEY"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                  />

                </div>

              </div>


              <button
                className="authenticate-button"
                type="submit"
              >

                <span>
                  AUTHENTICATE
                </span>

                <span className="button-arrow">
                  →
                </span>

              </button>

            </form>


            <div className="panel-footer">

              <span>
                ENCRYPTED SESSION
              </span>

              <span>
                AUTH LEVEL: OFFICER
              </span>

            </div>

          </section>

        </main>


        <div className="terminal-footer">

          <span>
            GHOST SCAN v1.0
          </span>

          <span>
            DOCUMENT INTELLIGENCE SYSTEM
          </span>

          <span>
            AUTHORIZED PERSONNEL ONLY
          </span>

        </div>

      </div>
    );
  }


  /* =========================
     OFFICER DASHBOARD
     ========================= */

  if (page === "dashboard") {
    return (
      <div className="dashboard-page">

        <DashboardHeader
          onLogout={logout}
        />


        <main className="dashboard-main">

          <div className="dashboard-title">

            <div>

              <span className="dashboard-eyebrow">
                OFFICER CONSOLE // NODE 01
              </span>

              <h1>
                Document Intelligence
              </h1>

              <p>
                Central screening and identity
                verification console.
              </p>

            </div>


            <button
              className="dashboard-action"
              onClick={startScreening}
            >
              + NEW SCREENING
            </button>

          </div>


          {/* SYSTEM STATUS */}

          <section className="system-overview">

            <div className="overview-card">

              <span>
                DOCUMENTS PROCESSED
              </span>

              <strong>
                2,481
              </strong>

              <small>
                TODAY
              </small>

            </div>


            <div className="overview-card">

              <span>
                VERIFIED
              </span>

              <strong>
                2,103
              </strong>

              <small className="green-text">
                84.8% SUCCESS
              </small>

            </div>


            <div className="overview-card">

              <span>
                REVIEW REQUIRED
              </span>

              <strong>
                241
              </strong>

              <small className="yellow-text">
                OFFICER REVIEW
              </small>

            </div>


            <div className="overview-card">

              <span>
                HIGH RISK
              </span>

              <strong>
                137
              </strong>

              <small className="red-text">
                FLAGGED
              </small>

            </div>

          </section>


          {/* DASHBOARD LOWER SECTION */}

          <section className="dashboard-panels">

            {/* RECENT ACTIVITY */}

            <div className="dashboard-panel">

              <div className="panel-title-row">

                <div>

                  <span>
                    LIVE ACTIVITY
                  </span>

                  <h2>
                    Recent Screenings
                  </h2>

                </div>

                <span className="live-indicator">
                  ● LIVE
                </span>

              </div>


              <ActivityRow
                document="PASSPORT"
                number="P784219"
                status="VERIFIED"
                type="green"
              />

              <ActivityRow
                document="VISA"
                number="V392810"
                status="REVIEW"
                type="yellow"
              />

              <ActivityRow
                document="PASSPORT"
                number="P662819"
                status="HIGH RISK"
                type="red"
              />

              <ActivityRow
                document="ID CARD"
                number="ID882193"
                status="VERIFIED"
                type="green"
              />

            </div>


            {/* QUICK SCREENING */}

            <div className="dashboard-panel quick-screening">

              <span>
                QUICK ACTION
              </span>

              <h2>
                Begin New Screening
              </h2>

              <p>
                Select a document intake channel
                and begin the Ghost Scan pipeline.
              </p>

              <button
                className="dashboard-action full-width"
                onClick={startScreening}
              >
                OPEN DOCUMENT INTAKE →
              </button>

            </div>

          </section>

        </main>

      </div>
    );
  }


  /* =====================================================
     DOCUMENT INTAKE
     ===================================================== */

  if (page === "intake") {
    return (
      <div className="intake-page">

        <IntakeHeader
          onBack={() => setPage("dashboard")}
        />


        <main className="intake-main">

          {/* ============================================
              PAGE HEADING
              ============================================ */}

          <div className="intake-heading">

            <span>
              MODULE 01 // DOCUMENT INTAKE
            </span>

            <h1>
              Select Input Channel
            </h1>

            <p>
              Choose how the document or passenger
              data enters the Ghost Scan system.
            </p>

          </div>


          {/* =================================================
              ACTUAL INPUT CHANNELS
              ================================================= */}

          <section className="input-section">

            <div className="section-label">

              <span>
                01
              </span>

              DOCUMENT INPUT CHANNELS

            </div>


            <div className="input-grid">


              {/* PROFESSIONAL SCANNER */}

              <InputCard
                icon="▣"
                title="Professional Scanner"
                description="Capture passports and identity documents using an integrated professional document scanner."
                tag="HARDWARE"
                onClick={() =>
                  selectInput({
                    title: "Professional Scanner"
                  })
                }
              />


              {/* LIVE CAMERA */}

              <InputCard
                icon="CAM"
                title="Live Camera"
                description="Capture a document directly using the camera connected to this device."
                tag="CAMERA"
                onClick={() => {
                  selectInput({ title: "Live Camera" });
                  startCamera();
                }}
              />


              {/* MOBILE APP */}

              <InputCard
                icon="PHONE"
                title="Mobile App Capture"
                description="Receive a document capture from an authorized Ghost Scan mobile application."
                tag="REMOTE"
                onClick={() =>
                  selectInput({
                    title: "Mobile App Capture"
                  })
                }
              />


              {/* SELF SERVICE KIOSK */}

              <InputCard
                icon="▥"
                title="Self-Service Kiosk"
                description="Receive document input through an integrated automated passenger kiosk."
                tag="KIOSK"
                onClick={() =>
                  selectInput({
                    title: "Self-Service Kiosk"
                  })
                }
              />


              {/* E-GATE */}

              <InputCard
                icon="⇥"
                title="E-Gate"
                description="Receive document and biometric input from an automated border-control lane."
                tag="BORDER CONTROL"
                onClick={() =>
                  selectInput({
                    title: "E-Gate"
                  })
                }
              />


            </div>

          </section>


          {/* =================================================
              SCANNING CORE
              ================================================= */}

          <section className="input-section scanning-core-section">

            <div className="section-label">

              <span>
                02
              </span>

              SCANNING CORE

            </div>


            <div className="core-header">

              <div>

                <h2>
                  Multi-Layer Document Analysis
                </h2>

                <p>
                  After document input, Ghost Scan
                  automatically runs the following
                  inspection and verification layers.
                </p>

              </div>

              <div className="core-status">

                <span className="status-dot"></span>

                CORE STANDBY

              </div>

            </div>


            {/* SCANNING CORE GRID */}

            <div className="core-grid">


              <CoreCard
                number="01"
                title="Visible Light"
                description="Standard document image analysis"
              />


              <CoreCard
                number="02"
                title="UV Analysis"
                description="UV-responsive security feature inspection"
              />


              <CoreCard
                number="03"
                title="IR Analysis"
                description="Infrared document characteristic analysis"
              />


              <CoreCard
                number="04"
                title="Raking Light"
                description="Surface and alteration inspection"
              />


              <CoreCard
                number="05"
                title="OCR Engine"
                description="Extract printed document information"
              />


              <CoreCard
                number="06"
                title="MRZ Analysis"
                description="Machine Readable Zone extraction and validation"
              />


              <CoreCard
                number="07"
                title="Barcode / PDF417"
                description="Decode supported machine-readable barcodes"
              />


              <CoreCard
                number="08"
                title="NFC / RFID"
                description="Read supported electronic document chip data"
              />


              <CoreCard
                number="09"
                title="Tamper Analysis"
                description="Detect inconsistencies and possible document alterations"
              />


              <CoreCard
                number="10"
                title="Identity Verification"
                description="Compare extracted identity information"
              />


              <CoreCard
                number="11"
                title="Expiry Verification"
                description="Check document validity and expiration status"
              />


              <CoreCard
                number="12"
                title="Blacklist / Watchlist"
                description="Check against authorized security data sources"
              />

            </div>


            {/* PIPELINE */}

            <div className="core-pipeline">

              <div className="pipeline-node">
                INPUT
              </div>

              <div className="pipeline-line"></div>

              <div className="pipeline-node">
                EXTRACTION
              </div>

              <div className="pipeline-line"></div>

              <div className="pipeline-node">
                VERIFICATION
              </div>

              <div className="pipeline-line"></div>

              <div className="pipeline-node">
                RISK ENGINE
              </div>

              <div className="pipeline-line"></div>

              <div className="pipeline-node final-node">
                RESULT
              </div>

            </div>

          </section>


          {/* LIVE CAMERA PANEL */}
          {selectedInput?.title === "Live Camera" && (
            <section className="camera-panel">
              <div className="camera-header">
                <div>
                  <span className="section-label-small">LIVE CAPTURE // CAMERA 01</span>
                  <h2>Document Camera</h2>
                  <p>Position the document inside the scanning frame.</p>
                </div>
                <div className="camera-status">
                  <span className="camera-status-dot"></span>
                  {cameraActive ? "CAMERA ACTIVE" : capturedImage ? "CAPTURE COMPLETE" : "CAMERA READY"}
                </div>
              </div>

              <div className="camera-view">
                {!capturedImage && cameraActive && (
                  <>
                    <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
                    <div className="camera-overlay">
                      <div className="scan-corner camera-top-left"></div>
                      <div className="scan-corner camera-top-right"></div>
                      <div className="scan-corner camera-bottom-left"></div>
                      <div className="scan-corner camera-bottom-right"></div>
                      <div className="camera-scan-line"></div>
                      <span className="camera-instruction">ALIGN DOCUMENT WITH FRAME</span>
                    </div>
                  </>
                )}

                {!cameraActive && !capturedImage && (
                  <div className="camera-placeholder">
                    <div className="camera-placeholder-icon">CAM</div>
                    <h3>CAMERA STANDBY</h3>
                    <p>Camera has not been activated.</p>
                    <button className="camera-button" onClick={startCamera}>ACTIVATE CAMERA</button>
                  </div>
                )}

                {capturedImage && (
                  <img src={capturedImage} alt="Captured document" className="captured-document" />
                )}
              </div>

              <div className="camera-controls">
                {cameraActive && (
                  <button className="capture-button" onClick={captureDocument}>◉ CAPTURE DOCUMENT</button>
                )}
                {capturedImage && (
                  <>
                    <button className="secondary-camera-button" onClick={retakeDocument}>↻ RETAKE</button>
                    <button className="continue-camera-button" onClick={startScanning}>CONTINUE TO SCAN →</button>
                  </>
                )}
              </div>
            </section>
          )}


          {/* =================================================
              SELECTED INPUT
              ================================================= */}

          {selectedInput && (

            <div className="selected-module">

              <div>

                <span>
                  ACTIVE INPUT CHANNEL
                </span>

                <strong>
                  {selectedInput.title}
                </strong>

              </div>


              <div className="selected-actions">

                <span className="ready-badge">
                  ● READY
                </span>

                <button
                  onClick={() =>
                    setSelectedInput(null)
                  }
                >
                  CHANGE
                </button>

              </div>

            </div>

          )}

        </main>

      </div>
    );
  }


  return null;
}


/* =========================================
   DASHBOARD HEADER
   ========================================= */

function DashboardHeader({ onLogout }) {

  return (

    <header className="dashboard-header">

      <div className="dashboard-brand">

        <span className="brand-symbol">
          ◈
        </span>

        GHOST<span>SCAN</span>

      </div>


      <div className="header-center">
        OFFICER SCREENING CONSOLE
      </div>


      <div className="header-right">

        <span className="online-status">
          ● ONLINE
        </span>

        <button
          className="logout-terminal"
          onClick={onLogout}
        >
          LOGOUT
        </button>

      </div>

    </header>

  );
}


/* =========================================
   INTAKE HEADER
   ========================================= */

function IntakeHeader({ onBack }) {

  return (

    <header className="dashboard-header">

      <button
        className="back-terminal"
        onClick={onBack}
      >
        ← BACK
      </button>


      <div className="dashboard-brand">

        <span className="brand-symbol">
          ◈
        </span>

        GHOST<span>SCAN</span>

      </div>


      <div className="header-center">
        DOCUMENT INTAKE SYSTEM
      </div>


      <span className="online-status">
        ● READY
      </span>

    </header>

  );
}


/* =========================================
   INPUT CARD
   ========================================= */

function InputCard({
  icon,
  title,
  description,
  tag,
  onClick
}) {

  return (

    <button
      className="intake-card"
      onClick={onClick}
    >

      <div className="intake-icon">
        {icon}
      </div>


      <div className="intake-card-content">

        <span className="intake-tag">
          {tag}
        </span>

        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>

      </div>


      <span className="intake-arrow">
        →
      </span>

    </button>

  );
}


/* =========================================
   SCANNING CORE CARD
   ========================================= */

function CoreCard({
  number,
  title,
  description
}) {

  return (

    <div className="core-card">

      <div className="core-number">
        {number}
      </div>

      <div className="core-card-content">

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <div className="core-indicator">
        ○
      </div>

    </div>

  );
}


/* =========================================
   ACTIVITY ROW
   ========================================= */

function ActivityRow({
  document,
  number,
  status,
  type
}) {

  return (

    <div className="activity-row">

      <div className="activity-document">
        ◈
      </div>


      <div className="activity-info">

        <strong>
          {document}
        </strong>

        <span>
          {number}
        </span>

      </div>


      <span className={`activity-status ${type}`}>
        {status}
      </span>

    </div>

  );
}


export default App;
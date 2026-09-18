import React, { useEffect, useState } from "react";
import "./style.css";

function App() {
  // ==============================
  // FastAPI Backend
  // ==============================
  const API_URL = "http://127.0.0.1:8000";

  // ==============================
  // State
  // ==============================
  const [message, setMessage] = useState("Checking backend...");
  const [success, setSuccess] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [transcript, setTranscript] = useState("");

  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [importantDates, setImportantDates] = useState([]);

  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionError, setQuestionError] = useState("");

  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ==============================
  // Ask AI
  // ==============================
  const handleAskAI = async (event) => {
   
  event.preventDefault();

  setQuestionError("");
  setAnswer("");

  if (!question.trim()) {
    setQuestionError("Please enter a question.");
    return;
  }

  if (!transcript.trim()) {
    setQuestionError(
      "Please analyze a meeting before asking AI."
    );
    return;
  }

  try {
    setAsking(true);

    console.log("Sending Ask AI request...");

    const response = await fetch(
      `${API_URL}/api/meetings/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          transcript: transcript.trim(),
          filename: selectedFile ? selectedFile.name : "pasted-transcript.txt"
        }),
      }
    );

    const data = await response.json();

    console.log("Ask AI status:", response.status);
    console.log("Ask AI data:", data);

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.error ||
          data.message ||
          "Failed to get AI answer."
      );
    }

    const aiAnswer =
      data.answer ||
      data.response ||
      data.result ||
      data.message ||
      data.output;

    if (!aiAnswer) {
      throw new Error(
        "FastAPI responded successfully, but no answer field was returned."
      );
    }

    setAnswer(aiAnswer);
  } catch (err) {
    console.error("Ask AI error:", err);

    setQuestionError(
      err.message || "Unable to get an AI answer."
    );
  } finally {
    setAsking(false);
  }
};
  // ==============================
  // Backend connection
  // ==============================
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/test`
        );

        if (!response.ok) {
          throw new Error(
            "Backend connection failed"
          );
        }

        const data = await response.json();

        setMessage(
          data.message || "Backend connected"
        );

        setSuccess(
          data.success === true || response.ok
        );
      } catch (err) {
        console.error(
          "Backend connection error:",
          err
        );

        setMessage(
          "Backend is not available"
        );

        setSuccess(false);
      }
    };

    checkBackend();

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ==============================
  // File selection
  // ==============================
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedExtensions = [
      ".txt",
      ".pdf",
      ".docx",
      ".mp3",
      ".wav",
      ".m4a",
    ];

    const fileName = file.name.toLowerCase();

    const isAllowed = allowedExtensions.some(
      (extension) => fileName.endsWith(extension)
    );

    if (!isAllowed) {
      setSelectedFile(null);

      setError(
        "Please select a TXT, PDF, DOCX, MP3, WAV, or M4A file."
      );

      return;
    }

    setSelectedFile(file);

    // Clear old results
    setError("");
    setSummary("");
    setKeyPoints([]);
    setDecisions([]);
    setActionItems([]);
    setImportantDates([]);
    setAnswer("");
    setQuestionError("");
  };

  // ==============================
  // Upload file to FastAPI
  // ==============================
  const uploadFile = async () => {
    if (!selectedFile) {
      throw new Error("Please select a file.");
    }

    const formData = new FormData();

    formData.append("file", selectedFile);

    console.log(
      "Uploading file:",
      selectedFile.name
    );

    const response = await fetch(
      `${API_URL}/api/upload/`,
      {
        method: "POST",
        body: formData,
      }
    );

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "FastAPI returned an invalid response."
      );
    }

    console.log(
      "FastAPI upload response:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.error ||
          data.message ||
          "File upload failed."
      );
    }

    if (data.success === false) {
      throw new Error(
        data.detail ||
          data.error ||
          data.message ||
          "File upload and analysis failed."
      );
    }

    return data;
  };

  // ==============================
  // Analyze meeting
  // ==============================
  const handleAnalyze = async (event) => {
    event.preventDefault();

    setError("");
    setSummary("");
    setKeyPoints([]);
    setDecisions([]);
    setActionItems([]);
    setImportantDates([]);
    setAnswer("");
    setQuestionError("");

    if (!selectedFile && !transcript.trim()) {
      setError(
        "Please upload a TXT, PDF, DOCX, MP3, WAV, or M4A meeting file, or paste your meeting transcript."
      );

      return;
    }

    setLoading(true);
    setMessage(
      "AI is analyzing your meeting..."
    );
    setSuccess(false);

    try {
      let result;

      // ==============================
      // Uploaded file
      // ==============================
      if (selectedFile) {
        /*
          FastAPI /api/upload/ handles:

          1. Saves the file
          2. Extracts text
          3. Cleans text
          4. Sends it to AI
          5. Returns the analysis
        */

        result = await uploadFile();

        console.log(
          "Meeting analysis result:",
          result
        );

        setTranscript(
          result.transcript || ""
        );

        setSummary(
          result.summary ||
            "No summary returned."
        );

        setKeyPoints(
          Array.isArray(result.key_points)
            ? result.key_points
            : []
        );

        setDecisions(
          Array.isArray(result.decisions)
            ? result.decisions
            : []
        );

        setActionItems(
          Array.isArray(result.action_items)
            ? result.action_items
            : []
        );

        setImportantDates(
          Array.isArray(
            result.important_dates
          )
            ? result.important_dates
            : []
        );

        setMessage(
          "Meeting analyzed successfully."
        );

        setSuccess(true);
      }

      // ==============================
      // Pasted transcript
      // ==============================
      else if (transcript.trim()) {
        setError(
          "Pasted transcript analysis is not connected to FastAPI yet. Please upload a TXT, PDF, DOCX, MP3, WAV, or M4A file."
        );

        setSuccess(false);

        return;
      }

      // ==============================
      // Scroll to summary
      // ==============================
      setTimeout(() => {
        document
          .getElementById("summary")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 200);
    } catch (err) {
      console.error(
        "Analyze error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while analyzing the meeting."
      );

      setMessage("Analysis failed.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Clean text for speech
  // ==============================
  const cleanTextForSpeech = (text) => {
    if (!text) {
      return "";
    }

    return text
      .replace(/[*_`#]/g, "")
      .replace(/\|/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/^[-•●▪◦]\s*/gm, "")
      .replace(/^\d+\.\s*/gm, "")
      .replace(/^[-_=]{3,}$/gm, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // ==============================
  // Read summary
  // ==============================
  const speakSummary = () => {
    if (!summary) {
      alert("Please analyze a meeting first.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert(
        "Your browser does not support text-to-speech."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const cleanSummary =
      cleanTextForSpeech(summary);

    if (!cleanSummary) {
      alert("There is no readable summary.");
      return;
    }

    const speech =
      new SpeechSynthesisUtterance(
        cleanSummary
      );

    speech.lang = "en-US";
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = () => {
      setIsSpeaking(true);
    };

    speech.onend = () => {
      setIsSpeaking(false);
    };

    speech.onerror = (event) => {
      console.error(
        "Speech synthesis error:",
        event
      );

      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  // ==============================
  // Stop speech
  // ==============================
  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  };

  // ==============================
  // Clear everything
  // ==============================
  const clearAll = () => {
    setSelectedFile(null);
    setTranscript("");
    setSummary("");
    setKeyPoints([]);
    setDecisions([]);
    setActionItems([]);
    setImportantDates([]);
    setQuestion("");
    setAnswer("");
    setError("");
    setQuestionError("");

    setMessage(
      success
        ? "Backend connected"
        : "Checking backend..."
    );

    const fileInput =
      document.getElementById(
        "meeting-file"
      );

    if (fileInput) {
      fileInput.value = "";
    }

    stopSpeaking();
  };

  // ==============================
  // Professional list renderer
  // ==============================
  const renderList = (
    items,
    emptyText,
    type = "default"
  ) => {
    if (!items || items.length === 0) {
      return (
        <p className="empty-list">
          {emptyText}
        </p>
      );
    }

    return (
      <div
        className={`professional-list ${type}-list`}
      >
        {items.map((item, index) => {
          if (
            typeof item === "object" &&
            item !== null
          ) {
            const task =
              item.task ||
              item.action ||
              item.description ||
              item.title ||
              "Action item";

            const owner =
              item.owner ||
              item.assignee ||
              item.responsible ||
              item.assigned_to ||
              "Not assigned";

            const deadline =
              item.deadline ||
              item.due_date ||
              item.date ||
              item.deadline_date ||
              "No deadline";

            return (
              <div
                className="professional-item"
                key={index}
              >
                <div className="item-number">
                  {index + 1}
                </div>

                <div className="item-content">
                  <strong>{task}</strong>

                  {type === "action" && (
                    <div className="item-meta">
                      <span>
                        👤 {owner}
                      </span>

                      <span>
                        📅 {deadline}
                      </span>
                    </div>
                  )}

                  {type !== "action" && (
                    <p>
                      {item.text ||
                        item.value ||
                        ""}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              className="professional-item"
              key={index}
            >
              <div className="item-number">
                {index + 1}
              </div>

              <div className="item-content">
                <strong>{item}</strong>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ==============================
  // Page
  // ==============================
  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            AI
          </div>

          <div>
            <h2>Meeting AI</h2>

            <span>
              Intelligence Portal
            </span>
          </div>
        </div>

        <nav className="nav-menu">
          <a
            href="#dashboard"
            className="nav-item active"
          >
            <span>⌂</span>
            Dashboard
          </a>

          <a
            href="#upload"
            className="nav-item"
          >
            <span>↑</span>
            Upload Meeting
          </a>

          <a
            href="#summary"
            className="nav-item"
          >
            <span>✦</span>
            AI Summary
          </a>

          <a
            href="#ask-ai"
            className="nav-item"
          >
            <span>◈</span>
            Ask AI
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div
            className={`connection-card ${
              success
                ? "online"
                : "offline"
            }`}
          >
            <span className="connection-dot"></span>

            <div>
              <strong>
                {success
                  ? "Backend Online"
                  : "Backend Offline"}
              </strong>

              <small>
                {message}
              </small>
            </div>
          </div>

          <div className="sidebar-footer">
            AI Meeting Intelligence
            <span>v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <span className="topbar-label">
              AI WORKSPACE
            </span>

            <h1>
              Meeting Intelligence
            </h1>
          </div>

          <div className="topbar-status">
            <span
              className={`live-dot ${
                success ? "green" : ""
              }`}
            ></span>

            {success
              ? "System Connected"
              : "Connecting..."}
          </div>
        </header>

        {/* General error */}
        {error && (
          <div className="error-box">
            <span>!</span>
            {error}
          </div>
        )}

        {/* Hero */}
        <section
          className="hero"
          id="dashboard"
        >
          <div className="hero-content">
            <span className="hero-badge">
              ✦ AI-POWERED MEETING ASSISTANT
            </span>

            <h2>
              Turn every meeting into
              <span>
                {" "}
                actionable intelligence.
              </span>
            </h2>

            <p>
              Upload your meeting transcript,
              let AI understand the conversation,
              and instantly discover summaries,
              decisions, action items and answers.
            </p>

            <div className="hero-actions">
              <a
                href="#upload"
                className="hero-button"
              >
                Start Analyzing
                <span>→</span>
              </a>

              <a
                href="#ask-ai"
                className="hero-secondary"
              >
                Ask AI
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb orb-one"></div>
            <div className="orb orb-two"></div>

            <div className="ai-card">
              <div className="ai-card-header">
                <span className="ai-icon">
                  ✦
                </span>

                <div>
                  <strong>
                    AI Analysis
                  </strong>

                  <small>
                    Ready to process
                  </small>
                </div>

                <span className="ai-check">
                  ✓
                </span>
              </div>

              <div className="ai-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="ai-mini-grid">
                <div>
                  <strong>
                    Summary
                  </strong>

                  <small>
                    Generated
                  </small>
                </div>

                <div>
                  <strong>
                    Actions
                  </strong>

                  <small>
                    Detected
                  </small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">
              ↑
            </div>

            <div>
              <span>
                Meeting File
              </span>

              <strong>
                {selectedFile
                  ? selectedFile.name
                  : "No file selected"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              ✦
            </div>

            <div>
              <span>
                AI Analysis
              </span>

              <strong>
                {loading
                  ? "Analyzing..."
                  : summary
                  ? "Completed"
                  : "Ready"}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              ◈
            </div>

            <div>
              <span>
                AI Assistant
              </span>

              <strong>
                {loading
                  ? "Thinking..."
                  : "Ready"}
              </strong>
            </div>
          </div>
        </section>

        {/* Upload */}
        <section
          className="workspace-card"
          id="upload"
        >
          <div className="section-heading">
            <div>
              <span className="step-label">
                STEP 01
              </span>

              <h2>
                Upload Your Meeting
              </h2>

              <p>
                Upload a TXT, PDF, DOCX, MP3,
                WAV or M4A meeting file, or paste
                your transcript below.
              </p>
            </div>

            <div className="section-number">
              01
            </div>
          </div>

          <div className="upload-grid">
            <div className="upload-zone">
              <input
                id="meeting-file"
                type="file"
                accept=".txt,.pdf,.docx,.mp3,.wav,.m4a"
                onChange={handleFileChange}
              />

              <label
                htmlFor="meeting-file"
                className="upload-label"
              >
                <div className="upload-circle">
                  ↑
                </div>

                <h3>
                  Upload Meeting File
                </h3>

                <p>
                  Click to browse TXT, PDF, DOCX,
                  MP3, WAV or M4A files
                </p>

                <span className="browse-button">
                  Browse Files
                </span>

                {selectedFile && (
                  <div className="selected-file">
                    ✓ {selectedFile.name}
                  </div>
                )}
              </label>
            </div>

            <div className="transcript-area">
              <div className="input-title">
                <span>✎</span>
                Or paste transcript
              </div>

              <textarea
                value={transcript}
                onChange={(event) =>
                  setTranscript(
                    event.target.value
                  )
                }
                placeholder="Paste your meeting transcript here..."
              />

              <div className="character-count">
                {transcript.length} characters
              </div>
            </div>
          </div>

          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  ✦ Analyze Meeting
                </>
              )}
            </button>

            <button
              type="button"
              className="clear-button"
              onClick={clearAll}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </section>

        {/* Summary */}
        <section
          className="workspace-card"
          id="summary"
        >
          <div className="section-heading">
            <div>
              <span className="step-label">
                STEP 02
              </span>

              <h2>
                AI Meeting Summary
              </h2>

              <p>
                Your AI-generated meeting
                intelligence will appear here.
              </p>
            </div>

            <div className="section-number">
              02
            </div>
          </div>

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>

              <h3>
                AI is analyzing your meeting
              </h3>

              <p>
                Extracting the most important
                information...
              </p>
            </div>
          )}

          {!loading && !summary && (
            <div className="empty-state">
              <div className="empty-icon">
                ✦
              </div>

              <h3>
                Your meeting insights will
                appear here
              </h3>

              <p>
                Upload a transcript or paste
                your meeting text, then click
                Analyze Meeting.
              </p>
            </div>
          )}

          {!loading && summary && (
            <div className="summary-wrapper">
              <div className="summary-toolbar">
                <span>
                  ✦ AI Generated Analysis
                </span>

                <div>
                  {!isSpeaking ? (
                    <button
                      type="button"
                      className="small-button"
                      onClick={speakSummary}
                    >
                      🔊 Read Summary
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="stop-button"
                      onClick={stopSpeaking}
                    >
                      ■ Stop
                    </button>
                  )}
                </div>
              </div>

              <div className="summary-result">
                {summary}
              </div>
            </div>
          )}
        </section>

        {/* Intelligence cards */}
        {summary && (
          <section className="insights-grid">

            {/* Key Points */}
            <div className="insight-card">
              <span className="insight-icon">
                📌
              </span>

              <div>
                <h3>
                  Key Discussion Points
                </h3>

                <p>
                  Important topics identified
                  by AI.
                </p>

                {renderList(
                  keyPoints,
                  "No key discussion points found.",
                  "key-point"
                )}
              </div>
            </div>

            {/* Decisions */}
            <div className="insight-card">
              <span className="insight-icon">
                ✓
              </span>

              <div>
                <h3>
                  Important Decisions
                </h3>

                <p>
                  Decisions extracted from
                  the meeting.
                </p>

                {renderList(
                  decisions,
                  "No decisions found.",
                  "decision"
                )}
              </div>
            </div>

            {/* Action Items */}
            <div className="insight-card">
              <span className="insight-icon">
                ☑
              </span>

              <div>
                <h3>
                  Action Items
                </h3>

                <p>
                  Tasks and responsibilities
                  identified.
                </p>

                {renderList(
                  actionItems,
                  "No action items found.",
                  "action"
                )}
              </div>
            </div>

            {/* Important Dates */}
            <div className="insight-card">
              <span className="insight-icon">
                ◷
              </span>

              <div>
                <h3>
                  Dates & Deadlines
                </h3>

                <p>
                  Important dates found in
                  the meeting.
                </p>

                {renderList(
                  importantDates,
                  "No important dates found.",
                  "date"
                )}
              </div>
            </div>

          </section>
        )}

        {/* Ask AI */}
        <section
          className="workspace-card"
          id="ask-ai"
        >
          <div className="section-heading">
            <div>
              <span className="step-label">
                STEP 03
              </span>

              <h2>
                Ask AI About Your Meeting
              </h2>

              <p>
                Ask questions and get intelligent
                answers based on your meeting.
              </p>
            </div>

            <div className="section-number">
              03
            </div>
          </div>

          <div className="question-examples">
            <button
              type="button"
              onClick={() =>
                setQuestion(
                  "What decisions were made during the meeting?"
                )
              }
            >
              What decisions were made?
            </button>

            <button
              type="button"
              onClick={() =>
                setQuestion(
                  "Who is responsible for the action items?"
                )
              }
            >
              Who has action items?
            </button>

            <button
              type="button"
              onClick={() =>
                setQuestion(
                  "What are the important deadlines?"
                )
              }
            >
              What are the deadlines?
            </button>
          </div>

          <form onSubmit={handleAskAI}>
            <div className="ask-box">
              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                placeholder="Ask anything about this meeting..."
              />

              <button
                type="submit"
                disabled={asking}
              >
                {asking
                  ? "Thinking..."
                  : "Ask AI →"}
              </button>
            </div>
          </form>

          {questionError && (
            <div className="error-box">
              <span>!</span>
              {questionError}
            </div>
          )}

          {answer && (
            <div className="answer-card">
              <div className="answer-title">
                <span>✦</span>

                <div>
                  <strong>
                    AI Assistant
                  </strong>

                  <small>
                    Based on your meeting
                  </small>
                </div>
              </div>

              <div className="answer-text">
                {answer}
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <div>
            <strong>
              AI Meeting Intelligence
            </strong>

            <span>
              Transform meetings into
              actionable insights.
            </span>
          </div>

          <div>
            FastAPI · React · Groq AI
          </div>
        </footer>

      </main>
    </div>
  );
}

export default App;

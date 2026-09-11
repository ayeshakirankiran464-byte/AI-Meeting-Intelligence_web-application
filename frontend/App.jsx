import React, { useEffect, useState } from "react";
import "./style.css";

function App() {
  const API_URL = "http://127.0.0.1:5000";

  const [message, setMessage] = useState("Checking backend...");
  const [success, setSuccess] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [transcript, setTranscript] = useState("");

  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // ==============================
  // Backend connection
  // ==============================
  useEffect(() => {
    fetch(`${API_URL}/api/test`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend connection failed");
        }
        return response.json();
      })
      .then((data) => {
        setMessage(data.message || "Backend connected");
        setSuccess(data.success === true);
      })
      .catch((err) => {
        console.error("Backend connection error:", err);
        setMessage("Backend se connection nahi ho raha.");
        setSuccess(false);
      });

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
    const file = event.target.files[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError("");
    setAnswer("");
    setQuestionError("");
  };

  // ==============================
  // Upload file
  // ==============================
  const uploadFile = async () => {
    if (!selectedFile) {
      throw new Error("Please select a file.");
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch(`${API_URL}/api/upload/`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "File upload failed.");
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
    setAnswer("");
    setQuestionError("");

    if (!selectedFile && !transcript.trim()) {
      setError(
        "Please upload a .txt transcript or paste transcript text."
      );
      return;
    }

    setLoading(true);

    try {
      let result;

      // Pasted transcript
      if (transcript.trim()) {
        const response = await fetch(
          `${API_URL}/api/meetings/summarize`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transcript: transcript.trim(),
            }),
          }
        );

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Meeting analysis failed."
          );
        }
      }

      // Uploaded file
      else {
        if (
          !selectedFile.name
            .toLowerCase()
            .endsWith(".txt")
        ) {
          throw new Error(
            "Currently only .txt transcript files can be analyzed."
          );
        }

        const uploadResult = await uploadFile();

        const response = await fetch(
          `${API_URL}/api/meetings/summarize`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: uploadResult.filename,
            }),
          }
        );

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Meeting analysis failed."
          );
        }
      }

      setSummary(
        result.summary || "No summary returned."
      );

      setMessage("Meeting analyzed successfully.");
      setSuccess(true);
    } catch (err) {
      console.error("Analyze error:", err);

      setError(
        err.message || "Something went wrong."
      );

      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

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

    if (!transcript.trim() && !selectedFile) {
      setQuestionError(
        "Please enter or upload a meeting transcript first."
      );
      return;
    }

    setAsking(true);

    try {
      let result;

      // Pasted transcript
      if (transcript.trim()) {
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
            }),
          }
        );

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "AI question failed."
          );
        }
      }

      // Uploaded txt file
      else {
        if (
          !selectedFile.name
            .toLowerCase()
            .endsWith(".txt")
        ) {
          throw new Error(
            "Ask AI currently supports .txt transcript files only."
          );
        }

        const uploadResult = await uploadFile();

        const response = await fetch(
          `${API_URL}/api/meetings/query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question: question.trim(),
              filename: uploadResult.filename,
            }),
          }
        );

        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "AI question failed."
          );
        }
      }

      setAnswer(
        result.answer || "No answer returned."
      );
    } catch (err) {
      console.error("Ask AI error:", err);

      setQuestionError(
        err.message || "Unable to get AI answer."
      );
    } finally {
      setAsking(false);
    }
  };

  // ==============================
  // Read summary
  // ==============================
  const speakSummary = () => {
    if (!summary) {
      alert("Pehle meeting analyze karein.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support text-to-speech.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(summary);

    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = () => {
      setIsSpeaking(true);
    };

    speech.onend = () => {
      setIsSpeaking(false);
    };

    speech.onerror = () => {
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
  // Page
  // ==============================
  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🤖</span>
            AI Meeting Intelligence
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-header">
            <h3>Meeting History</h3>
          </div>

          <div className="history-list">
            <div className="history-item active">
              <div className="history-title">
                Current Meeting
              </div>

              <div className="history-date">
                Today
              </div>

              <div className="history-preview">
                AI Meeting Intelligence session
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <span
            className={`health-status ${
              success ? "online" : "offline"
            }`}
          >
            {success
              ? "● Backend Online"
              : "● Backend Offline"}
          </span>
        </div>

      </aside>

      {/* Main */}
      <main className="main-content">

        <div className="top-bar">
          <h1>AI Meeting Intelligence</h1>

          <p className="subtitle">
            Smart Meeting Analysis & Knowledge Assistant
          </p>
        </div>

        {/* Backend */}
        <div className="card">
          <h2>Backend Connection</h2>

          <p>{message}</p>

          {success && (
            <p className="tts-speaking">
              ✅ Frontend successfully connected to Flask backend!
            </p>
          )}
        </div>

        {/* Upload */}
        <div className="card">

          <h2>📁 Upload Meeting</h2>

          <form onSubmit={handleAnalyze}>

            <label>
              <strong>Audio / Transcript File</strong>
            </label>

            <br />

            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.mp3,.wav,.m4a,.mp4"
              onChange={handleFileChange}
            />

            {selectedFile && (
              <p>
                Selected file:{" "}
                <strong>{selectedFile.name}</strong>
              </p>
            )}

            <br />

            <label>
              <strong>Or paste transcript text</strong>
            </label>

            <textarea
              value={transcript}
              onChange={(e) =>
                setTranscript(e.target.value)
              }
              placeholder="Paste your meeting transcript here..."
              rows="8"
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "12px",
                boxSizing: "border-box",
              }}
            />

            {error && (
              <p
                style={{
                  color: "red",
                  marginTop: "10px",
                }}
              >
                ❌ {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                marginTop: "15px",
              }}
            >
              {loading
                ? "⏳ Analyzing..."
                : "🚀 Upload & Analyze"}
            </button>

          </form>
        </div>

        {/* Summary */}
        <div className="card result-card">

          <h2>📝 AI Meeting Summary</h2>

          <div className="summary-content">

            {summary ? (
              <pre
                className="summary-text"
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  margin: 0,
                }}
              >
                {summary}
              </pre>
            ) : (
              <p className="empty-state">
                Meeting summary will appear here after processing your meeting.
              </p>
            )}

          </div>

          <div className="tts-controls">

            <button
              type="button"
              className="btn btn-speak"
              onClick={speakSummary}
              disabled={!summary}
            >
              🔊 Read Summary
            </button>

            <button
              type="button"
              className="btn btn-stop-speech"
              onClick={stopSpeaking}
              disabled={!isSpeaking}
            >
              ⏹ Stop
            </button>

          </div>

          {isSpeaking && (
            <p className="tts-speaking">
              🔊 Reading aloud...
            </p>
          )}

        </div>

        {/* Meeting Intelligence */}
        <div className="results-section">

          <h2 className="meeting-title">
            Meeting Intelligence
          </h2>

          <div className="results-grid">

            <div className="card result-card">
              <h3>📌 Key Discussion Points</h3>

              <p className="empty-state">
                Key discussion points are included in the AI summary.
              </p>
            </div>

            <div className="card result-card">
              <h3>✅ Important Decisions</h3>

              <p className="empty-state">
                Important decisions are included in the AI summary.
              </p>
            </div>

            <div className="card result-card">
              <h3>📋 Action Items</h3>

              <p className="empty-state">
                Action items are included in the AI summary.
              </p>
            </div>

            <div className="card result-card">
              <h3>📅 Dates & Deadlines</h3>

              <p className="empty-state">
                Dates and deadlines are included in the AI summary.
              </p>
            </div>

          </div>

        </div>

        {/* Ask AI */}
        <div className="card chat-card">

          <h2>
            💬 Ask about this Meeting
          </h2>

          <p className="chat-hint">
            Ask questions about your meeting.
          </p>

          <div className="chat-messages">

            <div className="chat-bubble chat-ai">

              <div className="chat-role">
                AI Assistant
              </div>

              <div className="chat-content">
                Hello! I can help you understand your meeting.
              </div>

            </div>

            {answer && (
              <div className="chat-bubble chat-ai">

                <div className="chat-role">
                  AI Assistant
                </div>

                <div className="chat-content">
                  {answer}
                </div>

              </div>
            )}

          </div>

          <form
            onSubmit={handleAskAI}
            className="chat-input-row"
          >

            <input
              type="text"
              className="question-input"
              value={question}
              onChange={(e) =>
                setQuestion(e.target.value)
              }
              placeholder="Ask something about the meeting..."
              disabled={asking}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={asking}
            >
              {asking
                ? "⏳ Asking..."
                : "Ask AI"}
            </button>

          </form>

          {questionError && (
            <p
              style={{
                color: "red",
                marginTop: "10px",
              }}
            >
              ❌ {questionError}
            </p>
          )}

        </div>

      </main>
    </div>
  );
}

export default App;
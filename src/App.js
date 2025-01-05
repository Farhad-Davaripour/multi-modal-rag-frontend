import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function App() {
  const [query, setQuery] = useState("");
  const [responseText, setResponseText] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [dots, setDots] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);

  // Animate dots for "Generating..." states
  useEffect(() => {
    let interval;
    if (isLoadingText || isLoadingImages) {
      interval = setInterval(() => {
        setDots((prev) => (prev.length < 3 ? prev + "." : ""));
      }, 500);
    } else {
      setDots("");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoadingText, isLoadingImages]);

  // Timer for response generation with milliseconds
  useEffect(() => {
    let timerInterval;
    if (isLoadingText) {
      setElapsedTime(0);
      timerInterval = setInterval(() => {
        setElapsedTime((prev) => prev + 10); // Update every 10 milliseconds
      }, 10);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isLoadingText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoadingText(true);
    setIsLoadingImages(false);
    setResponseText("");
    setImageUrls([]);
    setTotalResponseTime(0);

    const startTime = Date.now();

    try {
      const res = await fetch("http://4.227.76.55/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`);
        setIsLoadingText(false);
        return;
      }

      const data = await res.json();

      setResponseText(data.response || "");
      setIsLoadingText(false);

      setIsLoadingImages(true);
      setImageUrls(data.images || []);
      setIsLoadingImages(false);

      const endTime = Date.now();
      setTotalResponseTime((endTime - startTime) / 1000);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Something went wrong while fetching data.");
      setIsLoadingText(false);
      setIsLoadingImages(false);
    }
  };

  // Format elapsed time to include milliseconds
  const formattedElapsedTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const milliseconds = (time % 1000).toString().padStart(3, "0");
    return `${seconds}.${milliseconds}s`;
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "1rem" }}>
      <h1>Multi Modal RAG</h1>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="queryInput">Enter your query:</label>
          <input
            id="queryInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask me anything..."
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
          />
        </div>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Submit
        </button>
      </form>

      {/* Generating Response Box */}
      {isLoadingText && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f0f0f0",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        >
          <h2 style={{ color: "#0D47A1" }}>Generating response{dots}</h2>
          <p style={{ fontSize: "1.0rem", color: "#0D47A1" }}>
            Elapsed time:{" "}
            <span style={{ fontFamily: "monospace" }}>
              {formattedElapsedTime(elapsedTime)}
            </span>
          </p>
        </div>
      )}

      {/* Loading Images Box */}
      {isLoadingImages && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f0f0f0",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        >
          <h2>Loading images{dots}</h2>
        </div>
      )}

      {/* Response Box */}
      {!isLoadingText && responseText && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f9f9f9",
            padding: "1rem",
            overflowX: "auto",
          }}
        >
          <h2>Response:</h2>
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {responseText}
          </ReactMarkdown>
        </div>
      )}

      {/* Total Response Time Box */}
      {!isLoadingText && !isLoadingImages && totalResponseTime > 0 && (
        <div
          style={{
            marginTop: "1rem",
            background: "#e0f0e0",
            padding: "1rem",
            border: "1px solid #90ee90",
            borderRadius: "5px",
          }}
        >
          <p style={{ fontSize: "1.1rem" }}>
            Total time taken to generate response:{" "}
            <span style={{ fontWeight: "bold" }}>
              {totalResponseTime.toFixed(3)} seconds
            </span>
          </p>
        </div>
      )}

      {/* Sources Box */}
      {!isLoadingImages && imageUrls.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f9f9f9",
            padding: "1rem",
          }}
        >
          <h2>Sources:</h2>
          {imageUrls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Retrieved image ${idx}`}
              style={{ maxWidth: "100%", marginBottom: "1rem" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
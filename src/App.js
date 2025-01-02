import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function App() {
  const [query, setQuery] = useState("");
  const [responseText, setResponseText] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for animating "Generating response..." dots
  const [dots, setDots] = useState("");

  // Animate dots: . -> .. -> ... -> (reset)
  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setDots((prev) => (prev.length < 3 ? prev + "." : ""));
      }, 500);
    } else {
      setDots("");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResponseText("");
    setImageUrls([]);

    try {
      // Update the API URL to point to the external IP of the AKS load balancer
      const res = await fetch("http://4.227.76.55/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`);
        return;
      }

      const data = await res.json();
      setResponseText(data.response);
      setImageUrls(data.images || []);
    } catch (err) {
      console.error("Error calling the FastAPI endpoint:", err);
      alert("Something went wrong. Check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "1rem" }}>
      <h1>Multi Modal RAG</h1>

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

      {isLoading && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f9f9f9",
            padding: "1rem",
          }}
        >
          <h2>Generating response{dots}</h2>
        </div>
      )}

      {!isLoading && responseText && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f9f9f9",
            padding: "1rem",
            overflowX: "auto",
          }}
        >
          <h2>Response:</h2>
          {/* Render LaTeX/Markdown properly */}
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {responseText}
          </ReactMarkdown>
        </div>
      )}

      {!isLoading && imageUrls.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f9f9f9",
            padding: "1rem",
          }}
        >
          <h2>Images:</h2>
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
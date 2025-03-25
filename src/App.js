import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function App() {
  const { instance, accounts } = useMsal();

  // Load values from .env:
  // Make sure you prefix environment variables with "REACT_APP_"
  const apiUrl = process.env.REACT_APP_API_URL || "https://multimodalrag-backend.azurewebsites.net/query";
  const indexUrl = process.env.REACT_APP_INDEX_URL || "https://multimodalrag-backend.azurewebsites.net/index_new_documents";
  const apiScope = process.env.REACT_APP_API_SCOPE;

  // MSAL request object
  const request = {
    scopes: [apiScope, "openid", "profile"],
  };

  const [accessToken, setAccessToken] = useState("");
  const [query, setQuery] = useState("");
  const [responseText, setResponseText] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [retrievedDocument, setRetrievedDocument] = useState("");
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [dots, setDots] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);

  // For the new indexing feature
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState("");
  const [documentSummary, setDocumentSummary] = useState(null);

  // 1. Sign-in logic
  const handleLogin = async () => {
    try {
      await instance.loginPopup(request);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  // 2. Acquire token (popup or silent)
  const acquireToken = async () => {
    try {
      const response = await instance.acquireTokenPopup(request);
      setAccessToken(response.accessToken);
      console.log("Access Token:", response.accessToken);
    } catch (err) {
      console.error("Acquire token failed:", err);
    }
  };

  // 2b. Refresh token (silent if possible, fallback to popup)
  const handleRefreshToken = async () => {
    try {
      // Attempt silent token acquisition first
      const silentResponse = await instance.acquireTokenSilent(request);
      setAccessToken(silentResponse.accessToken);
      console.log("Token refreshed silently:", silentResponse.accessToken);
    } catch (err) {
      // If silent fails, fallback to popup
      console.warn("Silent token refresh failed, falling back to popup.");
      try {
        const popupResponse = await instance.acquireTokenPopup(request);
        setAccessToken(popupResponse.accessToken);
        console.log("Token refreshed via popup:", popupResponse.accessToken);
      } catch (popupErr) {
        console.error("Failed to refresh token:", popupErr);
      }
    }
  };

  // 3. If user is logged in, acquire a token on load
  useEffect(() => {
    if (accounts.length > 0) {
      acquireToken();
    }
    // eslint-disable-next-line
  }, [accounts]);

  // 4. Loading-dots effect
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

  // 5. Response timer
  useEffect(() => {
    let timerInterval;
    if (isLoadingText) {
      setElapsedTime(0);
      timerInterval = setInterval(() => {
        setElapsedTime((prev) => prev + 10);
      }, 10);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isLoadingText]);

  // New function to handle indexing documents
  const handleIndexNewDocuments = async () => {
    if (!accessToken) {
      alert("Please sign in first!");
      return;
    }

    setIsIndexing(true);
    setIndexingStatus("Indexing in progress...");
    setDocumentSummary(null);

    try {
      const res = await fetch(indexUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        // The endpoint expects a QueryModel with `query`, but it's not really used
        body: JSON.stringify({ query: "Indexing new documents" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`);
        setIsIndexing(false);
        setIndexingStatus("");
        return;
      }

      const data = await res.json();
      // This endpoint returns {"document_summary_dict": ...}
      setDocumentSummary(data.document_summary_dict || {});
      setIsIndexing(false);
      setIndexingStatus("Documents indexed successfully!");
    } catch (error) {
      console.error("Error indexing documents:", error);
      alert("Something went wrong while indexing documents.");
      setIsIndexing(false);
      setIndexingStatus("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoadingText(true);
    setIsLoadingImages(false);
    setResponseText("");
    setImageUrls([]);
    setTotalResponseTime(0);
    setRetrievedDocument("");

    const startTime = Date.now();

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
      setRetrievedDocument(data.retrieved_document || "");
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

  // Utility to format ms
  const formattedElapsedTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const milliseconds = (time % 1000).toString().padStart(3, "0");
    return `${seconds}.${milliseconds}s`;
  };

  return (
    <div style={{ width: "60%", margin: "auto", padding: "1rem" }}>
      <h1>Multi Modal RAG</h1>

      {/* If no user is signed in, show a button to sign in */}
      {accounts.length === 0 && (
        <button onClick={handleLogin} style={{ marginBottom: "1rem" }}>
          Sign In With Azure AD
        </button>
      )}

      {/* If user is signed in, show user info, partial token, and a Refresh Token button */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <p>Signed in as: {accounts[0].username}</p>
          <p style={{ wordWrap: "break-word" }}>
            Token (truncated): {accessToken.slice(0, 10)}...
          </p>
          <button onClick={handleRefreshToken} style={{ marginTop: "0.5rem" }}>
            Refresh Token
          </button>
        </div>
      )}

      {/* Button to trigger indexing new documents */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={handleIndexNewDocuments}
            disabled={isIndexing || !accessToken}
            style={{ padding: "0.5rem 1rem" }}
          >
            {isIndexing ? "Indexing..." : "Index New Documents"}
          </button>
          {indexingStatus && <p style={{ marginTop: "0.5rem" }}>{indexingStatus}</p>}
          {documentSummary && Object.keys(documentSummary).length > 0 && (
            <div style={{ marginTop: "1rem", background: "#f9f9f9", padding: "1rem" }}>
              <h3>Document Summary:</h3>
              <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                {JSON.stringify(documentSummary, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

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
        <button
          type="submit"
          style={{ padding: "0.5rem 1rem" }}
          disabled={!accessToken} // disable if no token yet
        >
          Submit
        </button>
      </form>

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
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {responseText}
          </ReactMarkdown>
        </div>
      )}

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

      {!isLoadingText && retrievedDocument && (
        <div style={{ marginTop: "1rem" }}>
          <h2>Retrieved Document:</h2>
          <a href={retrievedDocument} target="_blank" rel="noopener noreferrer">
            View Document
          </a>
        </div>
      )}

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
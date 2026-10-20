import React, { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import SearchApp from "./search/SearchApp.jsx";
import "./styles/index.css";

const AssistantApp = lazy(() => import("./App.jsx"));

function BlueApp() {
  const [assistantOpen, setAssistantOpen] = useState(window.location.hash === "#assistant");

  useEffect(() => {
    const syncRoute = () => setAssistantOpen(window.location.hash === "#assistant");
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  return assistantOpen
    ? <Suspense fallback={<div className="route-loading" role="status">Loading Blue Assistant…</div>}>
        <AssistantApp onGoSearch={() => { window.location.hash = ""; }} />
      </Suspense>
    : <SearchApp />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><BlueApp /></React.StrictMode>
);

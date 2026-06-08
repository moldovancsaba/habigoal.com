"use client";

import React, { useState } from "react";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds";

export default function WearablesConnectFlow() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const handleConnect = () => {
    setStatus("connecting");
    setTimeout(() => setStatus("connected"), 1500);
  };

  return (
    <div className="wearables-dashboard">
      <PageHeader 
        title="Wearable Ecosystem" 
        subtitle="Connect your devices for telemetry ingestion"
      />
      <div style={{ marginTop: "24px", maxWidth: "600px" }}>
        <SectionPanel title="Oura Ring Connection">
          {status === "disconnected" && (
            <div>
              <p>Connect your Oura account to sync readiness and sleep data.</p>
              <SemanticButton action="save" onClick={handleConnect} />
            </div>
          )}
          {status === "connecting" && (
            <StateBlock 
              variant="loading"
              title="Connecting..."
            />
          )}
          {status === "connected" && (
            <StateBlock 
              variant="success"
              title="Connected"
              description="Syncing daily metrics automatically"
            />
          )}
        </SectionPanel>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { PageHeader, SectionPanel, StateBlock } from "@doneisbetter/gds";

export default function DigitalTwinDashboard() {
  return (
    <div className="digital-twin-dashboard">
      <PageHeader 
        title="Unified Digital Twin" 
        subtitle="Real-time performance and skeleton tracking insights"
      />
      <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
        <SectionPanel title="Movement Analysis">
          <StateBlock 
            variant="success"
            title="Active"
            description="17 joints tracked with 95% confidence"
          />
        </SectionPanel>
        <SectionPanel title="Cluster Assessment">
          <StateBlock 
            variant="info"
            title="High-Intensity Sprint"
            description="Based on event-driven AI inference"
          />
        </SectionPanel>
      </div>
    </div>
  );
}

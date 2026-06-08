"use client";

import React, { useState } from "react";

interface ConsentModalProps {
  athleteId: string;
  isOpen: boolean;
  onSuccess: () => void;
}

export function ConsentModal({ athleteId, isOpen, onSuccess }: ConsentModalProps) {
  const [purposes, setPurposes] = useState({
    daily_check_in: false,
    wearable_data: false,
    media_upload: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (purpose: keyof typeof purposes) => {
    setPurposes((prev) => ({ ...prev, [purpose]: !prev[purpose] }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const selectedPurposes = Object.entries(purposes)
        .filter(([, isSelected]) => isSelected)
        .map(([purpose]) => purpose);

      if (selectedPurposes.length === 0) {
        setError("Please select at least one purpose to proceed.");
        setLoading(false);
        return;
      }

      await Promise.all(
        selectedPurposes.map((purpose) =>
          fetch(`/api/athletes/${athleteId}/consents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purpose, method: "web_form" }),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to save consent");
          })
        )
      );

      onSuccess();
    } catch (error: unknown) {
      console.error("Consent flow failed:", error);
      setError(error instanceof Error ? error.message : "An error occurred while saving consent.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-labelledby="consent-modal-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
        <h2 id="consent-modal-title" className="text-xl font-bold">
          Data Processing Consent
        </h2>
        
        <p className="text-sm text-gray-600">
          Athlete IQ requires your consent to process your health and performance data to provide our services.
        </p>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            <strong>Submission failed</strong>
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4 mt-4">
          <label className="flex items-start space-x-3">
            <input type="checkbox" checked={purposes.daily_check_in} onChange={() => handleToggle("daily_check_in")} className="mt-1" />
            <div>
              <span className="block font-medium">Daily Check-in Data</span>
              <span className="block text-sm text-gray-500">Allow processing of daily readiness and wellness surveys.</span>
            </div>
          </label>

          <label className="flex items-start space-x-3">
            <input type="checkbox" checked={purposes.wearable_data} onChange={() => handleToggle("wearable_data")} className="mt-1" />
            <div>
              <span className="block font-medium">Wearable Data Integration</span>
              <span className="block text-sm text-gray-500">Allow syncing with Oura, Garmin, Whoop, etc.</span>
            </div>
          </label>

          <label className="flex items-start space-x-3">
            <input type="checkbox" checked={purposes.media_upload} onChange={() => handleToggle("media_upload")} className="mt-1" />
            <div>
              <span className="block font-medium">Media Upload & Vision AI</span>
              <span className="block text-sm text-gray-500">Allow uploading photos/videos for posture and sprint analysis.</span>
            </div>
          </label>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!purposes.daily_check_in || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? "Saving..." : "Acknowledge & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

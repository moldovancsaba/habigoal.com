import React from 'react';

export default function AthletePortalPage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Athlete Twin</h1>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">Readiness Score</h2>
        <div className="text-4xl font-bold text-green-600">82</div>
        <p className="text-gray-600 mt-2">Zone: Good. Proceed with planned session.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Dimension Radar</h2>
        {/* Placeholder for GDS Radar Chart */}
        <div className="h-48 bg-gray-100 rounded flex items-center justify-center text-gray-500">
          Twin Dimension Radar Chart (Physical, Performance, Technical, Recovery, Cognitive)
        </div>
      </div>
      
      <button className="w-full bg-blue-600 text-white rounded py-3 font-semibold">
        View Session Plan
      </button>
    </div>
  );
}

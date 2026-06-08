import React from 'react';

export default function FMSPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Functional Movement Screen (FMS)</h1>
      <p className="mb-8 text-gray-600">Record baseline movement mechanics to populate the Physical Twin and assess injury risk.</p>
      
      <form className="space-y-6 bg-white p-6 rounded shadow">
        <div>
          <label className="block font-semibold mb-2">Deep Squat</label>
          <select className="w-full border rounded p-2">
            <option>3 - Perfect</option>
            <option>2 - Compensation</option>
            <option>1 - Cannot Perform</option>
            <option>0 - Pain</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-2">Hurdle Step (L/R)</label>
          <div className="flex gap-4">
            <select className="w-1/2 border rounded p-2"><option>Select Left...</option></select>
            <select className="w-1/2 border rounded p-2"><option>Select Right...</option></select>
          </div>
        </div>

        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded">
          Save FMS Assessment
        </button>
      </form>
    </div>
  );
}

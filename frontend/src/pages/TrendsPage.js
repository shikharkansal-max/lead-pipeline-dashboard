import { useState } from "react";
import AITrends from "../components/AITrends";

const TrendsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50" data-testid="trends-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Industry Trends</h1>
            <p className="mt-1 text-sm text-gray-500">
              Stay updated with the latest AI developments, market trends, and insights relevant to your business
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AITrends />
      </div>
    </div>
  );
};

export default TrendsPage;
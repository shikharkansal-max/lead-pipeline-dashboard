import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import MQLDashboard from "./pages/MQLDashboard";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mql-sql" element={<MQLDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
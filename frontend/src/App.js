import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/AppLayout';
import CampaignDashboard from './campaignDashboard';
import CampaignPlanner from './pages/CampaignPlanner';
import WarRoom from './pages/WarRoom';

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<CampaignDashboard />} />
          <Route path="campaign-planner" element={<CampaignPlanner />} />
          <Route path="war-room" element={<WarRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

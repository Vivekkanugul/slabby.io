import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Layout/Navbar";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import CardDetail from "./pages/CardDetail";
import Portfolio from "./pages/Portfolio";
import AIInsights from "./pages/AIInsights";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import WhatIfSimulator from "./pages/WhatIfSimulator";
import GradeCalculator from "./pages/GradeCalculator";
import CardScreener from "./pages/CardScreener";

// Protected Route wrapper
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </>
  );
};

// Public Route with Navbar (for marketplace)
const PublicWithNav = () => {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </>
  );
};

// Auth pages layout (no navbar)
const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Public with navbar */}
      <Route element={<PublicWithNav />}>
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/card/:cardId" element={<CardDetail />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/simulator" element={<WhatIfSimulator />} />
        <Route path="/analytics/grading" element={<GradeCalculator />} />
        <Route path="/analytics/screener" element={<CardScreener />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App min-h-screen bg-[#05050A]">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#0A0A0C',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </div>
  );
}

export default App;

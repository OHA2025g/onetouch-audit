import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/index.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider, useTheme } from "./lib/theme";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CFOCockpit from "./pages/CFOCockpit";
import ControllerDashboard from "./pages/ControllerDashboard";
import AuditWorkspace from "./pages/AuditWorkspace";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import MyCases from "./pages/MyCases";
import CasesList from "./pages/CasesList";
import CaseDetail from "./pages/CaseDetail";
import EvidenceExplorer from "./pages/EvidenceExplorer";
import Copilot from "./pages/Copilot";
import AdminConsole from "./pages/AdminConsole";
import Upload from "./pages/Upload";
import AuditorPortal from "./pages/AuditorPortal";
import DrillView from "./pages/DrillView";
import EntityRollup from "./pages/EntityRollup";
import GovernanceConsole from "./pages/GovernanceConsole";
import ConnectorsConsole from "./pages/ConnectorsConsole";
import ApprovalsQueue from "./pages/ApprovalsQueue";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export function roleToPath(role) {
  if (role === "Controller") return "/app/controller";
  if (role === "Internal Auditor") return "/app/audit";
  if (role === "Compliance Head") return "/app/compliance";
  if (role === "Process Owner") return "/app/my-cases";
  if (role === "External Auditor") return "/app/auditor";
  return "/app/cfo";
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleToPath(user.role)} replace />;
}

function LandingOrAppHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={roleToPath(user.role)} replace />;
  return <Landing />;
}

function LoginOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={roleToPath(user.role)} replace />;
  return <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ThemedToaster />
          <Routes>
            <Route path="/" element={<LandingOrAppHome />} />
            <Route path="/login" element={<LoginOrRedirect />} />
            <Route path="/app" element={<Protected><Layout /></Protected>}>
              <Route index element={<RoleHome />} />
              <Route path="cfo" element={<CFOCockpit />} />
              <Route path="controller" element={<ControllerDashboard />} />
              <Route path="audit" element={<AuditWorkspace />} />
              <Route path="compliance" element={<ComplianceDashboard />} />
              <Route path="my-cases" element={<MyCases />} />
              <Route path="cases" element={<CasesList />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />
              <Route path="evidence" element={<EvidenceExplorer />} />
              <Route path="evidence/:exceptionId" element={<EvidenceExplorer />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="admin" element={<AdminConsole />} />
              <Route path="rollups" element={<EntityRollup />} />
              <Route path="governance" element={<GovernanceConsole />} />
              <Route path="connectors" element={<ConnectorsConsole />} />
              <Route path="approvals" element={<ApprovalsQueue />} />
              <Route path="upload" element={<Upload />} />
              <Route path="auditor" element={<AuditorPortal />} />
              <Route path="drill/:type/:id" element={<DrillView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      toastOptions={{
        style: {
          background: theme === "light" ? "#FFFFFF" : "#141414",
          border: `1px solid ${theme === "light" ? "#D6D3C7" : "#262626"}`,
          borderRadius: 0,
          color: theme === "light" ? "#1A1814" : "#FFFFFF",
          fontFamily: "IBM Plex Sans",
        },
      }}
    />
  );
}

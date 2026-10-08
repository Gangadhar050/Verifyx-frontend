import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import CandidateRegister from "./pages/CandidateRegister";
import CandidatePortal from "./pages/CandidatePortal";
import CandidateWelcome from "./pages/CandidateWelcome";
import Dashboard from "./pages/Dashboard";
import EmployeeList from "./pages/EmployeeList";
import EmployeeDetails from "./pages/EmployeeDetails";
import VerificationRequest from "./pages/VerificationRequest";
import DocumentUpload from "./pages/DocumentUpload";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import AddEmployee from "./pages/AddEmployee";
import EditEmployee from "./pages/EditEmployee";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/candidate-register" element={<CandidateRegister />} />
        <Route path="/candidate-login" element={<Login mode="candidate" />} />
        <Route path="/admin-login" element={<Login mode="admin" />} />

        <Route
          path="/candidate-welcome"
          element={
            <ProtectedRoute allowed={["CANDIDATE"]}>
              <CandidateWelcome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowed={["CANDIDATE"]}>
              <CandidatePortal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate-documents"
          element={
            <ProtectedRoute allowed={["CANDIDATE"]}>
              <DocumentUpload mode="candidate" />
            </ProtectedRoute>
          }
        />

        <Route path="/documents" element={<Navigate to="/candidate-documents" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <EmployeeList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <EmployeeDetails />
            </ProtectedRoute>
          }
        />


        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <EditEmployee />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-employee"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <AddEmployee />
            </ProtectedRoute>
          }
        />

        <Route
          path="/verification"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <VerificationRequest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-documents"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <DocumentUpload mode="admin" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR"]}>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowed={["ADMIN", "HR", "CANDIDATE"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </AuthProvider>
  );
}
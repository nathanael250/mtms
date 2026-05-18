import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/shared/DashboardPage";
import LoginPage from "./pages/shared/LoginPage";
import UsersPage from "./pages/admin/UsersPage";
import JobsPage from "./pages/admin/JobsPage";
import JobDetailPage from "./pages/admin/JobDetailPage";
import WorkflowPage from "./pages/shared/WorkflowPage";
import TasksPage from "./pages/shared/TasksPage";
import ReportsPage from "./pages/shared/ReportsPage";
import MentionsPage from "./pages/shared/MentionsPage";
import DocLibraryPage from "./pages/shared/DocLibraryPage";
import ContactsPage from "./pages/shared/ContactsPage";
import ActivityLogsPage from "./pages/admin/ActivityLogsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import DocumentCategoriesPage from "./pages/admin/DocumentCategoriesPage";
import GoogleDriveSettingsPage from "./pages/admin/GoogleDriveSettingsPage";
//anything here
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflow"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <WorkflowPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <JobDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doc-library"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <DocLibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doc-library/:view"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <DocLibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentions"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <MentionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <ContactsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-logs"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ActivityLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/document-categories"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DocumentCategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/google-drive"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <GoogleDriveSettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import AdminDashboardPage from "../admin/AdminDashboardPage";
import StaffDashboardPage from "../staff/StaffDashboardPage";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const endpoint =
          user?.role === "admin" ? "/dashboard/admin" : "/dashboard/staff";
        const response = await apiFetch(endpoint, { token });
        setData(response);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    if (user?.role !== "admin") {
      loadDashboard();
    }
  }, [token, user]);

  if (user?.role === "admin") {
    return <AdminDashboardPage />;
  }

  return <StaffDashboardPage data={data} error={error} />;
}


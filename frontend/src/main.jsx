import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const routerBasename = import.meta.env.VITE_ROUTER_BASENAME || "/";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

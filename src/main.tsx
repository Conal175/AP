import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastContainer, useToastManager } from "./components/ui/Toast";

function Root() {
  const { toasts, removeToast } = useToastManager();
  return (
    <>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);

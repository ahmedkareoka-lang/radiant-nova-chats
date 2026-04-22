import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";

// Capacitor native status bar
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#0d0a1a" });
  });
  import("@capacitor/keyboard").then(({ Keyboard }) => {
    Keyboard.setAccessoryBarVisible({ isVisible: false });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

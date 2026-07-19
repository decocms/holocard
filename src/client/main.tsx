import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/bricolage-grotesque";
import React from "react";
import { createRoot } from "react-dom/client";
import { CARD_STYLES } from "@/core/card";
import App from "./App";
import "./styles.css";

const cardStyles = document.createElement("style");
cardStyles.dataset.holocard = "core";
cardStyles.textContent = CARD_STYLES;
document.head.appendChild(cardStyles);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

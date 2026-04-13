import React from "react";
import { createRoot } from "react-dom/client";
import Activities from "./src/components/activities";

var mount = document.getElementById("activities-root");

if (mount) {
  var groupId = mount.dataset.groupId || '';
  createRoot(mount).render(<Activities groupId={groupId} />);
}
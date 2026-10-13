import React from "react";
import ReactDOM from "react-dom/client";

export { _roots } from "@react-three/fiber";
export * as THREE from "three";
export { GLTFExporter } from "three-stdlib";
// Resolve through Vite so fixtures share the app's dependency instances.
export { React, ReactDOM };

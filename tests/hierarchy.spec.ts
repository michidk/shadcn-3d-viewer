import { expect, test } from "@playwright/test";
import { indexHierarchy } from "../src/components/ui/model-viewer/inspector-hierarchy";
import type { ModelInspection } from "../src/components/ui/model-viewer/model-inspection";

test("hierarchy search reveals matches and ancestors regardless of collapse", () => {
  const nodes: ModelInspection["nodes"] = [
    { id: "0", name: "Scene", type: "Group", depth: 0, mesh: false },
    { id: "0/0", name: "Arm", type: "Group", depth: 1, mesh: false },
    { id: "0/0/0", name: "Hand", type: "Mesh", depth: 2, mesh: true },
    { id: "0/1", name: "Leg", type: "Mesh", depth: 1, mesh: true },
  ];
  const index = indexHierarchy(nodes);
  expect(index.visible("", new Set(["0/0"])).map(node => node.name)).toEqual(["Scene", "Arm", "Leg"]);
  expect(index.visible("HAND", new Set(["0"])).map(node => node.name)).toEqual(["Scene", "Arm", "Hand"]);
  expect(index.visible("missing", new Set())).toEqual([]);
  expect(indexHierarchy([...nodes].reverse()).visible("", new Set(["0"])).map(node => node.id)).toEqual(["0"]);
});

test("large hierarchy searches retain source order and stop at shared ancestors", () => {
  const nodes: ModelInspection["nodes"] = [{ id: "0", name: "Scene", type: "Group", depth: 0, mesh: false }];
  for (let i = 0; i < 20_000; i++) nodes.push({ id: `0/${i}`, name: `Mesh ${i}`, type: "Mesh", depth: 1, mesh: true });
  const index = indexHierarchy(nodes);
  expect(index.visible("mesh", new Set())).toEqual(nodes);
  expect(index.visible("19999", new Set()).map(node => node.id)).toEqual(["0", "0/19999"]);
  expect(index.visible("", new Set(["0"]))).toHaveLength(1);
});

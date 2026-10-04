import { expect, test } from "@playwright/test";
import { indexHierarchy } from "../../src/components/ui/model-viewer/inspector-hierarchy";
import type { ModelInspection } from "../../src/components/ui/model-viewer/model-inspection";

test("hierarchy search reveals matches and ancestors regardless of collapse", () => {
  const nodes: ModelInspection["nodes"] = [
    { id: "0", name: "Scene", type: "Group", depth: 0, mesh: false },
    { id: "0/0", name: "Arm", type: "Group", depth: 1, mesh: false },
    { id: "0/0/0", name: "Hand", type: "Mesh", depth: 2, mesh: true },
    { id: "0/1", name: "Leg", type: "Mesh", depth: 1, mesh: true },
  ];
  const index = indexHierarchy(nodes);
  expect(index.visible("", new Set(["0/0"])).map((node) => node.name)).toEqual([
    "Scene",
    "Arm",
    "Leg",
  ]);
  expect(index.visible("HAND", new Set(["0"])).map((node) => node.name)).toEqual([
    "Scene",
    "Arm",
    "Hand",
  ]);
  expect(index.visible("missing", new Set())).toEqual([]);
  expect(
    indexHierarchy([...nodes].reverse())
      .visible("", new Set(["0"]))
      .map((node) => node.id),
  ).toEqual(["0"]);
});

test("large hierarchy searches retain source order and stop at shared ancestors", () => {
  const nodes: ModelInspection["nodes"] = [
    { id: "0", name: "Scene", type: "Group", depth: 0, mesh: false },
  ];
  for (let i = 0; i < 20_000; i++)
    nodes.push({ id: `0/${i}`, name: `Mesh ${i}`, type: "Mesh", depth: 1, mesh: true });
  const index = indexHierarchy(nodes);
  expect(index.visible("mesh", new Set())).toEqual(nodes);
  expect(index.visible("19999", new Set()).map((node) => node.id)).toEqual(["0", "0/19999"]);
  expect(index.visible("", new Set(["0"]))).toHaveLength(1);
});

test("model resources survive shared consumers and Strict Mode, then dispose once", async () => {
  const { Group, Mesh, BoxGeometry, MeshStandardMaterial, Texture, SkinnedMesh, Skeleton, Bone } =
    await import("three");
  const { retainModelResources } = await import(
    "../../src/components/ui/model-viewer/model-resources"
  );
  const texture = new Texture();
  const material = new MeshStandardMaterial({ map: texture, normalMap: texture });
  const geometry = new BoxGeometry();
  const first = new Group();
  first.add(new Mesh(geometry, material), new Mesh(geometry, material));
  const second = new Mesh(geometry, material);
  const disposed = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener("dispose", () => disposed.geometry++);
  material.addEventListener("dispose", () => disposed.material++);
  texture.addEventListener("dispose", () => disposed.texture++);
  const releaseFirst = retainModelResources(first);
  const releaseSecond = retainModelResources(second);
  releaseFirst();
  await Promise.resolve();
  expect(disposed).toEqual({ geometry: 0, material: 0, texture: 0 });
  releaseSecond();
  const releaseRemount = retainModelResources(second);
  await Promise.resolve();
  expect(disposed).toEqual({ geometry: 0, material: 0, texture: 0 });
  releaseRemount();
  releaseRemount();
  await Promise.resolve();
  expect(disposed).toEqual({ geometry: 1, material: 1, texture: 1 });
  // Cached objects can be used again; a later release must free new allocations.
  retainModelResources(first)();
  await Promise.resolve();
  expect(disposed).toEqual({ geometry: 2, material: 2, texture: 2 });
  const skinned = new SkinnedMesh(geometry, material);
  skinned.bind(new Skeleton([new Bone()]));
  skinned.skeleton.computeBoneTexture();
  const releaseSkeleton = retainModelResources(skinned);
  releaseSkeleton();
  await Promise.resolve();
  expect(skinned.skeleton.boneTexture).toBeNull();
});

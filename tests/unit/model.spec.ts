import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Texture,
  Vector3,
} from "three";
import { GLTFLoader } from "three-stdlib";
import {
  frameBounds,
  inspectModel,
  orthographicZoom,
  prepareAnimationBounds,
} from "../../src/components/ui/model-viewer/model-inspection";
import { createViewerCameraStore } from "../../src/components/ui/model-viewer/model-viewer-camera";

test("camera store publishes live views and validates arbitrary view commands", () => {
  const store = createViewerCameraStore();
  const received: string[] = [];
  const unsubscribe = store.subscribe(() => received.push(JSON.stringify(store.getSnapshot())));
  const view = { position: [2, 3, 4], target: [0, 0, 0] } as const;
  expect(store.setView({ position: [...view.position], target: [...view.target] })).toBe(false);
  const commands: Array<{ transition: boolean }> = [];
  store.register((_view, transition) => commands.push({ transition }));
  expect(
    store.setView(
      { position: [...view.position], target: [...view.target] },
      { transition: false },
    ),
  ).toBe(true);
  expect(commands).toEqual([{ transition: false }]);
  expect(store.setView({ position: [0, 0, 0], target: [0, 0, 0] })).toBe(false);
  expect(store.setView({ position: [Infinity, 0, 0], target: [0, 0, 0] })).toBe(false);
  store.publish({ position: [...view.position], target: [...view.target] });
  store.publish({ position: [...view.position], target: [...view.target] });
  expect(received).toHaveLength(1);
  store.register(null);
  expect(store.getSnapshot()).toBeNull();
  expect(received).toHaveLength(2);
  unsubscribe();
});

test("framing fits tiny, huge and offset objects at narrow aspect ratios", () => {
  for (const scale of [0.000001, 1, 1e6]) {
    const mesh = new Mesh(new BoxGeometry(2, 4, 6));
    mesh.scale.setScalar(scale);
    mesh.position.set(100 * scale, -20 * scale, 50 * scale);
    const frame = frameBounds(mesh, 0.25);
    expect(frame.center.toArray()).toEqual(mesh.position.toArray());
    expect(frame.near).toBeLessThan(frame.distance - frame.radius);
    expect(frame.far).toBeGreaterThan(frame.distance + frame.radius);
    expect(Math.asin(frame.radius / frame.distance)).toBeLessThan(
      Math.atan(Math.tan((21 * Math.PI) / 180) * 0.25),
    );
  }
});

test("inspection counts shared resources once and preserves hierarchy", () => {
  const root = new Group();
  const material = new MeshStandardMaterial({ map: new Texture() });
  root.add(new Mesh(new BoxGeometry(), material), new Mesh(new BoxGeometry(), material));
  const info = inspectModel(root);
  expect(info.triangles).toBe(24);
  expect(info.materials).toBe(1);
  expect(info.textures).toBe(1);
  expect(info.nodes.filter((node) => node.mesh)).toHaveLength(2);
  expect(new Set(info.nodes.map((node) => node.id)).size).toBe(3);
});

test("orthographic framing ignores depth end-on and fits rotated bounds at every scale", () => {
  for (const scale of [1e-6, 1, 1e6]) {
    const shaft = new Mesh(new BoxGeometry(10 * scale, 10 * scale, 200 * scale));
    shaft.position.set(30 * scale, -10 * scale, 50 * scale);
    const { box, center, distance } = frameBounds(shaft, 2);
    for (const direction of [new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(1, 1, 1)]) {
      const camera = new OrthographicCamera(-400, 400, 200, -200, 1e-10, distance * 10);
      camera.zoom = orthographicZoom(box, camera, direction);
      camera.position.copy(center).addScaledVector(direction.clone().normalize(), distance);
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      let extent = 0;
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const point = new Vector3(x, y, z).project(camera);
            extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
          }
      expect(extent).toBeCloseTo(1 / 1.15, 5);
      if (direction.z === 1 && direction.x === 0)
        expect(camera.zoom * scale).toBeCloseTo(400 / (10 * 1.15), 5);
    }
  }
});

test("real skinned fixture retains its skeleton and a finite animation envelope", async () => {
  const bytes = await readFile("public/models/robot-expressive.glb");
  const model = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const before: string[] = [];
  model.scene.traverse((object) => before.push(object.uuid));
  prepareAnimationBounds(model.scene, model.animations);
  const after: string[] = [];
  model.scene.traverse((object) => after.push(object.uuid));
  expect(after).toEqual(before);
  expect(model.animations.length).toBeGreaterThan(1);
  const bounds = frameBounds(model.scene, 1);
  expect(bounds.radius).toBeGreaterThan(3);
  expect(bounds.radius).toBeLessThan(10);
});

test("selection helpers do not change the inspected hierarchy or mesh counts", () => {
  const root = new Group();
  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  mesh.name = "body_panel";
  root.add(mesh);
  const before = inspectModel(root);
  const helper = new Group();
  helper.userData.viewerHelper = true;
  helper.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
  mesh.add(helper);
  expect(inspectModel(root)).toEqual(before);
});

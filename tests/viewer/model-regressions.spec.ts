import { expect, ready, test } from "../fixtures/browser";

test("camera presets survive delayed loading and imperative controls wait for the model", async ({
  page,
}) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/delayed-camera.glb", async (route) => {
    await blocked;
    await route.fulfill({ path: "public/models/robot-expressive.glb" });
  });
  try {
    await ready(page);
    await page.evaluate(`(async () => {
      const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
      const { ModelViewer, useModelViewer, useModelViewerCamera } = await import('/src/components/ui/model-viewer/index.ts');
      const h = React.createElement;
      const host = document.createElement('div');
      host.id = 'delayed-camera';
      host.style.cssText = 'position:fixed;inset:0;z-index:100;background:white';
      document.body.append(host);
      function Controls() {
        const viewer = useModelViewer();
        const camera = useModelViewerCamera();
        React.useEffect(() => { host.dataset.camera = JSON.stringify(camera); }, [camera]);
        return h('button', { style: { position: 'absolute', bottom: 10, left: 10, zIndex: 30 }, onClick: () => {
          viewer.setCameraPreset('right');
          host.dataset.accepted = String(viewer.setCameraView({ position: [4, 3, 5], target: [0, 0.5, 0] }, { transition: false }));
        } }, 'Request camera');
      }
      ReactDOM.createRoot(host).render(h(ModelViewer, {
        src: '/delayed-camera.glb', height: 400, environment: false, pauseWhenHidden: false,
        viewCube: false, defaultCameraPreset: 'front', toolbar: h(Controls),
      }));
    })()`);
    const host = page.locator("#delayed-camera");
    await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute(
      "data-state",
      "loading",
    );
    await host.getByRole("button", { name: "Request camera" }).click();
    await expect(host).toHaveAttribute("data-accepted", "false");
    await expect(host).toHaveAttribute("data-camera", "null");
    release();
    await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
    await expect
      .poll(async () => {
        const camera = JSON.parse((await host.getAttribute("data-camera")) ?? "null");
        return (
          camera &&
          camera.position[0] > camera.target[0] &&
          Math.abs(camera.position[1] - camera.target[1]) < 0.001 &&
          Math.abs(camera.position[2] - camera.target[2]) < 0.001
        );
      })
      .toBe(true);
    await host.getByRole("button", { name: "Request camera" }).click();
    await expect(host).toHaveAttribute("data-accepted", "true");
    await expect
      .poll(async () =>
        JSON.parse((await host.getAttribute("data-camera")) ?? "null")?.position.map((n: number) =>
          Number(n.toFixed(2)),
        ),
      )
      .toEqual([4, 3, 5]);
  } finally {
    release();
  }
});

test("generic multi-root models retain geometry, fit end-on, and keep materials on selection", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM, THREE, GLTFExporter } = await import('/tests/fixtures/viewer-runtime.ts');
    const { ModelViewer, useModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const scene = new THREE.Scene();
    for (const z of [-50, 50]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 100), new THREE.MeshStandardMaterial({ color: 'red' }));
      mesh.position.z = z;
      scene.add(mesh);
    }
    const bytes = await new GLTFExporter().parseAsync(scene, { binary: true });
    const src = URL.createObjectURL(new Blob([bytes]));
    const host = document.createElement('div');
    host.id = 'generic-model';
    host.style.cssText = 'position:fixed;inset:0;z-index:100;background:white';
    document.body.append(host);
    const h = React.createElement;
    function Controls() {
      const viewer = useModelViewer();
      return h('button', { style: { position: 'absolute', bottom: 10, left: 10, zIndex: 30 }, onClick: () => viewer.setSelectedMesh(viewer.inspection.nodes.find(n => n.mesh).id) }, 'Select mesh');
    }
    ReactDOM.createRoot(host).render(h(ModelViewer, { src, height: 400, defaultProjection: 'orthographic',
      defaultCameraPreset: 'front', defaultShading: 'solid', environment: false, viewCube: false,
      pauseWhenHidden: false, toolbar: h(Controls),
      onSelectedMeshChange: id => { host.dataset.selected = id ?? ''; } }));
  })()`);
  const host = page.locator("#generic-model");
  await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  const inspect = () =>
    page.evaluate<{
      meshes: { geometry: string; material: string; type: string; color: string }[];
      extent: number;
    }>(`(async () => {
    const { _roots, THREE } = await import('/tests/fixtures/viewer-runtime.ts');
    const state = [..._roots.values()].map(root => root.store.getState()).find(state => state.gl.domElement.closest('#generic-model'));
    const pane = state.internal.subscribers.find(s => s.priority === 1).store.getState();
    const camera = pane.camera;
    camera.updateMatrixWorld(true);
    const meshes = [];
    let extent = 0;
    pane.scene.traverse(object => {
      if (!object.isMesh || !object.userData.viewerNodeId || object.userData.viewerHelper) return;
      const box = new THREE.Box3().setFromObject(object, true);
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      }
      meshes.push({ geometry: object.geometry.uuid, material: object.material.uuid, type: object.material.type, color: object.material.color.getHexString() });
    });
    return { meshes, extent };
  })()`);
  await expect.poll(async () => (await inspect()).meshes.length).toBe(2);
  const before = await inspect();
  expect(before.extent).toBeCloseTo(1 / 1.15, 2);
  expect(before.meshes.map((mesh: { color: string }) => mesh.color)).toEqual(["a7aaa5", "a7aaa5"]);
  await host.getByRole("button", { name: "Select mesh" }).click();
  await expect(host).toHaveAttribute("data-selected", /./);
  expect((await inspect()).meshes).toEqual(before.meshes);
});

test("ordinary URL models leave the loader cache after the last viewer releases them", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/evicted-model.glb", async (route) => {
    requests++;
    await route.fulfill({ path: "public/models/robot-expressive.glb" });
  });
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
    const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const host = document.createElement('div');
    host.id = 'cache-models';
    host.style.cssText = 'position:fixed;inset:0;z-index:100;background:white';
    document.body.append(host);
    const root = ReactDOM.createRoot(host);
    window.renderCacheModels = count => root.render(React.createElement(React.StrictMode, null,
      Array.from({ length: count }, (_, key) => React.createElement(ModelViewer, {
        key, src: '/evicted-model.glb', height: 250, environment: false, showUi: false,
        pauseWhenHidden: false,
      }))));
    window.renderCacheModels(2);
  })()`);
  const viewers = page.locator('#cache-models [data-slot="model-viewer"]');
  await expect(viewers).toHaveCount(2);
  await expect(viewers.nth(1)).toHaveAttribute("data-state", "ready");
  expect(requests).toBe(1);
  await page.evaluate("window.renderCacheModels(1)");
  await expect(viewers).toHaveCount(1);
  await page.evaluate("window.renderCacheModels(2)");
  await expect(viewers).toHaveCount(2);
  await expect(viewers.nth(1)).toHaveAttribute("data-state", "ready");
  expect(requests).toBe(1);
  await page.evaluate("window.renderCacheModels(0)");
  await expect(viewers).toHaveCount(0);
  await page.evaluate("window.renderCacheModels(1)");
  await expect(viewers).toHaveAttribute("data-state", "ready");
  expect(requests).toBe(2);
});

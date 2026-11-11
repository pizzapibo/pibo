/* ===========================================================
   PIBO — pizza3d.js
   Scroll-driven 3D pizza hero.

   - Renders a photoreal-leaning pizza with Three.js.
   - If /models/pizza.glb exists, it is loaded and used instead
     of the procedural build (see loadFromGLB()). To swap in a
     real scanned/modeled pizza later, just drop the file at
     models/pizza.glb — meshes/groups named "dough", "sauce",
     "cheese", "pepperoni", "vegetables", "toppings" (case
     insensitive) will automatically be picked up as the
     independently animated ingredient layers. Anything not
     named will be treated as the static "dough" base.
   - GSAP ScrollTrigger drives every stage of the animation as
     a scrubbed timeline, so scrolling up exactly reverses it.
=========================================================== */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const INGREDIENT_ORDER = ["dough", "sauce", "cheese", "pepperoni", "vegetables", "toppings"];

/* baseY = resting stack height (assembled pizza)
   explodeY = extra vertical travel added when fully separated */
const INGREDIENT_LAYOUT = {
  dough: { baseY: 0.0, explodeY: -0.15 },
  sauce: { baseY: 0.13, explodeY: 0.6 },
  cheese: { baseY: 0.19, explodeY: 1.25 },
  pepperoni: { baseY: 0.25, explodeY: 1.95 },
  vegetables: { baseY: 0.27, explodeY: 2.55 },
  toppings: { baseY: 0.29, explodeY: 3.05 },
};

class PizzaScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMobile = window.innerWidth < 760;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      36,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0.55, 6.2);
    this.lookAtY = 0.35;
    this.camera.lookAt(0, this.lookAtY, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.6 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.pizzaGroup = new THREE.Group();
    this.scene.add(this.pizzaGroup);

    this.ingredients = {}; // key -> THREE.Group

    this._setupLights();
    this._setupGround();
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);
    this._onResize();
  }

  _setupLights() {
    // soft key light — warm, from front/upper-right (oven glow feel)
    const key = new THREE.DirectionalLight(0xfff2df, 2.4);
    key.position.set(3.2, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 15;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.002;
    this.scene.add(key);

    // rim light — cool, from behind, to separate the pizza from the backdrop
    const rim = new THREE.DirectionalLight(0xbfd7ff, 1.4);
    rim.position.set(-3, 2.6, -4.5);
    this.scene.add(rim);

    // soft fill / ambient
    const hemi = new THREE.HemisphereLight(0xfff7ec, 0xffe0b8, 0.65);
    this.scene.add(hemi);

    const amb = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(amb);
  }

  _setupGround() {
    const geo = new THREE.CircleGeometry(6, 64);
    const mat = new THREE.ShadowMaterial({ opacity: 0.16 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.14;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  async load() {
    const loaded = await this._loadFromGLB().catch(() => null);
    if (loaded) {
      this.pizzaGroup.add(loaded);
    } else {
      this._buildProcedural();
    }
    this._collectIngredients();
    this._layoutIngredients();
  }

  /* Attempts to load a real model at models/pizza.glb. Silently
     falls back to the procedural pizza if it isn't there yet. */
  async _loadFromGLB() {
    const url = "models/pizza.glb";
    const head = await fetch(url, { method: "HEAD" }).catch(() => null);
    if (!head || !head.ok) return null;

    const draco = new DRACOLoader();
    draco.setDecoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    const gltf = await loader.loadAsync(url);
    const root = gltf.scene;
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return root;
  }

  /* High-quality procedural stand-in pizza, built from real
     ingredient layers so the exact same rig/animation works
     once a real GLB is dropped in. */
  _buildProcedural() {
    const segs = this.isMobile ? 40 : 72;

    // ---- dough ----
    const dough = new THREE.Group();
    dough.name = "dough";
    const doughMat = new THREE.MeshStandardMaterial({
      color: 0xe4ac66,
      roughness: 0.92,
      metalness: 0,
    });
    const doughBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.62, 0.22, segs, 2),
      doughMat
    );
    doughBase.castShadow = true;
    doughBase.receiveShadow = true;
    dough.add(doughBase);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0xc9863f,
      roughness: 0.85,
    });
    const crust = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.14, 16, segs), crustMat);
    crust.rotation.x = Math.PI / 2;
    crust.position.y = 0.1;
    crust.castShadow = true;
    dough.add(crust);
    this.pizzaGroup.add(dough);

    // ---- sauce ----
    const sauce = new THREE.Group();
    sauce.name = "sauce";
    const sauceMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.36, 1.36, 0.05, segs),
      new THREE.MeshStandardMaterial({ color: 0xb43420, roughness: 0.55, metalness: 0.05 })
    );
    sauceMesh.castShadow = true;
    sauce.add(sauceMesh);
    this.pizzaGroup.add(sauce);

    // ---- cheese (irregular melted top) ----
    const cheese = new THREE.Group();
    cheese.name = "cheese";
    const cheeseGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.1, segs, 4);
    const pos = cheeseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0.03) {
        pos.setY(i, y + (Math.random() * 0.06 - 0.02));
      }
    }
    cheeseGeo.computeVertexNormals();
    const cheeseMesh = new THREE.Mesh(
      cheeseGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf6dd7f,
        roughness: 0.38,
        metalness: 0.05,
      })
    );
    cheeseMesh.castShadow = true;
    cheese.add(cheeseMesh);
    this.pizzaGroup.add(cheese);

    // ---- pepperoni ----
    const pepperoni = new THREE.Group();
    pepperoni.name = "pepperoni";
    const pepMat = new THREE.MeshStandardMaterial({ color: 0x9c2a1c, roughness: 0.55 });
    const pepGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.035, 20);
    const pepRings = [
      { r: 0.55, count: 6 },
      { r: 1.02, count: 9 },
    ];
    pepRings.forEach(({ r, count }) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
        const m = new THREE.Mesh(pepGeo, pepMat);
        m.position.set(Math.cos(a) * r, 0.02 + Math.random() * 0.01, Math.sin(a) * r);
        m.rotation.y = Math.random() * Math.PI;
        m.castShadow = true;
        pepperoni.add(m);
      }
    });
    this.pizzaGroup.add(pepperoni);

    // ---- vegetables (pepper strips) ----
    const vegetables = new THREE.Group();
    vegetables.name = "vegetables";
    const vegMat = new THREE.MeshStandardMaterial({ color: 0x4c8c3c, roughness: 0.6 });
    const vegGeo = new THREE.BoxGeometry(0.28, 0.03, 0.07);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.95;
      const m = new THREE.Mesh(vegGeo, vegMat);
      m.position.set(Math.cos(a) * r, 0.035, Math.sin(a) * r);
      m.rotation.y = Math.random() * Math.PI;
      m.castShadow = true;
      vegetables.add(m);
    }
    this.pizzaGroup.add(vegetables);

    // ---- toppings (olives + basil) ----
    const toppings = new THREE.Group();
    toppings.name = "toppings";
    const oliveMat = new THREE.MeshStandardMaterial({ color: 0x161311, roughness: 0.35 });
    const oliveGeo = new THREE.SphereGeometry(0.06, 12, 12);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.05;
      const m = new THREE.Mesh(oliveGeo, oliveMat);
      m.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
      m.castShadow = true;
      toppings.add(m);
    }
    const basilMat = new THREE.MeshStandardMaterial({ color: 0x2f6e34, roughness: 0.5, side: THREE.DoubleSide });
    const basilGeo = new THREE.CircleGeometry(0.09, 8);
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.25 + Math.random() * 1.0;
      const m = new THREE.Mesh(basilGeo, basilMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(Math.cos(a) * r, 0.045, Math.sin(a) * r);
      m.castShadow = true;
      toppings.add(m);
    }
    this.pizzaGroup.add(toppings);
  }

  /* Finds ingredient groups by name (works for both the
     procedural build and a loaded GLB), falling back to
     treating unnamed meshes as part of the dough. */
  _collectIngredients() {
    INGREDIENT_ORDER.forEach((key) => {
      let found = null;
      this.pizzaGroup.traverse((obj) => {
        if (!found && obj.name && obj.name.toLowerCase() === key) found = obj;
      });
      this.ingredients[key] = found;
    });
    if (!this.ingredients.dough) this.ingredients.dough = this.pizzaGroup;
  }

  _layoutIngredients() {
    INGREDIENT_ORDER.forEach((key) => {
      const group = this.ingredients[key];
      const layout = INGREDIENT_LAYOUT[key];
      if (!group || !layout) return;
      group.userData.baseY = group === this.pizzaGroup ? 0 : layout.baseY;
      group.userData.explodeY = layout.explodeY;
      group.position.y = group.userData.baseY;
    });
  }

  _onResize() {
    this.isMobile = window.innerWidth < 760;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  render() {
    this.camera.lookAt(0, this.lookAtY, 0);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener("resize", this._onResize);
  }
}

/* ---------- boot ---------- */
(async function initPizzaJourney() {
  const canvas = document.getElementById("pizza-canvas");
  const journeySection = document.getElementById("pizza-journey");
  const stage = document.getElementById("pizza-stage");
  if (!canvas || !journeySection || !stage || typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  const pizza = new PizzaScene(canvas);
  await pizza.load();

  // continuous render loop — keeps things smooth independent of scroll events
  let running = true;
  function loop() {
    if (!running) return;
    pizza.render();
    requestAnimationFrame(loop);
  }
  loop();

  // pause rendering when the section is far off-screen (perf)
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        running = e.isIntersecting;
        if (running) loop();
      });
    },
    { rootMargin: "200px 0px 200px 0px" }
  );
  io.observe(journeySection);

  const g = pizza.pizzaGroup;
  const cam = pizza.camera;
  const ing = pizza.ingredients;

  const TOTAL = 10; // arbitrary timeline "duration" units — scrub maps this to scroll progress 1:1

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: {
      trigger: journeySection,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      pin: stage,
      anticipatePin: 1,
    },
  });

  // ---- hero copy fades as scroll begins ----
  tl.to(".pz-hero", { opacity: 0, y: -50, duration: 0.6, ease: "power1.out" }, 0);
  tl.to(".pz-scroll-cue", { opacity: 0, duration: 0.3 }, 0);

  // ---- pizza starts turning + camera creeps in ----
  tl.to(g.rotation, { y: Math.PI * 0.35, duration: 3.2, ease: "sine.inOut" }, 0.3);
  tl.to(cam.position, { z: 4.35, y: 0.75, duration: 1.6 }, 0.3);
  tl.to(pizza, { lookAtY: 0.9, duration: 1.6 }, 0.3);

  // ---- ingredient separation, cascading up the stack ----
  const explodeWindows = {
    dough: [1.0, 2.0],
    sauce: [1.6, 3.0],
    cheese: [2.6, 4.2],
    pepperoni: [3.8, 5.6],
    vegetables: [5.0, 6.8],
    toppings: [5.6, 7.4],
  };
  INGREDIENT_ORDER.forEach((key) => {
    const group = ing[key];
    if (!group || group === g) return;
    const [start, end] = explodeWindows[key];
    tl.to(
      group.position,
      { y: group.userData.baseY + group.userData.explodeY, duration: end - start, ease: "power2.out" },
      start
    );
    // gentle spin on each layer as it floats up
    tl.to(group.rotation, { y: (Math.random() - 0.5) * 1.2, duration: end - start }, start);
  });

  // ---- camera keeps a slow cinematic orbit while ingredients float ----
  const orbit = { a: 0 };
  tl.to(
    orbit,
    {
      a: 0.9,
      duration: 6,
      ease: "sine.inOut",
      onUpdate: () => {
        cam.position.x = Math.sin(orbit.a) * 1.4;
        cam.position.z = 4.35 - Math.sin(orbit.a * 0.6) * 0.4;
      },
    },
    1.2
  );
  tl.to(cam.position, { y: 1.7, duration: 5.5 }, 1.6);
  tl.to(pizza, { lookAtY: 1.5, duration: 5.5 }, 1.6);

  // ---- ingredient text labels: fade in during their own window, out after ----
  INGREDIENT_ORDER.forEach((key) => {
    const label = document.querySelector(`.pz-ing[data-ing="${key}"]`);
    if (!label || !explodeWindows[key]) return;
    const [start, end] = explodeWindows[key];
    tl.fromTo(
      label,
      { opacity: 0, y: 26, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, ease: "power2.out" },
      start
    );
    tl.to(label, { opacity: 0, y: -18, filter: "blur(4px)", duration: 0.5, ease: "power1.in" }, end - 0.4);
  });

  // ---- reassembly / transition into the menu ----
  tl.to(g.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1.1, ease: "power2.in" }, 8.4);
  tl.to(g.position, { y: -0.6, duration: 1.1, ease: "power2.in" }, 8.4);
  tl.to("#pizza-canvas", { opacity: 0, duration: 0.9 }, 8.7);
  tl.to(".pizza-stage-veil", { opacity: 1, duration: 1 }, 8.5);
  tl.fromTo(".pz-outro", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1 }, 8.8);
})();

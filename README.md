# Orbital — STPM Chemistry Topic 3

Premium React Three Fiber / Three.js learning flow: Atomic Orbitals → Hybridisation → Orbital Overlap → Bond Formation → Molecular Geometry.

Run `pnpm install`, then `pnpm dev`. Build with `pnpm build`; verify scientific and interaction invariants with `pnpm test`.

Open `orbital.html` for the standalone browser version. It contains the production JavaScript, CSS, 3D scenes and generated sounds. No runtime installation is required. Google Fonts is optional, with system fonts offline. WebGL must be available. Recreate the HTML with `pnpm export:html` or `node scripts/export-html.mjs` after installing dependencies.

## Atomic Orbitals

The eleven selections are 1s / 2s / 3s, 2px / 2py / 2pz and all five 3d orbitals. Each shape is built from 26,000 dense probability samples, visible at normal distance and throughout zoom. There are no orbital surfaces, outlines, nuclei or nuclear zoom stages in this module. Amber and teal encode opposite wavefunction phases, not charge. Sample positions are fixed; only their soft intensity shimmers. Shapes never breathe or scale cyclically. Selection transitions crossfade smoothly over 1.25 seconds.

One scientific coordinate frame puts z upright. dz² has two vertical z lobes and an equatorial ring in xy; both the cloud and labelled axes share this frame. All angular and radial nodes are preserved by the hydrogen-like probability kernel. A qualitative envelope weights the distribution toward the familiar orbital shapes, with a faint short tail. Samples are probability-density samples, not individual electrons or trajectories. This is an educational representation, not a numerical many-electron quantum calculation. Display dimensions are adjusted for clarity; the intensity shimmer does not imply a time-varying stationary-state probability density.

Drag, scroll or pinch to inspect. Overview, Closer and the zoom slider smoothly dolly while preserving the viewing direction. Reset camera restores the recommended view. Labels, Axes, radial density cutaways for 2s/3s, highlight selection and Motion remain available. Cutaways are off by default.

## Hybridisation

Only one s and one, two or three p orbitals enter sp, sp² and sp³. There are no molecular examples, hydrogen partners, nuclei or sigma bonds in this section. Source orbitals use the established atomic source geometry.

The independent 16-second teaching timeline holds the source orbitals in a clean, centred row for three seconds, moves them inward, pauses before mixing, then deforms and reorients their geometry over six seconds. Four seconds remain to inspect the final equivalent orbitals: linear 180°, trigonal planar 120°, tetrahedral 109.5°. These exact directions are shared with the separate Bond Formation section. The morph represents linear combinations of wavefunctions; it is not a literal reaction or excitation. Replay, next steps, seeking and speed operate on this hybrid-only timeline.

## Bond Formation

The separate Bond Formation module retains its existing molecular examples, sequential hydrogen approach, whoosh/contact/energy sounds, compression, orbital overlap, density build-up, sigma bonds and final geometry reveal. Each partner accelerates and brakes toward contact, holds briefly, then overlaps. Increased density between nuclei precedes the bond. The molecule rotates slowly as a rigid structure and holds its final geometry.

Camera orbit and scroll/pinch zoom stay enabled during both animation modules. Input immediately yields cinematic guidance without pausing the chemistry. The user's angle survives release, pause/resume, next steps, timeline navigation, replay and hybrid selection. Only Reset View explicitly restores the teaching angle through damping. In Bond Formation, a necessary final pullback preserves the chosen direction and waits for a quiet interval. Contact impulses remain subtle. Playback pauses when the browser tab is hidden.

Sound uses the native Web Audio API. The original noise and oscillator sources, filters and pitch sweeps remain. Separate whoosh, impact and energy GainNodes feed a master GainNode and DynamicsCompressorNode. Collision is strongest; bond formation is medium-high; whoosh builds during approach. Sound Volume ramps master gain without clicks. Sound On/Off is separate and gesture-activated. Hybridisation uses movement and settling cues without bond-contact effects.

Tests cover all eleven dense distributions at production sample count, angular/radial nodes, phases and tails, z-up dz² orientation, centred source rows, paced hybrid-only holds, exact final directions and angles, preserved bond event order, camera ownership and framing, and native audio gain routing. Production bundling checks compiler status and output size.

References: [Atomic orbital theory — OpenStax](https://openstax.org/books/chemistry-2e/pages/6-3-development-of-quantum-theory), [Hybrid atomic orbitals — LibreTexts](https://chem.libretexts.org/Bookshelves/General_Chemistry/Map%3A_Chemistry_-_Atoms_First_%28OpenSTAX%29/05%3A_Advanced_Theories_of_Covalent_Bonding/5.2%3A_Hybrid_Atomic_Orbitals).

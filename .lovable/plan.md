

## Plan: PRIME OS Demo Video (Remotion)

A 20-second cinematic demo video showcasing PRIME OS — rendered as MP4 via Remotion CLI.

### Creative Direction

**Vibe**: Dark cyberpunk terminal aesthetic — like a sci-fi OS booting up and revealing its power.
**Emotional arc**: Mystery → Power → Awe → Invitation
**Camera style**: Zooms, parallax layers, dramatic reveals

**Color palette** (from the app's actual design tokens):
- Background: `#0a0d12` (dark navy-black)
- Primary/Cyan: `#00ffff` (cyan glow)
- Violet: `#7c3aed`
- Amber: `#e6a817`
- Green: `#00e68a`
- Text: `#ccfff5` (light cyan)

**Typography**: Orbitron (display/headers) + JetBrains Mono (terminal text)

**Motion system**:
- Enter: clip-path reveal + spring scale
- Exit: fade + slide out
- Transitions: wipe and fade between scenes
- Accent: glow pulse, typing effects

**Visual motifs**: Grid lines, glowing borders, terminal-style text, geometric shapes

### Scenes (5 scenes, ~20 seconds at 30fps = 600 frames)

1. **Boot Sequence** (frames 0–150, 5s) — Dark screen, terminal lines appear one by one mimicking the real `BootSequence.tsx` text. "PRIME OS v1.0.0", "Initializing Qutrit Kernel...", etc. Progress bar fills. PRIME OS logo fades in large.

2. **Desktop Reveal** (frames 130–270, ~4.5s) — Simulated desktop with taskbar, window frames, and floating app icons appearing with staggered springs. Grid background with subtle parallax.

3. **App Showcase** (frames 250–400, ~5s) — Quick cuts of simulated app windows: Terminal, Browser, ROKCAT AI Chat, Data Center — each sliding in with a wipe transition. App names typed out.

4. **Feature Highlights** (frames 380–510, ~4.5s) — Three key stats/features animate in: "50+ Apps", "AI Integration", "Cloud Backend" with counter animations and icon accents.

5. **Closing** (frames 490–600, ~3.5s) — PRIME OS logo large center, tagline "Geometric Computing Interface", URL "os.rlgix.com" fades in below. Subtle breathing glow.

### Technical Steps

1. Scaffold Remotion project in `/tmp/prime-video/`
2. Install deps: remotion, @remotion/cli, @remotion/transitions, @remotion/google-fonts (Orbitron, JetBrains Mono)
3. Fix compositor binary (musl → gnu)
4. Copy `social-share.jpg` as a potential asset
5. Build 5 scene components + persistent background layer
6. Wire with `TransitionSeries` + fade/wipe transitions
7. Render via programmatic script to `/mnt/documents/prime-os-demo.mp4`
8. Spot-check key frames during development

### Output
- 1920×1080, 30fps, ~20 seconds
- H.264 MP4 at `/mnt/documents/prime-os-demo.mp4`


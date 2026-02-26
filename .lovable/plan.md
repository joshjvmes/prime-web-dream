

# ROKCAT AI Face + ElevenLabs TTS Integration

## Overview

Add two major features to PRIME OS:
1. **ROKCAT 3D Wireframe Face** -- A Three.js-rendered geometric cat face (from the uploaded HTML) that lives as a new OS app and can also appear as a floating assistant overlay
2. **ElevenLabs Text-to-Speech** -- Connect ElevenLabs via the connector system, create an edge function for TTS, and wire it into the ROKCAT face so the jaw animates while speaking

The ROKCAT face will integrate with the existing Hyper AI chat -- when Hyper responds, ROKCAT speaks the response aloud with jaw animation synced to audio playback.

---

## 1. ElevenLabs Connection Setup

Use the ElevenLabs connector (connector_id: `elevenlabs`) to get the API key into the project. This provides `ELEVENLABS_API_KEY` as a secret for edge functions.

## 2. Edge Function: `elevenlabs-tts`

Create `supabase/functions/elevenlabs-tts/index.ts`:
- Accepts `{ text, voiceId? }` POST body
- Calls ElevenLabs TTS API (`eleven_turbo_v2_5` model for low latency)
- Returns raw audio/mpeg binary
- Uses CORS headers from shared module
- Default voice: "Brian" (`nPczCjzI2devNBz1zQrb`) -- deep, slightly robotic feel fitting ROKCAT

## 3. ROKCAT Face Component

Create `src/components/os/RokCatFace.tsx`:
- Port the Three.js wireframe cat geometry from `rokcat.html` into a React component using raw Three.js (no additional deps needed -- Three.js patterns via `useRef` + `useEffect`)
- Neon cyan wireframe cat head with glass facets, node particles, and jaw animation
- Mouse parallax for head tracking
- Idle breathing animation
- Exposes methods: `speak(audioUrl)` to trigger jaw animation synced to audio playback
- Audio playback uses `Web Audio API` `AnalyserNode` for real-time volume data driving jaw movement (instead of simulated sine waves from the original)

## 4. ROKCAT App Window

Create `src/components/os/RokCatApp.tsx`:
- Full app window containing the 3D face + chat input at bottom
- Text input sends to `hyper-chat` edge function for AI response
- AI response text is sent to `elevenlabs-tts` edge function
- Returned audio plays while jaw animates
- Shows transcript of conversation
- "Transmit" button + Enter key to send

Register as app type `'rokcat'` in the OS type system and Desktop.

## 5. Integration Points

**Desktop.tsx**: Add `rokcat` to app registry, import `RokCatApp`

**types/os.ts**: Add `'rokcat'` to the `AppType` union

**Taskbar.tsx**: Add ROKCAT to the app list with a Cat/Bot icon

**DesktopIcons.tsx**: Add ROKCAT icon under AI & Compute category

**HypersphereApp.tsx** (optional enhancement): Add a "Speak" button next to AI responses that sends the text to TTS and opens a mini ROKCAT face overlay

---

## Technical Details

### Three.js Integration Pattern

The face geometry is defined as typed node/connection/face arrays (ported from the HTML). A React component manages the Three.js lifecycle:

```text
useEffect(() => {
  // Create scene, camera, renderer
  // Build geometry from node definitions
  // Start animation loop
  return () => { cleanup renderer }
}, [])
```

Jaw animation is driven by an `AnalyserNode` attached to the audio element, reading `getByteFrequencyData()` per frame to get real volume levels.

### Edge Function Structure

```text
POST /functions/v1/elevenlabs-tts
Body: { text: string, voiceId?: string }
Response: audio/mpeg binary stream
```

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/elevenlabs-tts/index.ts` | TTS edge function |
| `src/components/os/RokCatFace.tsx` | Three.js 3D wireframe cat face component |
| `src/components/os/RokCatApp.tsx` | Full ROKCAT app with chat + face + TTS |

### Files to Modify

| File | Change |
|------|---------|
| `src/types/os.ts` | Add `'rokcat'` to AppType |
| `src/components/os/Desktop.tsx` | Import RokCatApp, add to app registry |
| `src/components/os/Taskbar.tsx` | Add ROKCAT to allApps list |
| `src/components/os/DesktopIcons.tsx` | Add ROKCAT icon |

### Execution Order

1. Connect ElevenLabs connector (user approval required)
2. Create `elevenlabs-tts` edge function
3. Create `RokCatFace.tsx` (Three.js face component)
4. Create `RokCatApp.tsx` (app wrapper with chat + TTS)
5. Update `types/os.ts`, `Desktop.tsx`, `Taskbar.tsx`, `DesktopIcons.tsx`

### Notes from Friend's Feedback

The uploaded ideas document highlights key improvements PRIME OS already addresses well:
- Hybrid kernel architecture (local + cloud) -- already implemented
- Agent orchestration with BotLab + EventBus
- Session replay/observability via audit logs
- MCP integration in bot system

The ROKCAT face adds the "personality layer" that makes the AI assistant feel tangible and alive -- a visual anchor for voice interaction.


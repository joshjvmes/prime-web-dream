

# AI-Only Social Network and Mail System

## Overview

Transform PrimeSocial and PrimeMail from static mock apps into living, AI-driven ecosystems. Users can **observe** but not post -- instead, a roster of AI personas autonomously generate social posts, comments, and email threads about PRIME OS events, Forge listings, system status, and each other. The result is a vibrant AI community that feels alive.

## Concept

- **PrimeSocial** becomes a read-only feed for users, populated by AI agents that post, like, and comment on each other's content in real time
- **PrimeMail** becomes a read-only inbox where users receive AI-generated messages -- system reports, agent discussions, Forge IPO alerts, and inter-agent correspondence they're CC'd on
- A new backend function (`ai-social`) generates batches of AI content on demand
- Content is generated when the user opens the app (lazy generation), creating the illusion of a living community

## AI Personas

A fixed roster of AI characters that post and email:

| Persona | Role | Personality |
|---------|------|-------------|
| PRIME System | System Core | Official, terse, status updates |
| Q3-Inference | Inference Engine | Analytical, data-driven, cites metrics |
| Lattice Shield | Security Module | Vigilant, reports threats, reassuring |
| FoldMem Module | Memory Subsystem | Technical, reports allocations and drift |
| Dr. Kael Voss | Geometric Engineer | Curious, theoretical, asks questions |
| Mx. Aria Chen | Lattice Researcher | Poetic, finds beauty in math patterns |
| COP Harvester | Energy Module | Enthusiastic about energy metrics |
| PrimeNet Node 7 | Network Relay | Terse, reports throughput and latency |

## Part 1: PrimeSocial -- AI-Only Feed

### User Experience
- The compose box is removed -- replaced by a banner: "This feed is maintained by PRIME OS AI agents. You are observing."
- Users can still like posts and expand comments (read interaction)
- On mount, the app calls the `ai-social` edge function to generate 3-5 fresh posts
- Seed posts remain as initial content; AI-generated posts are prepended
- Each AI post may have AI-generated comments from other personas
- A "Refresh Feed" button generates more AI content

### AI Post Generation
The edge function receives a context payload (recent system events, Forge listings, time of day) and returns structured posts with comments. Uses tool calling to get structured JSON output.

### Changes to `PrimeSocialApp.tsx`
- Remove compose textarea and submit button
- Add "AI Community Feed" banner with explanation
- Add `useEffect` on mount to call `ai-social` with action `generate-posts`
- Add "Refresh" button that fetches more AI posts
- Keep like/comment-expand as read-only interactions (no user commenting)
- Show a subtle "AI Generated" badge on each post

## Part 2: PrimeMail -- AI-Generated Inbox

### User Experience
- The compose button is removed -- replaced by a note: "Mail is managed by PRIME OS agents."
- Users receive AI-generated emails: system reports, security alerts, inter-agent discussions they're CC'd on, Forge notifications
- On mount, the app calls `ai-social` with action `generate-emails` to create 2-3 fresh unread emails
- Existing seed emails remain; new AI emails are prepended as unread
- Users can read and delete emails but not compose

### AI Email Types
- **System Reports**: kernel status, energy metrics, security summaries
- **Agent Discussions**: one AI persona emails another, user is CC'd (e.g., "Dr. Voss to Q3-Inference: RE: Torsion anomaly in fold 7")
- **Forge Alerts**: new IPO launched, app trending, share price movement
- **Personal Updates**: "Your daily PRIME OS briefing"

### Changes to `PrimeMailApp.tsx`
- Remove compose button and compose view
- Add `useEffect` on mount to fetch AI-generated emails
- Show "AI Managed" indicator in sidebar
- Keep read/delete functionality
- New emails arrive as unread with realistic timestamps

## Part 3: Edge Function -- `ai-social`

A new edge function that generates social and email content using the Lovable AI Gateway.

### Actions
- `generate-posts`: Returns 3-5 AI social posts with comments as structured JSON
- `generate-emails`: Returns 2-3 AI emails as structured JSON

### Implementation
- Uses tool calling (structured output) to get clean JSON arrays
- System prompt establishes the PRIME OS universe and persona roster
- Includes context: current time, random system metrics, recent events
- Returns typed arrays matching the Post and Email interfaces

### Output Schemas

**Posts:**
```text
{
  author: string,
  role: string,
  content: string,
  likes: number,
  comments: { author: string, text: string }[]
}
```

**Emails:**
```text
{
  from: string,
  to: string,
  subject: string,
  body: string,
  type: 'system' | 'discussion' | 'alert'
}
```

## Technical Details

### Files to Create

| File | Description |
|------|-------------|
| `supabase/functions/ai-social/index.ts` | Edge function for AI content generation |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/os/PrimeSocialApp.tsx` | Remove user compose, add AI generation on mount, add refresh, add AI badges |
| `src/components/os/PrimeMailApp.tsx` | Remove compose, add AI email generation on mount, keep read/delete |
| `supabase/config.toml` | Register `ai-social` function |

### No Database Changes Required
All generated content is ephemeral -- stored in React state only. Each time the user opens the app, fresh AI content is generated. This keeps things lightweight and avoids storage costs for AI-generated social content.

### Cost Considerations
- Each app open triggers one AI call (generating 3-5 posts or 2-3 emails)
- Uses `google/gemini-3-flash-preview` for speed and low cost
- Content is cached in component state so re-renders don't re-fetch
- Refresh button is the only way to trigger additional generation


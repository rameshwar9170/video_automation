# AI Autonomous YouTube Shorts Platform --- Frontend Working Flow

## 1. Purpose

This document defines what the user sees and what each frontend screen
does.

The frontend is not responsible for AI generation, video rendering or
YouTube API calls directly.

Frontend responsibility:

-   Show configuration.
-   Start/stop autonomous mode.
-   Show current job status.
-   Show research/topic selection.
-   Show generated videos.
-   Show logs/progress.
-   Show YouTube publishing result.
-   Show settings.
-   Show basic analytics later.

Backend responsibility remains separate.

------------------------------------------------------------------------

# 2. Recommended Frontend Stack

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   React Query / TanStack Query
-   Simple component system
-   WebSocket or polling for job status

For V1, polling is acceptable and simpler.

------------------------------------------------------------------------

# 3. Frontend Folder Structure

``` text
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── setup/
│   │   │   └── page.tsx
│   │   ├── videos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── research/
│   │   │   └── page.tsx
│   │   ├── youtube/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   ├── setup/
│   │   ├── videos/
│   │   ├── research/
│   │   ├── youtube/
│   │   └── common/
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── video.api.ts
│   │   ├── settings.api.ts
│   │   ├── research.api.ts
│   │   └── youtube.api.ts
│   │
│   ├── hooks/
│   │   ├── useVideoStatus.ts
│   │   ├── useSettings.ts
│   │   └── useVideos.ts
│   │
│   └── types/
│       └── index.ts
│
├── public/
└── package.json
```

------------------------------------------------------------------------

# 4. Main User Journey

The user should NOT have to enter a topic every time.

First-time setup:

``` text
Open App
   ↓
Connect YouTube
   ↓
Set Channel/Niche
   ↓
Set Language
   ↓
Set Video Frequency
   ↓
Set Style
   ↓
Enable Auto Publish
   ↓
Save
   ↓
Dashboard
```

After setup:

``` text
AI works automatically.
```

------------------------------------------------------------------------

# 5. Setup Page

Route:

``` text
/setup
```

UI:

``` text
CHANNEL SETUP

YouTube Channel
[ Connect YouTube ]

Content Niche
[ AI & Technology ]

Language
[ English ]

Region
[ Global ]

Videos Per Day
[ 2 ]

Video Duration
[ 30 ] to [ 45 ] seconds

Video Style
[ Informative ]

Auto Publish
[ ON ]

[ Save Settings ]
```

Important:

The setup page controls the AI's boundaries.

The user does not select individual topics.

------------------------------------------------------------------------

# 6. YouTube Connection UI

Route:

``` text
/youtube
```

Initial state:

``` text
YouTube
──────────────

Status:
Not Connected

[ Connect YouTube ]
```

After OAuth:

``` text
YouTube
──────────────

Connected ✓

Channel:
My Tech Channel

Auto Publish:
ON

[ Disconnect ]
```

The browser handles the OAuth redirect.

The frontend never receives or stores the YouTube client secret or
refresh token.

------------------------------------------------------------------------

# 7. Dashboard

Route:

``` text
/dashboard
```

Main dashboard:

``` text
┌─────────────────────────────────────────────┐
│ AI YOUTUBE AGENT                            │
│                                             │
│ Autonomous Mode       ● ON                 │
│                                             │
│ Next Run: 01:00 AM                          │
├─────────────────────────────────────────────┤
│ TODAY                                       │
│                                             │
│ Videos Published       2                    │
│ Videos Failed          0                    │
│ Topics Researched      37                   │
├─────────────────────────────────────────────┤
│ CURRENT AI ACTIVITY                         │
│                                             │
│ 🔎 Researching topics...                    │
│                                             │
│ Topic candidates: 37                        │
│                                             │
│ [ View Research ]                           │
└─────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 8. Autonomous Mode

The dashboard has:

``` text
AUTONOMOUS MODE
[ ON / OFF ]
```

When ON:

``` text
Scheduler
    ↓
Backend automatically starts
```

When OFF:

``` text
No automatic generation/publishing.
```

Turning it off should stop future scheduled runs. It should not corrupt
a video already being rendered.

------------------------------------------------------------------------

# 9. Live Generation Status

When AI starts a video:

``` text
CREATE VIDEO

✓ Researching topics
✓ Selecting topic
✓ Researching selected topic
✓ Writing script
● Generating scenes
○ Generating voice
○ Generating visuals
○ Rendering video
○ Generating metadata
○ Quality check
○ Publishing
```

This is the most important UI for understanding what the system is
doing.

------------------------------------------------------------------------

# 10. Research Page

Route:

``` text
/research
```

Show:

``` text
TODAY'S AI RESEARCH

Topics Found: 37
Topics Selected: 2

┌──────────────────────────────────────────┐
│ New AI Feature Released                  │
│ Freshness: High                          │
│ Video Potential: High                    │
│ Status: Selected                         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Another Technology Topic                │
│ Freshness: Medium                        │
│ Video Potential: High                    │
│ Status: Rejected                         │
└──────────────────────────────────────────┘
```

The user does not need to approve/reject topics.

This page is primarily for visibility and debugging.

------------------------------------------------------------------------

# 11. Video List

Route:

``` text
/videos
```

Cards:

``` text
┌──────────────────────┐
│      VIDEO           │
│      PREVIEW         │
│                      │
│ Topic title          │
│                      │
│ Status: Published ✓  │
│ YouTube: Open        │
└──────────────────────┘
```

Filters:

``` text
All
Generating
Published
Failed
```

------------------------------------------------------------------------

# 12. Video Detail Page

Route:

``` text
/videos/:id
```

Show:

``` text
VIDEO

[ 9:16 VIDEO PLAYER ]

Topic:
New AI Feature...

Title:
This New AI Feature...

Description:
...

Hashtags:
#AI #Technology #Shorts

Status:
Published ✓

YouTube Video ID:
xxxxxxxx

Created:
07 Oct 2026

[ Open YouTube ]
```

For failed videos:

``` text
Status: Failed

Error:
Voice generation failed

[ Retry ]
```

------------------------------------------------------------------------

# 13. Progress Polling

V1 can use polling.

Frontend:

``` text
GET /api/videos/:id/status
```

Every few seconds:

``` text
Backend:
{
  "status": "RENDERING",
  "progress": 72
}
```

Frontend updates:

``` text
Rendering video
██████████████░░░░ 72%
```

No Redis or WebSocket is required initially.

WebSocket can be added later if real-time updates become necessary.

------------------------------------------------------------------------

# 14. API Service

File:

``` text
src/services/api.ts
```

Central API client.

Example responsibility:

``` text
GET
POST
PUT
DELETE
error handling
authentication handling
```

Specific files:

``` text
video.api.ts
settings.api.ts
research.api.ts
youtube.api.ts
```

------------------------------------------------------------------------

# 15. Frontend Does NOT Do These Things

The browser should NOT:

``` text
❌ Generate the final video
❌ Call FFmpeg
❌ Store API keys
❌ Store YouTube refresh token
❌ Call AI providers directly with secret keys
❌ Upload directly to YouTube using secret credentials
❌ Perform research itself
```

Instead:

``` text
Frontend
   ↓
Backend API
   ↓
AI / FFmpeg / YouTube
```

------------------------------------------------------------------------

# 16. Frontend → Backend Example

User enables autonomous mode.

Frontend:

``` text
POST /api/scheduler/start
```

Backend:

``` text
Save scheduler setting
      ↓
Start scheduled process
```

Frontend response:

``` json
{
  "enabled": true,
  "nextRun": "2026-10-07T01:00:00"
}
```

Dashboard displays:

``` text
Autonomous Mode: ON
Next Run: 01:00 AM
```

------------------------------------------------------------------------

# 17. Automatic Video Flow in UI

At 01:00 AM:

Backend starts.

Frontend does not need to start anything.

Dashboard automatically shows:

``` text
AI ACTIVITY

Researching...
```

Then:

``` text
✓ Research completed
```

Then:

``` text
✓ Topic selected
```

Then:

``` text
✓ Script generated
```

Then:

``` text
✓ Voice generated
```

Then:

``` text
✓ Visuals generated
```

Then:

``` text
● Rendering
```

Then:

``` text
✓ Video ready
```

Then:

``` text
● Publishing to YouTube
```

Then:

``` text
✓ Published
```

------------------------------------------------------------------------

# 18. Final Dashboard Result

``` text
TODAY

2 / 2 VIDEOS PUBLISHED

Video 1
────────────
Topic: ...
Status: Published ✓
YouTube: View

Video 2
────────────
Topic: ...
Status: Published ✓
YouTube: View
```

------------------------------------------------------------------------

# 19. Settings Page

Route:

``` text
/settings
```

Sections:

## Channel

``` text
Channel Name
Niche
Language
Region
```

## Content

``` text
Video duration
Style
Tone
Target audience
```

## Automation

``` text
Videos per day
Schedule
Auto research
Auto publish
```

## AI

``` text
AI provider
Voice provider
Visual provider
```

## System

``` text
Storage
Retry limit
Quality threshold
```

------------------------------------------------------------------------

# 20. Error UI

Do not simply show:

``` text
Error
```

Show:

``` text
VIDEO GENERATION FAILED

Step:
Voice Generation

Reason:
Provider returned an error.

Attempt:
2 / 3

Status:
Automatic retry scheduled

[ View Details ]
```

If all retries fail:

``` text
Generation failed after 3 attempts.

The system will continue with the next scheduled video.
```

The autonomous system should not stop completely because one video
failed.

------------------------------------------------------------------------

# 21. Frontend State Model

Basic video state:

``` text
RESEARCHING
TOPIC_SELECTED
SCRIPTING
ASSET_GENERATION
RENDERING
QUALITY_CHECK
UPLOADING
PUBLISHED
FAILED
```

Frontend uses this state to show the correct UI.

------------------------------------------------------------------------

# 22. Important UX Principle

The platform should feel like an AI employee, not a video editor.

Bad UX:

``` text
Upload image
Choose voice
Write script
Choose music
Choose scenes
Click render
Click upload
```

Good UX:

``` text
AI is working...

Researching current topics ✓
Choosing topic ✓
Writing script ✓
Creating video ✓
Checking quality ✓
Publishing ✓
```

The user mainly monitors the system.

------------------------------------------------------------------------

# 23. V1 Frontend Navigation

``` text
Dashboard
│
├── Research
│
├── Videos
│
├── YouTube
│
└── Settings
```

Keep navigation small.

Do not build analytics-heavy screens in V1.

------------------------------------------------------------------------

# 24. Complete Frontend Flow

``` text
FIRST TIME USER
      ↓
Setup
      ↓
Connect YouTube
      ↓
Configure niche/settings
      ↓
Enable Autonomous Mode
      ↓
Dashboard
      ↓
WAIT
      ↓
Backend starts automatically
      ↓
Frontend shows live status
      ↓
Researching
      ↓
Topic selected
      ↓
Script
      ↓
Voice
      ↓
Visuals
      ↓
Rendering
      ↓
Quality check
      ↓
Publishing
      ↓
Published
      ↓
Video appears in Videos page
```

------------------------------------------------------------------------

# 25. Final Responsibility Split

## Frontend

``` text
UI
Settings
Dashboard
Status
Video preview
Research visibility
YouTube connection UI
Errors
Logs
```

## Backend

``` text
Research
Topic selection
Fact research
Script
Scenes
Voice
Visuals
FFmpeg
Metadata
Quality check
Scheduling
YouTube API
Database
File management
Retries
```

The frontend tells the backend WHAT the system configuration is.

The backend decides HOW the autonomous work happens.

------------------------------------------------------------------------

# 26. Core Principle

The user should configure the system once:

``` text
Niche
Language
Style
Videos/day
Schedule
Auto Publish
```

After that:

``` text
AI RESEARCH
     ↓
AI SELECTS TOPIC
     ↓
AI RESEARCHES
     ↓
AI WRITES
     ↓
AI CREATES
     ↓
AI CHECKS
     ↓
AI PUBLISHES
```

No manual topic selection. No manual script writing. No manual video
editing. No manual metadata writing. No manual YouTube upload for normal
autonomous operation.

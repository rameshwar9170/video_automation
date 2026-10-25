# AI Autonomous YouTube Shorts Platform --- Backend Working Flow

## 1. Purpose

This document defines the complete backend working flow for the MVP.

Goal:

Topic is NOT provided manually for every video.

The backend should:

1.  Research current topics.
2.  Find topics suitable for short videos.
3.  Select the best topic.
4.  Research the selected topic.
5.  Generate the script.
6.  Generate scene instructions.
7.  Generate voice.
8.  Generate visuals.
9.  Render the final 9:16 video.
10. Generate title, description and hashtags.
11. Run quality checks.
12. Upload and publish to YouTube through the YouTube Data API.
13. Save the complete result and YouTube video ID.

The first version should remain simple: one backend application, one
database, FFmpeg and external APIs. Do not introduce Redis, Kafka,
Kubernetes, microservices or complex worker infrastructure until scale
requires it.

------------------------------------------------------------------------

# 2. Recommended Backend Stack

-   Node.js
-   TypeScript
-   Express or NestJS
-   PostgreSQL
-   Prisma ORM
-   FFmpeg
-   REST API
-   YouTube Data API
-   Google OAuth 2.0
-   AI provider API
-   TTS provider API
-   Image/video provider API
-   Local filesystem for development
-   Object storage later for production

------------------------------------------------------------------------

# 3. Backend Folder Structure

``` text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── constants.ts
│   │
│   ├── controllers/
│   │   ├── channel.controller.ts
│   │   ├── settings.controller.ts
│   │   ├── video.controller.ts
│   │   ├── research.controller.ts
│   │   └── youtube.controller.ts
│   │
│   ├── routes/
│   │   ├── channel.routes.ts
│   │   ├── settings.routes.ts
│   │   ├── video.routes.ts
│   │   ├── research.routes.ts
│   │   └── youtube.routes.ts
│   │
│   ├── services/
│   │   ├── research.service.ts
│   │   ├── topic.service.ts
│   │   ├── script.service.ts
│   │   ├── scene.service.ts
│   │   ├── voice.service.ts
│   │   ├── visual.service.ts
│   │   ├── video.service.ts
│   │   ├── metadata.service.ts
│   │   ├── quality.service.ts
│   │   ├── youtube.service.ts
│   │   └── scheduler.service.ts
│   │
│   ├── providers/
│   │   ├── ai.provider.ts
│   │   ├── voice.provider.ts
│   │   ├── image.provider.ts
│   │   └── youtube.provider.ts
│   │
│   ├── utils/
│   │   ├── ffmpeg.ts
│   │   ├── file-manager.ts
│   │   └── logger.ts
│   │
│   ├── database/
│   │   └── prisma.ts
│   │
│   └── server.ts
│
├── prisma/
│   └── schema.prisma
│
├── generated/
│   ├── research/
│   ├── scripts/
│   ├── audio/
│   ├── images/
│   ├── videos/
│   └── thumbnails/
│
├── .env
├── package.json
└── README.md
```

------------------------------------------------------------------------

# 4. Core Backend Modules

## 4.1 Research Service

File:

``` text
src/services/research.service.ts
```

Responsibility:

Find current information from configured sources.

Input:

``` text
channel niche
language
region
content rules
```

Example:

``` text
Niche = AI Technology
Language = English
Region = Global
```

The service collects candidate information from allowed search/news/web
sources.

Output:

``` json
{
  "source": "example source",
  "title": "New AI feature released",
  "url": "source-url",
  "publishedAt": "...",
  "summary": "...",
  "topicSignals": ["AI", "new release", "technology"]
}
```

Important:

Research is for discovery and factual grounding. Do not blindly copy
source content.

------------------------------------------------------------------------

# 5. Topic Selection Flow

File:

``` text
src/services/topic.service.ts
```

Flow:

``` text
Research results
      ↓
Extract candidate topics
      ↓
Remove duplicates
      ↓
Remove previously used topics
      ↓
Check freshness
      ↓
Check information availability
      ↓
Check short-video suitability
      ↓
Check originality/content risk
      ↓
AI evaluates candidates
      ↓
Select topic
```

Example internal topic object:

``` json
{
  "topic": "New AI tool feature",
  "freshness": 90,
  "interest": 85,
  "videoPotential": 92,
  "informationAvailable": 95,
  "originality": 82,
  "risk": 10
}
```

The backend selects the highest-quality suitable candidate.

------------------------------------------------------------------------

# 6. Selected Topic Research

After topic selection, research again specifically for that topic.

``` text
Selected Topic
      ↓
Detailed Research
      ↓
Multiple sources
      ↓
Important facts
      ↓
Source references
      ↓
Fact set
```

Store the research result in the database so the generated script can be
traced back to the research.

------------------------------------------------------------------------

# 7. Script Service

File:

``` text
src/services/script.service.ts
```

Input:

``` text
selected topic
research facts
channel style
language
target duration
```

Output:

``` json
{
  "hook": "...",
  "script": "...",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 5,
      "narration": "...",
      "visualInstruction": "..."
    }
  ]
}
```

The script should be optimized for Shorts:

``` text
Hook
↓
Context
↓
Main information
↓
Interesting point
↓
Ending / CTA
```

The service should not create unsupported facts.

------------------------------------------------------------------------

# 8. Scene Service

File:

``` text
src/services/scene.service.ts
```

Convert script into production instructions.

Example:

``` text
Scene 1
Duration: 4 sec
Narration: ...
Visual: futuristic AI laboratory
Caption: ...

Scene 2
Duration: 6 sec
Narration: ...
Visual: product/interface demonstration
Caption: ...
```

This becomes the blueprint for video generation.

------------------------------------------------------------------------

# 9. Voice Service

File:

``` text
src/services/voice.service.ts
```

Input:

``` text
complete narration
voice configuration
language
```

Output:

``` text
generated/audio/video-123.mp3
```

Store:

``` text
voice provider
voice ID
duration
audio path
```

The service should support provider abstraction so a free/local provider
can later be replaced by a premium provider without changing the rest of
the pipeline.

------------------------------------------------------------------------

# 10. Visual Service

File:

``` text
src/services/visual.service.ts
```

For every scene:

``` text
Scene instruction
      ↓
Generate/find visual
      ↓
Download/store asset
      ↓
Validate asset
      ↓
Save asset path
```

Output:

``` text
generated/images/video-123/
    scene-01.png
    scene-02.png
    scene-03.png
```

The first MVP can use generated images plus motion effects instead of
expensive full AI video generation.

------------------------------------------------------------------------

# 11. Video Rendering Service

File:

``` text
src/services/video.service.ts
```

Uses FFmpeg.

Inputs:

``` text
images/video clips
voice
captions
background music
scene durations
```

Output:

``` text
generated/videos/video-123.mp4
```

Target:

``` text
Aspect ratio: 9:16
Resolution: 1080x1920
Format: MP4
Video codec: H.264
Audio: AAC
```

Rendering flow:

``` text
Scenes
 ↓
Timeline
 ↓
Visual transitions
 ↓
Voice
 ↓
Music
 ↓
Captions
 ↓
Final MP4
```

------------------------------------------------------------------------

# 12. Metadata Service

File:

``` text
src/services/metadata.service.ts
```

Generates:

``` text
Title
Description
Hashtags
Tags
```

Example:

``` json
{
  "title": "This New AI Feature Changes Everything",
  "description": "A quick explanation of...",
  "hashtags": [
    "#AI",
    "#Technology",
    "#Shorts"
  ],
  "tags": [
    "AI",
    "artificial intelligence",
    "technology"
  ]
}
```

Metadata must match the actual video and should not make false claims.

------------------------------------------------------------------------

# 13. Thumbnail Service

For YouTube Shorts, thumbnail strategy can vary, but the platform should
still generate a thumbnail asset when useful.

Flow:

``` text
Video topic
 ↓
Thumbnail prompt
 ↓
Image generation
 ↓
Thumbnail validation
 ↓
Save thumbnail
```

------------------------------------------------------------------------

# 14. Quality Service

File:

``` text
src/services/quality.service.ts
```

This is the final AI/system gate before upload.

Checks:

``` text
Video exists
Video duration
9:16 format
Resolution
Audio exists
Audio level
No empty scenes
Captions exist
Caption timing
Title exists
Description exists
Hashtags exist
Topic is not duplicate
Basic content/policy risk
```

Output:

``` json
{
  "status": "PASS",
  "score": 92,
  "issues": []
}
```

If failed:

``` text
Quality FAIL
      ↓
Identify failed component
      ↓
Regenerate/repair
      ↓
Quality check again
```

Use a maximum retry count to avoid infinite loops.

------------------------------------------------------------------------

# 15. YouTube Service

File:

``` text
src/services/youtube.service.ts
```

Responsibilities:

1.  Google OAuth connection.
2.  Store encrypted refresh token.
3.  Verify connected channel.
4.  Upload video.
5.  Set title.
6.  Set description.
7.  Set tags.
8.  Set privacy status.
9.  Upload thumbnail when supported/appropriate.
10. Save YouTube video ID.

Flow:

``` text
Final MP4
   +
Metadata
   +
OAuth credentials
      ↓
YouTube API
      ↓
Upload
      ↓
YouTube Video ID
      ↓
Save in database
      ↓
Status = PUBLISHED
```

Use resumable upload for reliability.

------------------------------------------------------------------------

# 16. Complete Autonomous Backend Flow

``` text
Scheduler / Manual Start
        ↓
Research Service
        ↓
Collect current topics
        ↓
Topic Service
        ↓
Filter + select best topic
        ↓
Detailed Research
        ↓
Script Service
        ↓
Scene Service
        ↓
Voice Service
        ↓
Visual Service
        ↓
FFmpeg Video Service
        ↓
Metadata Service
        ↓
Quality Service
        ↓
PASS?
   ├── NO → Repair → Quality again
   └── YES
          ↓
YouTube Service
          ↓
Upload
          ↓
Publish
          ↓
Save result
```

------------------------------------------------------------------------

# 17. Video Status

Use a simple status state machine:

``` text
RESEARCHING
    ↓
TOPIC_SELECTED
    ↓
SCRIPT_GENERATING
    ↓
SCRIPT_READY
    ↓
GENERATING_ASSETS
    ↓
RENDERING
    ↓
METADATA_READY
    ↓
QUALITY_CHECK
    ↓
READY_TO_PUBLISH
    ↓
UPLOADING
    ↓
PUBLISHED
```

Error:

``` text
FAILED
```

Store error reason.

------------------------------------------------------------------------

# 18. Database Tables --- MVP

## channel_settings

``` text
id
channel_name
niche
language
region
videos_per_day
preferred_times
style
duration_min
duration_max
auto_publish
created_at
updated_at
```

## topics

``` text
id
topic
status
source_data
score
selected_at
used_at
created_at
```

## research

``` text
id
topic_id
source
url
title
summary
published_at
content
created_at
```

## videos

``` text
id
topic_id
script
video_path
audio_path
thumbnail_path
title
description
hashtags
status
quality_score
youtube_video_id
error_message
created_at
updated_at
```

------------------------------------------------------------------------

# 19. Scheduler

For V1, use a simple scheduled process.

Example:

``` text
01:00 AM
   ↓
Start autonomous video generation
   ↓
Generate video
   ↓
Publish
```

If two videos/day:

``` text
01:00 AM → Video 1
01:00 PM → Video 2
```

Later this can be replaced by a proper queue system.

------------------------------------------------------------------------

# 20. API Endpoints

``` text
GET    /api/health

POST   /api/settings
GET    /api/settings

GET    /api/youtube/connect
GET    /api/youtube/callback
GET    /api/youtube/channel

POST   /api/research/run
GET    /api/topics

POST   /api/videos/generate
GET    /api/videos
GET    /api/videos/:id
GET    /api/videos/:id/status

POST   /api/videos/:id/retry

POST   /api/scheduler/start
POST   /api/scheduler/stop
GET    /api/scheduler/status
```

------------------------------------------------------------------------

# 21. Important Development Rule

Do NOT make the complete pipeline one giant function.

Bad:

``` text
createEverything()
```

Better:

``` text
researchTopic()
selectTopic()
researchSelectedTopic()
generateScript()
createScenes()
generateVoice()
generateVisuals()
renderVideo()
generateMetadata()
qualityCheck()
publishToYouTube()
```

The controller only starts the flow.

The services perform the work.

import axios from 'axios';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const VERIFIED_MOTION_CLIPS: { keywords: string[]; url: string }[] = [
  { keywords: ['phone', 'mobile', 'smartphone', 'scroll', 'screen', 'call'], url: 'https://assets.mixkit.co/videos/46612/46612-720.mp4' },
  { keywords: ['code', 'coding', 'program', 'developer', 'software', 'laptop', 'typing'], url: 'https://assets.mixkit.co/videos/1140/1140-720.mp4' },
  { keywords: ['money', 'cash', 'rich', 'wealth', 'finance', 'debt', 'tax', 'currency'], url: 'https://assets.mixkit.co/videos/47011/47011-720.mp4' },
  { keywords: ['robot', 'ai', 'artificial', 'intelligence', 'future', 'cyborg'], url: 'https://assets.mixkit.co/videos/49042/49042-720.mp4' },
  { keywords: ['city', 'traffic', 'night', 'building', 'street', 'lights'], url: 'https://assets.mixkit.co/videos/4915/4915-720.mp4' },
  { keywords: ['cyberpunk', 'neon', 'matrix', 'tech', 'technology', 'digital'], url: 'https://assets.mixkit.co/videos/30284/30284-720.mp4' },
];

export class VideoClipProvider {
  /**
   * Fetch an actual motion video clip (.mp4) for a scene prompt/query.
   * Attempts:
   * 1. Pexels Video API (if PEXELS_API_KEY is configured)
   * 2. Pixabay Video API (if PIXABAY_API_KEY is configured)
   * 3. Mixkit stock video discovery via Tavily search (with instant direct CDN download)
   * 4. Script-aligned verified royalty-free HD motion video fallback (guarantees NO static images)
   */
  async fetchVideoClip(
    prompt: string,
    outputPath: string,
    backupQuery?: string,
    fallbackNiche?: string
  ): Promise<string | null> {
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });

    const queriesToTry = [
      this.extractSearchKeywords(prompt),
      backupQuery ? this.extractSearchKeywords(backupQuery) : null,
      fallbackNiche ? this.extractSearchKeywords(fallbackNiche) : null,
    ].filter(Boolean) as string[];

    for (const cleanKeywords of queriesToTry) {
      logger.info(`[Video Clip Engine] Searching real motion video clips for: "${cleanKeywords}"`);

      // ── Strategy 1: Pexels Video API ──────────────────────────────────────────
      if (env.PEXELS_API_KEY) {
        try {
          const pexelsClip = await this.searchPexels(cleanKeywords, outputPath);
          if (pexelsClip) {
            logger.info(`[Video Clip Engine] Acquired Pexels stock video: ${outputPath}`);
            return outputPath;
          }
        } catch (err: any) {
          logger.warn(`[Video Clip Engine] Pexels search error: ${err.message}`);
        }
      }

      // ── Strategy 2: Pixabay Video API ─────────────────────────────────────────
      if (env.PIXABAY_API_KEY) {
        try {
          const pixabayClip = await this.searchPixabay(cleanKeywords, outputPath);
          if (pixabayClip) {
            logger.info(`[Video Clip Engine] Acquired Pixabay stock video: ${outputPath}`);
            return outputPath;
          }
        } catch (err: any) {
          logger.warn(`[Video Clip Engine] Pixabay search error: ${err.message}`);
        }
      }

      // ── Strategy 3: Mixkit Free Stock Videos via Tavily Search ───────────────
      if (env.TAVILY_API_KEY) {
        try {
          const mixkitClip = await this.searchMixkitViaTavily(cleanKeywords, outputPath);
          if (mixkitClip) {
            logger.info(`[Video Clip Engine] Acquired Mixkit motion video: ${outputPath}`);
            return outputPath;
          }
        } catch (err: any) {
          logger.warn(`[Video Clip Engine] Mixkit search error: ${err.message}`);
        }
      }
    }

    // ── Strategy 4: Script-Aligned Verified Royalty-Free Motion Video Fallback ─────
    if (fallbackNiche === 'cartoon') {
      logger.info(`[Video Clip Engine] Cartoon niche: bypassing generic stock video fallback to allow exact character visual generation`);
      return null;
    }

    logger.info(`[Video Clip Engine] Applying script-aligned verified motion video fallback for: "${prompt}"`);
    const combinedPrompt = `${prompt} ${backupQuery || ''} ${fallbackNiche || ''}`.toLowerCase();
    const matched =
      VERIFIED_MOTION_CLIPS.find((entry) =>
        entry.keywords.some((kw) => combinedPrompt.includes(kw))
      ) || VERIFIED_MOTION_CLIPS[VERIFIED_MOTION_CLIPS.length - 1];

    if (matched?.url) {
      const downloaded = await this.downloadFile(matched.url, outputPath);
      if (downloaded) {
        logger.info(`[Video Clip Engine] Acquired verified motion video fallback (${matched.keywords[0]}): ${outputPath}`);
        return outputPath;
      }
    }

    logger.warn(`[Video Clip Engine] No motion video clip found for "${prompt}"`);
    return null;
  }

  /**
   * Search and download vertical / landscape video clip from Pexels API.
   */
  private async searchPexels(query: string, outputPath: string): Promise<string | null> {
    // Try portrait orientation first for 9:16 Shorts
    let res = await axios.get('https://api.pexels.com/videos/search', {
      params: { query, orientation: 'portrait', per_page: 5 },
      headers: { Authorization: env.PEXELS_API_KEY },
      timeout: 12000,
    });

    let videos: any[] = res.data?.videos || [];

    // Fallback to all orientations if no portrait results
    if (videos.length === 0) {
      res = await axios.get('https://api.pexels.com/videos/search', {
        params: { query, per_page: 5 },
        headers: { Authorization: env.PEXELS_API_KEY },
        timeout: 12000,
      });
      videos = res.data?.videos || [];
    }

    if (videos.length === 0) return null;

    for (const vid of videos) {
      const files: any[] = vid.video_files || [];
      // Pick best HD file
      const hdFile =
        files.find((f) => f.quality === 'hd' && f.file_type === 'video/mp4') ||
        files.find((f) => f.file_type === 'video/mp4');

      if (hdFile?.link) {
        const downloaded = await this.downloadFile(hdFile.link, outputPath);
        if (downloaded) return outputPath;
      }
    }

    return null;
  }

  /**
   * Search and download video clip from Pixabay API.
   */
  private async searchPixabay(query: string, outputPath: string): Promise<string | null> {
    const res = await axios.get('https://pixabay.com/api/videos/', {
      params: {
        key: env.PIXABAY_API_KEY,
        q: query,
        per_page: 5,
      },
      timeout: 12000,
    });

    const hits: any[] = res.data?.hits || [];
    if (hits.length === 0) return null;

    for (const hit of hits) {
      const vids = hit.videos || {};
      const videoUrl =
        vids.medium?.url || vids.large?.url || vids.small?.url || vids.tiny?.url;
      if (videoUrl) {
        const downloaded = await this.downloadFile(videoUrl, outputPath);
        if (downloaded) return outputPath;
      }
    }

    return null;
  }

  /**
   * Search Mixkit stock videos via Tavily, parse the page and download direct MP4.
   */
  private async searchMixkitViaTavily(query: string, outputPath: string): Promise<string | null> {
    const tavilyRes = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: env.TAVILY_API_KEY,
        query: `site:mixkit.co/free-stock-video ${query}`,
        max_results: 4,
      },
      { timeout: 12000 }
    );

    const results: any[] = tavilyRes.data?.results || [];
    logger.info(`[Video Clip Engine] Tavily found ${results.length} candidate stock video pages`);

    for (const item of results) {
      const pageUrl = item.url;
      if (!pageUrl || !pageUrl.includes('mixkit.co/free-stock-video/')) continue;

      // Fast-path: Mixkit item pages end with "-{id}" (e.g. "...-46612")
      const idMatch = pageUrl.match(/-(\d+)\/?$/);
      if (idMatch && idMatch[1]) {
        const directMp4Url = `https://assets.mixkit.co/videos/${idMatch[1]}/${idMatch[1]}-720.mp4`;
        logger.info(`[Video Clip Engine] Instant Mixkit CDN target: ${directMp4Url}`);
        const downloaded = await this.downloadFile(directMp4Url, outputPath);
        if (downloaded) return outputPath;
      }

      try {
        const pageRes = await axios.get(pageUrl, {
          timeout: 6000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        // Search for Mixkit CDN direct MP4 links
        const matches = pageRes.data.match(/https:\/\/assets\.mixkit\.co\/videos\/[^"'<>\s]+\.mp4/g);
        if (matches && matches.length > 0) {
          // Prioritize 720p or 1080p
          const mp4Url =
            matches.find((m: string) => m.includes('720')) ||
            matches.find((m: string) => m.includes('1080')) ||
            matches[0];

          logger.info(`[Video Clip Engine] Found direct MP4 video link from page: ${mp4Url}`);
          const downloaded = await this.downloadFile(mp4Url, outputPath);
          if (downloaded) return outputPath;
        }
      } catch (err: any) {
        logger.debug(`[Video Clip Engine] Mixkit page check skipped: ${err.message}`);
        continue;
      }
    }

    return null;
  }

  /**
   * Stream download an MP4 video file and ensure minimum size (> 25KB).
   */
  private async downloadFile(url: string, outputPath: string): Promise<boolean> {
    try {
      const tempPath = `${outputPath}.download.tmp`;
      const res = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 25000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      const writer = fs.createWriteStream(tempPath);
      res.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = await fsPromises.stat(tempPath);
      if (stats.size > 25000) {
        await fsPromises.rename(tempPath, outputPath);
        logger.info(`[Video Clip Engine] Saved valid video clip (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${outputPath}`);
        return true;
      } else {
        await fsPromises.unlink(tempPath).catch(() => {});
        return false;
      }
    } catch (err: any) {
      logger.warn(`[Video Clip Engine] Video download failed from ${url}: ${err.message}`);
      return false;
    }
  }

  /**
   * Extract 2-4 clean, descriptive keywords for stock video searches.
   * Strips filler words, style directives (ultra HD, 8k, photorealistic, etc.)
   */
  private extractSearchKeywords(prompt: string): string {
    const cleaned = prompt
      .toLowerCase()
      .replace(/ultra hd|cinematic lighting|8k|4k|hyperrealistic|photorealistic|portrait|9:16|vibrant colors|digital art/gi, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleaned.split(' ').filter((w) => w.length > 2);
    // Return top 2 to 4 keywords
    return words.slice(0, 4).join(' ') || 'technology motion';
  }
}

export const videoClipProvider = new VideoClipProvider();

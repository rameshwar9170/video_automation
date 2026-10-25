import { aiProvider } from '../providers/ai.provider';
import { logger } from '../utils/logger';

export interface VideoMetadata {
  title: string;
  description: string;
  hashtags: string[];
  tags: string[];
}

class MetadataService {
  async generateMetadata(
    topic: string,
    script: string,
    niche: string,
    seriesTitle?: string,
    partNumber?: number,
    totalParts?: number
  ): Promise<VideoMetadata> {
    logger.info(`[Metadata] Generating for: "${topic}" (Series: ${seriesTitle ? `Part ${partNumber}/${totalParts}` : 'None'})`);

    const seriesContext =
      seriesTitle && partNumber && totalParts
        ? `This Short is Part ${partNumber} of a ${totalParts}-part series on "${seriesTitle}". The title MUST include "[Part ${partNumber}/${totalParts}]" to maximize binge-watching.`
        : '';

    const prompt = `You are a YouTube SEO expert specializing in Shorts.

Topic: "${topic}"
Niche: ${niche}
${seriesContext}
Script excerpt: "${script.substring(0, 500)}"

Generate optimized YouTube Shorts metadata.
Rules:
- Title: under 70 chars, attention-grabbing, includes main keyword${
      seriesTitle && partNumber && totalParts ? ` and "[Part ${partNumber}/${totalParts}]"` : ''
    }
- Description: 150-300 chars, informative, includes keywords naturally
- Hashtags: 5-8 hashtags starting with #Shorts
- Tags: 10-15 tags (no # prefix) for YouTube search

Return JSON:
{
  "title": "...",
  "description": "...",
  "hashtags": ["#Shorts", "#AI", ...],
  "tags": ["AI", "technology", ...]
}`;

    const metadata = await aiProvider.generateJSON<VideoMetadata>(prompt);

    // Ensure #Shorts and channel branding are always present
    if (!metadata.hashtags.includes('#Shorts')) {
      metadata.hashtags.unshift('#Shorts');
    }
    if (!metadata.hashtags.includes('#AITechStories')) {
      metadata.hashtags.push('#AITechStories');
    }

    if (!metadata.tags.includes('AI Tech Stories')) {
      metadata.tags.unshift('AI Tech Stories', 'AITechStories');
    }

    // Append channel subscription CTA
    const channelCta = '\n\n👉 Subscribe to @AITechStories-n3e for daily secret AI websites, tools & future tech!';
    if (!metadata.description.includes('@AITechStories-n3e')) {
      metadata.description = `${metadata.description}${channelCta}`;
    }

    if (seriesTitle && partNumber) {
      if (!metadata.title.includes(`Part ${partNumber}`)) {
        metadata.title = `${metadata.title.replace(/\[Part.*?\]/g, '').trim()} [Part ${partNumber}/${totalParts || 3}]`.substring(0, 70);
      }
      metadata.hashtags.push(`#Part${partNumber}`);
      metadata.tags.push(`Part ${partNumber}`);
    }

    logger.info(`[Metadata] Title: "${metadata.title}"`);
    return metadata;
  }
}

export const metadataService = new MetadataService();

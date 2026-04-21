import Anthropic from '@anthropic-ai/sdk'
import { scoreToGrade } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ScanInput {
  clientId: string
  clientName: string
  websiteUrl: string
  industry: string
  locations: Array<{ name: string; city: string }>
}

interface CategoryResult {
  score: number
  grade: string
  findings: string[]
  opportunity: string
}

interface ScanResult {
  overall_score: number
  overall_grade: string
  overall_verdict: string
  website: CategoryResult
  social: CategoryResult & { platforms: Record<string, unknown> }
  reviews: CategoryResult & { platforms: Record<string, unknown> }
  local_seo: CategoryResult
  press: CategoryResult
  competitors: CategoryResult & { list: Array<{ name: string; rating?: number }> }
  raw_data: Record<string, unknown>
}

export async function runClientScan(input: ScanInput): Promise<ScanResult> {
  const { clientName, websiteUrl, industry, locations } = input
  const locationStr = locations.map(l => `${l.name} (${l.city})`).join(', ')
  const primaryCity = locations[0]?.city || ''

  const systemPrompt = `You are an expert digital presence analyst for Omniscient Marketing. 
You research businesses online and score their digital presence across 6 categories.
You ALWAYS respond with valid JSON only — no markdown, no explanation, just the JSON object.
Be specific, accurate, and honest. Use real data you find. Never fabricate ratings or metrics.`

  const userPrompt = `Research the digital presence of this business and return a JSON scoring report.

Business: ${clientName}
Website: ${websiteUrl}
Industry: ${industry}
Locations: ${locationStr}
Primary market: ${primaryCity}

Search for:
1. Website quality (SEO, mobile, CTAs, content, schema)
2. Social media (Instagram, TikTok, Facebook, LinkedIn, YouTube — followers, activity)
3. Reviews (Google, Yelp, TripAdvisor, OpenTable/Resy if restaurant — ratings, counts, response rate)
4. Local SEO (map pack, GBP completeness, citations)
5. News & press (recent mentions, media quality)
6. Competitor position (3 main competitors, how they compare)

Scoring: 0-100 per category. Overall = weighted average (Reviews 25%, Website 20%, Social 20%, Local SEO 15%, Press 10%, Competitors 10%).

Return ONLY this JSON (no markdown):
{
  "overall_score": <0-100>,
  "overall_grade": "<A/B/C/D/F>",
  "overall_verdict": "<1 punchy sentence about their digital presence>",
  "website": {
    "score": <0-100>,
    "grade": "<letter>",
    "findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
    "opportunity": "<single biggest improvement>",
    "sub_scores": {"homepage": <0-20>, "mobile": <0-20>, "seo": <0-20>, "conversion": <0-20>, "technical": <0-10>, "content": <0-10>}
  },
  "social": {
    "score": <0-100>,
    "grade": "<letter>",
    "findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
    "opportunity": "<single biggest improvement>",
    "platforms": {
      "instagram": {"handle": "<@handle or null>", "followers": <number or null>, "posts": <number or null>, "active": <true/false>},
      "tiktok": {"handle": "<@handle or null>", "followers": <number or null>, "active": <true/false>},
      "facebook": {"followers": <number or null>, "active": <true/false>},
      "linkedin": {"active": <true/false>},
      "youtube": {"active": <true/false>}
    }
  },
  "reviews": {
    "score": <0-100>,
    "grade": "<letter>",
    "findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
    "opportunity": "<single biggest improvement>",
    "platforms": {
      "google": {"rating": <number or null>, "count": <number or null>},
      "yelp": {"rating": <number or null>, "count": <number or null>},
      "tripadvisor": {"rating": <number or null>, "count": <number or null>, "claimed": <true/false>},
      "opentable": {"listed": <true/false>},
      "trustpilot": {"rating": <number or null>, "count": <number or null>}
    }
  },
  "local_seo": {
    "score": <0-100>,
    "grade": "<letter>",
    "findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
    "opportunity": "<single biggest improvement>"
  },
  "press": {
    "score": <0-100>,
    "grade": "<letter>",
    "findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
    "opportunity": "<single biggest improvement>"
  },
  "competitors": {
    "score": <0-100>,
    "grade": "<letter>",
    "findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
    "opportunity": "<single biggest improvement>",
    "list": [
      {"name": "<competitor 1>", "rating": <number or null>, "review_count": <number or null>},
      {"name": "<competitor 2>", "rating": <number or null>, "review_count": <number or null>},
      {"name": "<competitor 3>", "rating": <number or null>, "review_count": <number or null>}
    ]
  }
}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    tools: [{
      type: 'web_search_20250305' as const,
      name: 'web_search',
    }],
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract the JSON from the response
  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  let parsed: ScanResult
  try {
    // Strip any markdown fences if present
    const clean = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    throw new Error(`Failed to parse scan response: ${textContent.slice(0, 200)}`)
  }

  // Ensure grades are consistent with scores
  parsed.overall_grade = scoreToGrade(parsed.overall_score)
  parsed.website.grade = scoreToGrade(parsed.website.score)
  parsed.social.grade = scoreToGrade(parsed.social.score)
  parsed.reviews.grade = scoreToGrade(parsed.reviews.score)
  parsed.local_seo.grade = scoreToGrade(parsed.local_seo.score)
  parsed.press.grade = scoreToGrade(parsed.press.score)
  parsed.competitors.grade = scoreToGrade(parsed.competitors.score)

  parsed.raw_data = { response_id: response.id, model: response.model }

  return parsed
}

export function scanResultToDbRow(clientId: string, result: ScanResult, scanType = 'weekly') {
  return {
    client_id: clientId,
    scan_type: scanType,
    status: 'complete',
    overall_score: result.overall_score,
    overall_grade: result.overall_grade,
    overall_verdict: result.overall_verdict,
    website_score: result.website.score,
    website_grade: result.website.grade,
    website_findings: result.website.findings,
    website_opportunity: result.website.opportunity,
    social_score: result.social.score,
    social_grade: result.social.grade,
    social_findings: result.social.findings,
    social_opportunity: result.social.opportunity,
    social_platforms: result.social.platforms,
    reviews_score: result.reviews.score,
    reviews_grade: result.reviews.grade,
    reviews_findings: result.reviews.findings,
    reviews_opportunity: result.reviews.opportunity,
    review_platforms: result.reviews.platforms,
    local_seo_score: result.local_seo.score,
    local_seo_grade: result.local_seo.grade,
    local_seo_findings: result.local_seo.findings,
    local_seo_opportunity: result.local_seo.opportunity,
    press_score: result.press.score,
    press_grade: result.press.grade,
    press_findings: result.press.findings,
    press_opportunity: result.press.opportunity,
    competitor_score: result.competitors.score,
    competitor_grade: result.competitors.grade,
    competitor_findings: result.competitors.findings,
    competitor_opportunity: result.competitors.opportunity,
    competitors: result.competitors.list,
    raw_data: result.raw_data,
  }
}

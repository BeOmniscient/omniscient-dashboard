export type Role = 'admin' | 'client'
export type ClientTier = 'core' | 'growth' | 'pro' | 'enterprise'
export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'churned'
export type FixStatus = 'pending' | 'in_progress' | 'done' | 'skipped'
export type ScanType = 'onboarding' | 'weekly' | 'manual'
export type ActivityType = 'scan_complete' | 'fix_done' | 'fix_started' | 'report_sent' | 'kpi_update'

export interface Profile {
  id: string
  role: Role
  client_id: string | null
  full_name: string | null
  email: string | null
  created_at: string
}

export interface ClientLocation {
  name: string
  city: string
  address?: string
}

export interface Client {
  id: string
  name: string
  short_name: string | null
  industry: string | null
  website_url: string | null
  locations: ClientLocation[]
  contact_name: string | null
  contact_email: string | null
  tier: ClientTier
  status: ClientStatus
  onboarded_at: string
  brand_primary: string
  brand_secondary: string
  created_at: string
  updated_at: string
}

export interface ReviewPlatforms {
  [key: string]: {
    rating?: number
    count?: number
    claimed?: boolean
    listed?: boolean
  }
}

export interface SocialPlatforms {
  [key: string]: {
    handle?: string
    followers?: number
    posts?: number
    active: boolean
  }
}

export interface Scan {
  id: string
  client_id: string
  scanned_at: string
  scan_type: ScanType
  overall_score: number
  overall_grade: string
  overall_verdict: string | null
  website_score: number
  website_grade: string
  website_findings: string[]
  website_opportunity: string | null
  social_score: number
  social_grade: string
  social_findings: string[]
  social_opportunity: string | null
  social_platforms: SocialPlatforms
  reviews_score: number
  reviews_grade: string
  reviews_findings: string[]
  reviews_opportunity: string | null
  review_platforms: ReviewPlatforms
  local_seo_score: number
  local_seo_grade: string
  local_seo_findings: string[]
  local_seo_opportunity: string | null
  press_score: number
  press_grade: string
  press_findings: string[]
  press_opportunity: string | null
  competitor_score: number
  competitor_grade: string
  competitor_findings: string[]
  competitor_opportunity: string | null
  competitors: Array<{ name: string; rating?: number; review_count?: number }>
  status: 'running' | 'complete' | 'failed'
  error_message: string | null
}

export interface Fix {
  id: string
  client_id: string
  category: string
  name: string
  description: string | null
  before_state: string | null
  after_state: string | null
  how_we_do_it: string | null
  tier_required: string
  score_impact: number
  status: FixStatus
  started_at: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface KpiDefinition {
  id: string
  client_id: string
  name: string
  key: string
  unit: string | null
  target: number | null
  icon: string | null
  sort_order: number
  created_at: string
}

export interface KpiValue {
  id: string
  client_id: string
  kpi_id: string
  value: number
  recorded_at: string
  note: string | null
}

export interface KpiWithValues extends KpiDefinition {
  values: KpiValue[]
  latest_value?: number
  previous_value?: number
  delta?: number
}

export interface Activity {
  id: string
  client_id: string
  type: ActivityType
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Report {
  id: string
  client_id: string
  period_month: number
  period_year: number
  overall_score: number | null
  overall_grade: string | null
  summary: string | null
  html_content: string | null
  sent_at: string | null
  created_at: string
}

// Enriched client with latest scan data (for dashboard)
export interface ClientWithLatestScan extends Client {
  latest_scan?: Scan
  previous_scan?: Scan
  score_delta?: number
}

export type GradeColor = 'teal' | 'blue' | 'yellow' | 'orange' | 'red'

export function gradeToColor(grade: string): GradeColor {
  if (grade.startsWith('A')) return 'teal'
  if (grade.startsWith('B')) return 'blue'
  if (grade.startsWith('C')) return 'yellow'
  if (grade.startsWith('D')) return 'orange'
  return 'red'
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'A−'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

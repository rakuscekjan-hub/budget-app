/**
 * AI Analyse Stub — klaar voor integratie met Claude API.
 *
 * Feature flag: zet AI_ANALYSIS_ENABLED=true in .env.local om te activeren.
 * Voeg ANTHROPIC_API_KEY toe zodra je de echte integratie bouwt.
 */

export const AI_ANALYSIS_ENABLED = process.env.AI_ANALYSIS_ENABLED === 'true'

export interface AIAnalysisRequest {
  incomeMonthly: number
  fixedCostsMonthly: number
  safeToSpend: number
  topCategories: Array<{ category: string; monthly: number; percentage: number }>
  quickWinTotal: number
  userQuestion?: string
}

export interface AIAnalysisResult {
  summary: string
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Roep de Claude API aan voor een persoonlijk budgetadvies.
 * Momenteel stub — geeft een placeholder terug.
 */
export async function getAIAnalysis(
  _request: AIAnalysisRequest
): Promise<AIAnalysisResult> {
  if (!AI_ANALYSIS_ENABLED) {
    return {
      summary: 'AI-analyse is nog niet actief. Schakel AI_ANALYSIS_ENABLED=true in.',
      recommendations: [],
      riskLevel: 'low',
    }
  }

  // TODO: Integreer Anthropic SDK
  // import Anthropic from '@anthropic-ai/sdk'
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  //
  // const response = await client.messages.create({
  //   model: 'claude-opus-4-6',
  //   max_tokens: 1024,
  //   messages: [{ role: 'user', content: buildPrompt(request) }]
  // })
  //
  // return parseResponse(response)

  throw new Error('AI_ANALYSIS_ENABLED is true maar integratie is nog niet gebouwd.')
}

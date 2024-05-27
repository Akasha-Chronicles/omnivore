export interface Feature {
  title: string
  has_thumbnail: boolean
  has_site_icon: boolean
  saved_at: Date
  site?: string
  language?: string
  author?: string
  directionality: string
  word_count?: number
  subscription_type: string
  folder: string
}

export interface ScoreApiRequestBody {
  user_id: string
  item_features: Record<string, Feature> // item_id -> feature
}

export type ScoreApiResponse = Record<string, number> // item_id -> score

export const getScores = async (
  data: ScoreApiRequestBody
): Promise<ScoreApiResponse> => {
  const API_URL = 'http://127.0.0.1:5000/predictions'

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to score candidates: ${response.statusText}`)
  }

  const scores = (await response.json()) as ScoreApiResponse
  return scores
}

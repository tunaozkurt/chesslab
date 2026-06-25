export type GameResult = 'win' | 'loss' | 'draw'
export type UserColor = 'white' | 'black'
export type AnalysisStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
export type GamePhase = 'opening' | 'middlegame' | 'endgame'
export type MoveClassification = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'miss'
export type Severity = 'inaccuracy' | 'mistake' | 'blunder'
export type MistakeParentCategory = 'opening' | 'tactical' | 'strategic' | 'endgame' | 'time_psychology'
export type StudyItemType = 'mistake' | 'repertoire' | 'endgame' | 'tactic' | 'concept'

export interface Game {
  id: string
  user_id: string
  opponent: string | null
  played_at: string | null
  platform: string | null
  time_control: string | null
  user_color: UserColor | null
  result: GameResult | null
  opening_name: string | null
  eco_code: string | null
  pgn: string
  fen_final: string | null
  total_moves: number | null
  analysis_status: AnalysisStatus
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Move {
  id: string
  game_id: string
  move_number: number
  color: UserColor
  san: string
  uci: string
  fen_before: string
  fen_after: string
  created_at: string
}

export interface EngineAnalysis {
  id: string
  move_id: string
  game_id: string
  eval_before: number | null
  eval_after: number | null
  best_move: string | null
  best_move_san: string | null
  centipawn_loss: number | null
  classification: MoveClassification | null
  game_phase: GamePhase | null
  depth: number
  pv: string | null
  is_critical: boolean
  created_at: string
}

export interface MistakeCategory {
  id: string
  name: string
  parent_category: MistakeParentCategory
  description: string | null
  sort_order: number
}

export interface Mistake {
  id: string
  user_id: string
  game_id: string
  move_id: string | null
  engine_analysis_id: string | null
  fen: string
  user_move: string
  best_move: string | null
  centipawn_loss: number | null
  severity: Severity
  game_phase: GamePhase | null
  notes: string | null
  is_reviewed: boolean
  created_at: string
  mistake_themes?: { category: MistakeCategory }[]
}

export interface RepertoireLine {
  id: string
  user_id: string
  color: UserColor
  name: string
  eco_code: string | null
  moves: string | null
  main_idea: string | null
  typical_plan: string | null
  pawn_structure: string | null
  dangerous_ideas: string | null
  notes: string | null
  confidence_score: number
  games_played: number
  wins: number
  draws: number
  losses: number
  last_played_at: string | null
  next_review_at: string | null
  review_interval: number
  review_ease: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EndgamePosition {
  id: string
  user_id: string
  fen: string
  category: string | null
  theme: string | null
  goal: 'win' | 'draw' | 'defend' | null
  difficulty: number
  source: string
  source_game_id: string | null
  notes: string | null
  next_review_at: string
  review_interval: number
  review_ease: number
  success_count: number
  fail_count: number
  created_at: string
}

export interface TacticPosition {
  id: string
  user_id: string
  fen: string
  motif: string | null
  solution: string | null
  difficulty: number
  source: string
  source_game_id: string | null
  notes: string | null
  next_review_at: string
  review_interval: number
  review_ease: number
  success_count: number
  fail_count: number
  created_at: string
}

export interface StudyItem {
  id: string
  user_id: string
  type: StudyItemType
  reference_id: string | null
  reference_table: string | null
  title: string
  description: string | null
  priority_score: number
  due_at: string
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  study_item_id: string
  reviewed_at: string
  quality: number
  time_spent_seconds: number | null
  notes: string | null
  created_at: string
}

export interface WeaknessScore {
  id: string
  user_id: string
  area: string
  score: number
  computed_at: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  games_played: number
  wins: number
  draws: number
  losses: number
  avg_centipawn_loss: number | null
  blunders_count: number
  mistakes_count: number
  inaccuracies_count: number
  top_mistake_themes: string[]
  opening_performance: Record<string, unknown>
  endgame_performance: Record<string, unknown>
  ai_summary: string | null
  study_recommendations: string[]
  created_at: string
}

export interface DashboardStats {
  totalGames: number
  winRate: number
  drawRate: number
  lossRate: number
  avgCentipawnLoss: number | null
  blundersLast10: number
  dueReviews: number
  studyItemsDue: number
  weaknessScores: WeaknessScore[]
  recentGames: Game[]
  todayStudyItems: StudyItem[]
}

export interface ParsedGame {
  pgn: string
  opponent: string | null
  played_at: string | null
  platform: string | null
  time_control: string | null
  user_color: UserColor | null
  result: GameResult | null
  opening_name: string | null
  eco_code: string | null
  total_moves: number
}

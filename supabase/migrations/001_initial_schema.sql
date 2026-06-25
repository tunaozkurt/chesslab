-- ChessLab Database Schema
-- Sprint 1: Full schema, incremental data population

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  rating INTEGER DEFAULT 1500,
  preferred_color TEXT DEFAULT 'both',
  stockfish_depth INTEGER DEFAULT 20,
  default_platform TEXT DEFAULT 'chess.com',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opponent TEXT,
  played_at TIMESTAMPTZ,
  platform TEXT,
  time_control TEXT,
  user_color TEXT CHECK (user_color IN ('white', 'black')),
  result TEXT CHECK (result IN ('win', 'loss', 'draw')),
  opening_name TEXT,
  eco_code TEXT,
  pgn TEXT NOT NULL,
  fen_final TEXT,
  total_moves INTEGER,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'in_progress', 'completed', 'failed')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MOVES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  move_number INTEGER NOT NULL,
  color TEXT CHECK (color IN ('white', 'black')),
  san TEXT NOT NULL,
  uci TEXT NOT NULL,
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENGINE ANALYSIS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.engine_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  move_id UUID REFERENCES public.moves(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  eval_before DECIMAL(10,2),
  eval_after DECIMAL(10,2),
  best_move TEXT,
  best_move_san TEXT,
  centipawn_loss DECIMAL(10,2),
  classification TEXT CHECK (classification IN ('best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder', 'miss')),
  game_phase TEXT CHECK (game_phase IN ('opening', 'middlegame', 'endgame')),
  depth INTEGER DEFAULT 20,
  pv TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MISTAKE CATEGORIES (seed data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mistake_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_category TEXT NOT NULL CHECK (parent_category IN ('opening', 'tactical', 'strategic', 'endgame', 'time_psychology')),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MISTAKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  move_id UUID REFERENCES public.moves(id) ON DELETE CASCADE,
  engine_analysis_id UUID REFERENCES public.engine_analysis(id),
  fen TEXT NOT NULL,
  user_move TEXT NOT NULL,
  best_move TEXT,
  centipawn_loss DECIMAL(10,2),
  severity TEXT CHECK (severity IN ('inaccuracy', 'mistake', 'blunder')),
  game_phase TEXT CHECK (game_phase IN ('opening', 'middlegame', 'endgame')),
  notes TEXT,
  is_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MISTAKE THEMES (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mistake_themes (
  mistake_id UUID REFERENCES public.mistakes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.mistake_categories(id) ON DELETE CASCADE,
  is_auto_tagged BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (mistake_id, category_id)
);

-- ============================================================
-- OPENINGS REFERENCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eco_code TEXT UNIQUE,
  name TEXT NOT NULL,
  moves TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPERTOIRE LINES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.repertoire_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  color TEXT CHECK (color IN ('white', 'black')) NOT NULL,
  name TEXT NOT NULL,
  eco_code TEXT,
  moves TEXT,
  main_idea TEXT,
  typical_plan TEXT,
  pawn_structure TEXT,
  dangerous_ideas TEXT,
  notes TEXT,
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  review_interval INTEGER DEFAULT 1,
  review_ease DECIMAL(4,2) DEFAULT 2.5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPERTOIRE POSITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.repertoire_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertoire_line_id UUID REFERENCES public.repertoire_lines(id) ON DELETE CASCADE NOT NULL,
  fen TEXT NOT NULL,
  move_number INTEGER,
  color TEXT,
  correct_move TEXT,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GAME-REPERTOIRE LINKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_repertoire_links (
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  repertoire_line_id UUID REFERENCES public.repertoire_lines(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, repertoire_line_id)
);

-- ============================================================
-- ENDGAME POSITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.endgame_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fen TEXT NOT NULL,
  category TEXT,
  theme TEXT,
  goal TEXT CHECK (goal IN ('win', 'draw', 'defend')),
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 3,
  source TEXT DEFAULT 'manual',
  source_game_id UUID REFERENCES public.games(id),
  notes TEXT,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  review_interval INTEGER DEFAULT 1,
  review_ease DECIMAL(4,2) DEFAULT 2.5,
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TACTIC POSITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tactic_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fen TEXT NOT NULL,
  motif TEXT,
  solution TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 3,
  source TEXT DEFAULT 'own_game',
  source_game_id UUID REFERENCES public.games(id),
  notes TEXT,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  review_interval INTEGER DEFAULT 1,
  review_ease DECIMAL(4,2) DEFAULT 2.5,
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDY ITEMS (Study Queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('mistake', 'repertoire', 'endgame', 'tactic', 'concept')) NOT NULL,
  reference_id UUID,
  reference_table TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority_score DECIMAL(10,2) DEFAULT 50,
  due_at TIMESTAMPTZ DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS (Spaced Repetition Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  study_item_id UUID REFERENCES public.study_items(id) ON DELETE CASCADE NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  quality INTEGER CHECK (quality BETWEEN 0 AND 5) NOT NULL,
  time_spent_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRAINING SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  items_reviewed INTEGER DEFAULT 0,
  session_type TEXT DEFAULT 'daily_review',
  notes TEXT
);

-- ============================================================
-- WEEKLY REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  avg_centipawn_loss DECIMAL(10,2),
  blunders_count INTEGER DEFAULT 0,
  mistakes_count INTEGER DEFAULT 0,
  inaccuracies_count INTEGER DEFAULT 0,
  top_mistake_themes JSONB DEFAULT '[]',
  opening_performance JSONB DEFAULT '{}',
  endgame_performance JSONB DEFAULT '{}',
  ai_summary TEXT,
  study_recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================================
-- WEAKNESS SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weakness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 100) DEFAULT 50,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, area)
);

-- ============================================================
-- INDEXES (performans için)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_games_user_id ON public.games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON public.games(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_analysis_status ON public.games(analysis_status);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON public.moves(game_id);
CREATE INDEX IF NOT EXISTS idx_engine_analysis_game_id ON public.engine_analysis(game_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user_id ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_game_id ON public.mistakes(game_id);
CREATE INDEX IF NOT EXISTS idx_study_items_user_id ON public.study_items(user_id);
CREATE INDEX IF NOT EXISTS idx_study_items_due_at ON public.study_items(due_at);
CREATE INDEX IF NOT EXISTS idx_reviews_study_item_id ON public.reviews(study_item_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_lines_user_id ON public.repertoire_lines(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (Her kullanıcı sadece kendi verisini görür)
-- ============================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repertoire_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repertoire_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_repertoire_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endgame_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactic_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weakness_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their games" ON public.games FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their moves" ON public.moves FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE id = moves.game_id AND user_id = auth.uid())
);
CREATE POLICY "Users own their engine analysis" ON public.engine_analysis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE id = engine_analysis.game_id AND user_id = auth.uid())
);
CREATE POLICY "Users own their mistakes" ON public.mistakes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their mistake themes" ON public.mistake_themes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.mistakes WHERE id = mistake_themes.mistake_id AND user_id = auth.uid())
);
CREATE POLICY "Users own their repertoire" ON public.repertoire_lines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own repertoire positions" ON public.repertoire_positions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.repertoire_lines WHERE id = repertoire_positions.repertoire_line_id AND user_id = auth.uid())
);
CREATE POLICY "Users own game repertoire links" ON public.game_repertoire_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.games WHERE id = game_repertoire_links.game_id AND user_id = auth.uid())
);
CREATE POLICY "Users own their endgames" ON public.endgame_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their tactics" ON public.tactic_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their study items" ON public.study_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their reviews" ON public.reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their sessions" ON public.training_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their reports" ON public.weekly_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their weakness scores" ON public.weakness_scores FOR ALL USING (auth.uid() = user_id);

-- mistake_categories public (read-only seed data)
ALTER TABLE public.mistake_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mistake categories" ON public.mistake_categories FOR SELECT USING (true);
CREATE POLICY "Openings are public" ON public.openings FOR SELECT USING (true);

-- ============================================================
-- SEED: MISTAKE CATEGORIES
-- ============================================================
INSERT INTO public.mistake_categories (name, parent_category, description, sort_order) VALUES
  -- Açılış hataları
  ('Varyant bilmeme', 'opening', 'Doğru hamleler bilinmiyor', 1),
  ('Yanlış plan', 'opening', 'Açılışın gerektirdiği plan yanlış', 2),
  ('Erken taş değişimi', 'opening', 'Gelişim tamamlanmadan gereksiz taş değişimi', 3),
  ('Merkez kontrolünü kaybetme', 'opening', 'Merkez piyon ve kontrol kaybedildi', 4),
  ('Gelişim geriliği', 'opening', 'Rakip daha fazla taşını geliştirdi', 5),
  ('Rok gecikmesi', 'opening', 'Şah güvenliğe alınmadı', 6),
  -- Taktik hatalar
  ('Çatal', 'tactical', 'İki taşa aynı anda saldıran hamle kaçırıldı', 10),
  ('Şiş', 'tactical', 'Şiş taktiği kaçırıldı veya düşüldü', 11),
  ('Açmaz', 'tactical', 'Taş sıkıştırma taktiği', 12),
  ('Ara hamle', 'tactical', 'Zwischenzug - beklenmedik ara hamle', 13),
  ('Çifte saldırı', 'tactical', 'Aynı anda iki hedefe saldırı', 14),
  ('Savunmasız taş', 'tactical', 'Korunmayan taş bırakıldı', 15),
  ('Mat ağı', 'tactical', 'Mat tehdidi görülmedi', 16),
  ('Arka sıra zayıflığı', 'tactical', 'Back rank mate zayıflığı', 17),
  ('Taş sıkışması', 'tactical', 'Taş hareket edemez durumda', 18),
  -- Stratejik hatalar
  ('Kötü taş', 'strategic', 'Zayıf bir taş uzun süre kötü pozisyonda kaldı', 20),
  ('Zayıf kare', 'strategic', 'Kontrol edilemeyen kare rakibe bırakıldı', 21),
  ('Piyon yapısı bozulması', 'strategic', 'Zayıf piyon yapısı oluşturuldu', 22),
  ('Yanlış taş değişimi', 'strategic', 'Kötü taş değişimi yapıldı', 23),
  ('Plansız manevra', 'strategic', 'Net bir plan olmadan hamle yapıldı', 24),
  ('Açık hat kaybı', 'strategic', 'Açık hat rakibe bırakıldı', 25),
  ('Renk kompleksi', 'strategic', 'Renk zayıflığı oluştu', 26),
  -- Oyun sonu hataları
  ('Opposition', 'endgame', 'Şah muhalefeti yanlış uygulandı', 30),
  ('Lucena', 'endgame', 'Lucena pozisyonu yanlış oynanı', 31),
  ('Philidor', 'endgame', 'Philidor savunması hatalı', 32),
  ('Kale aktifliği', 'endgame', 'Kale pasif kaldı', 33),
  ('Geçer piyon', 'endgame', 'Geçer piyon yanlış yönetildi', 34),
  ('Şah aktivitesi', 'endgame', 'Şah oyun sonuna geç girdi', 35),
  ('Yanlış piyon sürüşü', 'endgame', 'Piyon sürüşü zamanlaması yanlış', 36),
  ('Kazancı berabere yapma', 'endgame', 'Kazanılmış pozisyon berabere bitti', 37),
  ('Beraberi kaybetme', 'endgame', 'Berabere pozisyonu kaybedildi', 38),
  -- Zaman / Psikoloji
  ('Acele hamle', 'time_psychology', 'Düşünmeden hamle yapıldı', 40),
  ('Kazanırken gevşeme', 'time_psychology', 'Avantajlıyken konsantrasyon düştü', 41),
  ('Kaybederken panik', 'time_psychology', 'Kötü pozisyonda mantıklı düşünülemedi', 42),
  ('Zaman sıkışması', 'time_psychology', 'Zaman baskısında hata yapıldı', 43),
  ('Tehdidi küçümseme', 'time_psychology', 'Rakibin tehdidi ciddiye alınmadı', 44),
  ('Gereksiz komplikasyon', 'time_psychology', 'Sade pozisyonda gereksiz komplikasyon arandı', 45)
ON CONFLICT (name) DO NOTHING;

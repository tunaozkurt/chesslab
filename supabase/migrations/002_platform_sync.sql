-- Platform entegrasyon alanları: bağlı hesap kullanıcı adları ve son senkronizasyon zamanları
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS lichess_username TEXT,
  ADD COLUMN IF NOT EXISTS chesscom_username TEXT,
  ADD COLUMN IF NOT EXISTS lichess_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chesscom_last_sync TIMESTAMPTZ;

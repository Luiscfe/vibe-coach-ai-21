
ALTER TABLE public.eating_logs 
  ADD COLUMN IF NOT EXISTS protein_g numeric(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carbs_g numeric(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fat_g numeric(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_protein_goal integer DEFAULT 163,
  ADD COLUMN IF NOT EXISTS daily_carbs_goal integer DEFAULT 442,
  ADD COLUMN IF NOT EXISTS daily_fat_goal integer DEFAULT 102;

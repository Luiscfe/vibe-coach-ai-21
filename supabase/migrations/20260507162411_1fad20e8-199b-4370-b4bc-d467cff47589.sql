
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('user','admin');
CREATE TYPE public.user_gender AS ENUM ('feminino','masculino','outro');
CREATE TYPE public.user_goal AS ENUM ('emagrecer','ganhar_massa','definir','saude_geral');
CREATE TYPE public.experience_level AS ENUM ('iniciante','intermediario','avancado');
CREATE TYPE public.workout_time AS ENUM ('manha','tarde','noite');
CREATE TYPE public.workout_status AS ENUM ('concluido','pulado','parcial');
CREATE TYPE public.meal_evaluation AS ENUM ('boa','ruim','neutra');
CREATE TYPE public.cycle_phase AS ENUM ('menstrual','folicular','ovulatoria','lutea');
CREATE TYPE public.memory_type AS ENUM ('food_dislike','food_preference','skip_pattern','emotional_state','injury','goal_change','schedule');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  gender public.user_gender,
  birth_date DATE,
  weight NUMERIC(5,2),
  height NUMERIC(5,2),
  goal public.user_goal,
  experience_level public.experience_level,
  preferred_workout_time public.workout_time,
  food_dislikes TEXT,
  food_preferences TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  cycle_start_date DATE,
  cycle_duration INT DEFAULT 28,
  tracks_cycle BOOLEAN DEFAULT false,
  anchor_video_url TEXT,
  anchor_text TEXT,
  anchor_recorded_at TIMESTAMPTZ,
  sabotage_mode_enabled BOOLEAN DEFAULT true,
  group_alerts_enabled BOOLEAN DEFAULT true,
  device_token TEXT,
  subscription_status TEXT DEFAULT 'free',
  daily_calorie_goal INT DEFAULT 2000,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER ROLES (separate, secure)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- USER MEMORY
CREATE TABLE public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type public.memory_type NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_user_memory_user ON public.user_memory(user_id);

-- WORKOUT LOGS
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  muscle_group TEXT NOT NULL,
  workout_name TEXT,
  duration_minutes INT,
  status public.workout_status NOT NULL,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_workout_logs_user_date ON public.workout_logs(user_id, date);

-- EATING LOGS
CREATE TABLE public.eating_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
  meal_type TEXT,
  description TEXT,
  calories INT,
  evaluation public.meal_evaluation DEFAULT 'neutra',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_eating_logs_user_date ON public.eating_logs(user_id, datetime);

-- CYCLE LOGS
CREATE TABLE public.cycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  phase public.cycle_phase,
  symptoms_fatigue INT CHECK (symptoms_fatigue BETWEEN 0 AND 5),
  symptoms_bloating INT CHECK (symptoms_bloating BETWEEN 0 AND 5),
  symptoms_mood INT CHECK (symptoms_mood BETWEEN 0 AND 5),
  symptoms_cramp INT CHECK (symptoms_cramp BETWEEN 0 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- GROUPS
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal public.user_goal NOT NULL,
  member_count INT DEFAULT 0,
  is_full BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 100),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at DESC);

-- ADHERENCE SCORES
CREATE TABLE public.adherence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- CHAT MESSAGES (Coach IA)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, created_at);

-- WORKOUT PLAN (semanal)
CREATE TABLE public.workout_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  muscle_group TEXT NOT NULL,
  workout_name TEXT NOT NULL,
  duration_minutes INT DEFAULT 45,
  intensity NUMERIC(3,2) DEFAULT 1.0,
  exercises JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eating_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adherence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan ENABLE ROW LEVEL SECURITY;

-- Helper: is member of group
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id);
$$;

-- POLICIES: profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_group" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
  )
);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- user_memory
CREATE POLICY "memory_all_own" ON public.user_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workout_logs
CREATE POLICY "wlogs_all_own" ON public.workout_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- eating_logs
CREATE POLICY "elogs_all_own" ON public.eating_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- cycle_logs
CREATE POLICY "clogs_all_own" ON public.cycle_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- adherence
CREATE POLICY "ad_all_own" ON public.adherence_scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- chat
CREATE POLICY "chat_all_own" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- plan
CREATE POLICY "plan_all_own" ON public.workout_plan FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- groups: anyone authenticated can read groups they belong to (and not-full ones for matching)
CREATE POLICY "groups_select_members" ON public.groups FOR SELECT USING (
  public.is_group_member(id, auth.uid()) OR auth.uid() IS NOT NULL
);

-- group_members: see members of own groups; insert self only
CREATE POLICY "gm_select_own_group" ON public.group_members FOR SELECT USING (
  public.is_group_member(group_id, auth.uid())
);
CREATE POLICY "gm_insert_self" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gm_update_own" ON public.group_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gm_delete_own" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- group_messages: members can read & write
CREATE POLICY "gmsg_select" ON public.group_messages FOR SELECT USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "gmsg_insert" ON public.group_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id, auth.uid()));

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_memory_updated BEFORE UPDATE ON public.user_memory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Group member count maintenance
CREATE OR REPLACE FUNCTION public.update_group_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid UUID; _cnt INT;
BEGIN
  _gid := COALESCE(NEW.group_id, OLD.group_id);
  SELECT COUNT(*) INTO _cnt FROM public.group_members WHERE group_id = _gid;
  UPDATE public.groups SET member_count = _cnt, is_full = (_cnt >= 5) WHERE id = _gid;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_gm_count_ins AFTER INSERT ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.update_group_count();
CREATE TRIGGER trg_gm_count_del AFTER DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.update_group_count();

-- Storage bucket for anchor videos (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('anchor-videos','anchor-videos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anchor_videos_select_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'anchor-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "anchor_videos_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'anchor-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "anchor_videos_update_own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'anchor-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "anchor_videos_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'anchor-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;

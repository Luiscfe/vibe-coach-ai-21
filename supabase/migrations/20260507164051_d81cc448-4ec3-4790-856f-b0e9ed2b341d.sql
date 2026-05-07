ALTER TABLE public.cycle_logs ADD CONSTRAINT cycle_logs_user_date_uniq UNIQUE (user_id, date);
ALTER TABLE public.adherence_scores ADD CONSTRAINT adherence_user_date_uniq UNIQUE (user_id, date);
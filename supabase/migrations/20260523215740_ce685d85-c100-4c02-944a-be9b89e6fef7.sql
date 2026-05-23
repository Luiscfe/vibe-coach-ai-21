
-- 1) Tighten groups SELECT policy to members only
DROP POLICY IF EXISTS groups_select_members ON public.groups;
CREATE POLICY groups_select_members ON public.groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));

-- 2) Restrict profiles row visibility to owner only; expose safe fields to group members via a view
DROP POLICY IF EXISTS profiles_select_group ON public.profiles;

CREATE OR REPLACE VIEW public.group_member_profiles
WITH (security_invoker = false) AS
SELECT p.id, p.name, p.goal, p.current_streak
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.group_members gm1
  JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.user_id = auth.uid() AND gm2.user_id = p.id
);

REVOKE ALL ON public.group_member_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.group_member_profiles TO authenticated;

-- 3) Lock down SECURITY DEFINER functions
-- Trigger-only functions: no client should call directly
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_group_count() FROM PUBLIC, anon, authenticated;

-- Helper functions used by RLS: revoke from anon (still callable by authenticated for RLS evaluation)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

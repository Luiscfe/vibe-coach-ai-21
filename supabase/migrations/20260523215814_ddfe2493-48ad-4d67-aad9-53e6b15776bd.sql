
CREATE OR REPLACE FUNCTION public.get_group_member_profiles(_user_ids uuid[])
RETURNS TABLE (id uuid, name text, goal public.user_goal, current_streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.goal, p.current_streak
  FROM public.profiles p
  WHERE p.id = ANY(_user_ids)
    AND EXISTS (
      SELECT 1
      FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = p.id
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_group_member_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_member_profiles(uuid[]) TO authenticated;

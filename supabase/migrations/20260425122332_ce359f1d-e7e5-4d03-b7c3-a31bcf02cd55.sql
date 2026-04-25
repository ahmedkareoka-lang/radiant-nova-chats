CREATE OR REPLACE FUNCTION public.get_relationship_cost(_type text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _type
    WHEN 'lover' THEN 10000::bigint
    WHEN 'married' THEN 50000::bigint
    WHEN 'bestie' THEN 5000::bigint
    ELSE 10000::bigint
  END
$$;
INSERT INTO public.gifts (name, price, image_url, tier, category, duration_ms, sort_order, is_active)
SELECT v.name, v.price, v.image_url, v.tier, v.category, v.duration_ms, v.sort_order, true
FROM (VALUES
  ('الأسد الأسود',     50000,  '/gifts/black_lion.svg',    'legendary', 'legendary', 7500, 70),
  ('النمر الأسود',     60000,  '/gifts/black_tiger.svg',   'legendary', 'legendary', 7800, 71),
  ('الفهد الأسود',     70000,  '/gifts/black_panther.svg', 'legendary', 'legendary', 8000, 72),
  ('الذئب الأسود',     80000,  '/gifts/black_wolf.svg',    'legendary', 'legendary', 8200, 73),
  ('النسر الأسود',     90000,  '/gifts/black_eagle.svg',   'legendary', 'legendary', 8500, 74),
  ('الثور الأسود',     120000, '/gifts/black_bull.svg',    'mythic',    'mythic',    9000, 75),
  ('التنين الأسود',    180000, '/gifts/black_dragon.svg',  'mythic',    'mythic',    9500, 76),
  ('العنقاء السوداء',  250000, '/gifts/black_phoenix.svg', 'mythic',    'mythic',    9800, 77)
) AS v(name, price, image_url, tier, category, duration_ms, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.gifts g WHERE g.name = v.name);
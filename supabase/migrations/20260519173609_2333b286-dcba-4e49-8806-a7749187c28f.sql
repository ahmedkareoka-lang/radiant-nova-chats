
INSERT INTO public.gifts (name, price, image_url, tier, category, duration_ms, sort_order, is_active)
SELECT v.name, v.price, v.image_url, v.tier, v.category, v.duration_ms, v.sort_order, true
FROM (VALUES
  ('وردة', 10, '/gifts/rose.svg', 'normal', 'romantic', 3500, 10),
  ('قلب', 20, '/gifts/heart.svg', 'normal', 'romantic', 3500, 11),
  ('مصاصة', 15, '/gifts/lollipop.svg', 'normal', 'fun', 3500, 12),
  ('دب', 30, '/gifts/teddy.svg', 'normal', 'cute', 3500, 13),
  ('كيكة', 50, '/gifts/cake.svg', 'normal', 'fun', 3500, 14),
  ('آيس كريم', 25, '/gifts/icecream.svg', 'normal', 'fun', 3500, 15),
  ('بالون', 5, '/gifts/balloon.svg', 'normal', 'fun', 3000, 16),
  ('عطر', 80, '/gifts/perfume.svg', 'normal', 'luxury', 3500, 17),
  ('خاتم', 200, '/gifts/ring.svg', 'rare', 'luxury', 4500, 20),
  ('تاج', 500, '/gifts/crown.svg', 'rare', 'luxury', 4500, 21),
  ('سيارة رياضية', 800, '/gifts/sportscar.svg', 'rare', 'luxury', 4500, 22),
  ('قلعة', 2000, '/gifts/castle.svg', 'epic', 'epic', 5500, 30),
  ('تنين', 3000, '/gifts/dragon.svg', 'epic', 'epic', 5500, 31),
  ('العنقاء', 5000, '/gifts/phoenix.svg', 'epic', 'epic', 6000, 32),
  ('مجرة', 4000, '/gifts/galaxy.svg', 'epic', 'epic', 6000, 33),
  ('سيارة فاخرة', 15000, '/gifts/supercar.svg', 'legendary', 'legendary', 7000, 40),
  ('يخت', 20000, '/gifts/yacht.svg', 'legendary', 'legendary', 7000, 41),
  ('قصر', 30000, '/gifts/mansion.svg', 'legendary', 'legendary', 7500, 42),
  ('صاروخ', 25000, '/gifts/rocket.svg', 'legendary', 'legendary', 7000, 43),
  ('يونيكورن', 12000, '/gifts/unicorn.svg', 'legendary', 'legendary', 7000, 44),
  ('ألماسة NOVA', 50000, '/gifts/nova_diamond.svg', 'mythic', 'mythic', 8500, 50),
  ('العرش الذهبي', 80000, '/gifts/gold_throne.svg', 'mythic', 'mythic', 9000, 51),
  ('انفجار نجم', 100000, '/gifts/supernova.svg', 'mythic', 'mythic', 9500, 52),
  ('الحب الأبدي', 60000, '/gifts/eternal_love.svg', 'mythic', 'mythic', 9000, 53),
  ('تاج BOSS', 200000, '/gifts/boss_crown.svg', 'mythic', 'mythic', 9500, 54)
) AS v(name, price, image_url, tier, category, duration_ms, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.gifts g WHERE g.name = v.name);

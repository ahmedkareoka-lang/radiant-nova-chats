
# خطة التطوير الشاملة

## 1) حذف نظام NOVA P بالكامل
- **قاعدة البيانات (migration)**:
  - حذف الأعمدة من `profiles`: `nova_p_level`, `nova_p_expiry`, `nova_p_total_gold` (وأي مرتبطة)
  - حذف جدول `nova_p_monthly_history`
  - حذف عناصر NOVA P من جدول `store_items` و `inventory` (frame-purple-wings, frame-royal-crown, frame-ice, frame-fire, frame-rainbow, frame-dragon)
  - حذف أي triggers/functions خاصة بـ NOVA P
- **الكود**:
  - حذف الملفات: `src/lib/novaAssets.ts`, `src/lib/novaEntranceSounds.ts`, `src/components/NovaDashboard.tsx`, `src/pages/NovaPPage.tsx`, `src/components/NovaCup.tsx`
  - إزالة route `/nova-p` من `App.tsx`
  - إزالة أي زر أو رابط أو شارة NOVA P من: `Profile.tsx`, `StorePage.tsx`, `BottomNav.tsx`, `WalletPage.tsx`, الإطارات
  - تنظيف `frameConfig.ts` من إطارات NOVA P
  - حذف استخدام `playNovaEntranceSound` في `CustomEntranceEffect.tsx`

## 2) شارة VIP ثابتة جديدة بألوان متدرجة
- إنشاء `VipStaticBadge.tsx` يعرض "VIP1" → "VIP7" نصاً واضحاً
- 7 ألوان متدرجة في الفخامة (من الفيرس → البنفسجي → الذهبي → الأحمر → الوردي → الأصفر → الأبيض الكوني)
- وهج ثابت متعدد الطبقات (بدون أنيميشن متحرك يستهلك أداء) — تأثيرات shadow + gradient + rim
- استخدامها في: `Profile`, `UserProfile`, `MessageItem`, `RoomUserProfileCard`, قوائم الغرف
- استبدال `VipBadge` و `VipTierBadge` القديمة بالواجهة الجديدة

## 3) تلميحات (tooltips) على كل الشارات
- لف كل شارة بـ shadcn `Tooltip`:
  - VipStaticBadge → "VIP 3 — ظل التنين — وصف..."
  - BDBadge → "وكيل تطوير الأعمال"
  - AgentBadge → "وكيل وكالة"
  - HostBadge → "مضيف غرفة"
  - RechargeAgentBadge → "وكيل شحن معتمد"
  - LoveBadge → نوع العلاقة + الشريك

## 4) منشورات في صفحة البروفايل + تعليقات + فلترة
- **قاعدة البيانات**:
  - جدول `post_comments` جديد (post_id, user_id, content, created_at) مع RLS + GRANT
  - جدول `post_reports` (post_id, reporter_id, reason, status) للإبلاغ اليدوي عن الصور
  - تأكد من وجود `is_hidden` على `posts` للأدمن
- **فلترة الكلمات**:
  - ملف `src/lib/contentFilter.ts` يحتوي قائمة بكلمات عربية/إنجليزية مسيئة + دالة `containsProfanity()`
  - فلترة المنشور قبل النشر وعرض رسالة "المحتوى يحتوي على كلمات غير لائقة"
  - زر "إبلاغ" على كل منشور به صورة
- **الواجهة**:
  - تبويب "المنشورات" في `Profile.tsx` و `UserProfile.tsx` يجلب من `posts` حيث user_id
  - مكوّن `PostCard.tsx` يعرض المنشور + الإعجابات + التعليقات (قابل للطي) + حقل إضافة تعليق

## 5) خلفية الغرفة من الداخل (للمالك فقط)
- زر "تغيير الخلفية" داخل `VoiceRoom.tsx` يفتح modal رفع صورة (للمالك فقط)
- رفع الصورة إلى Storage bucket `room-backgrounds` (عام)
- تحديث `rooms.background_url` (يضاف إذا لم يكن موجوداً)
- `VoiceRoomBackdrop.tsx` يستخدم `background_url` إذا كانت موجودة

## 6) صورة بروفايل الغرفة من شاشة الإعدادات
- في نفس مكان "تغيير الاسم" داخل الغرفة، يضاف زر "تغيير صورة الغرفة"
- يرفع الصورة لـ `room-avatars` bucket (موجود أو نضيفه)
- تحديث `rooms.avatar_url`
- `RoomCard.tsx` في الصفحة الرئيسية يعرض `avatar_url` (موجود فعلياً غالباً)

## التفاصيل التقنية
- ترتيب التنفيذ: migration أولاً (حذف NOVA P + جدول التعليقات + التقارير + bucket الخلفيات) → ثم حذف الكود → ثم بناء VIP الجديد → ثم التلميحات → ثم البروفايل/المنشورات → ثم الغرفة
- نستخدم shadcn `Tooltip` و `Dialog` و `Textarea` الموجودة
- نستخدم Lovable Cloud Storage للصور
- لن نلمس: نظام VIP في `vipConfig.ts` (سيبقى للأسماء والإطارات والأصوات السبعة)، نظام الوكالات، نظام BOSS، نظام Love، الألعاب

## ملاحظة مهمة
هذه خطة كبيرة — سأنفّذها على دفعات وأبلّغك بعد كل دفعة لتختبر قبل المتابعة. هل أبدأ بالدفعة الأولى (حذف NOVA P + migration التعليقات/الإبلاغ)؟

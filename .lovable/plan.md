## الهدف
عند شراء ID مميز: يحل محل الـ UID الأصلي في كل العرض والبحث، وعند انتهاء المدة يرجع الـ UID القديم تلقائيًا.

## التغييرات

### 1) قاعدة البيانات (migration)
- التأكد أن `profiles.vanity_id` و `vanity_id_expiry` موجودان (موجودان من قبل).
- تحديث دالة `purchase_vanity_id` لتخزين الـ ID المميز فقط (الـ UID الأصلي يبقى كما هو في `id` لكن لا يُعرض).
- دالة جديدة `get_active_vanity(profile_row)` أو view بسيط يرجع `display_uid` = `vanity_id` لو لسه فعال، وإلا الـ UID الأصلي/الرقمي الحالي.
- دالة بحث `search_users_by_id(_query)` تبحث في:
  - `vanity_id` (لو `expiry > now()`)
  - الـ UID الرقمي الأصلي (الـ short id الحالي المستخدم في البحث).
  ترجع الـ profile مع `display_uid` المناسب.
- Cron job (pg_cron) كل ساعة ينظف `vanity_id` و `vanity_id_expiry` للسجلات المنتهية → تلقائيًا يرجع الـ UID القديم للظهور.

### 2) الواجهة (Frontend)
- `Profile.tsx` و `UserProfile.tsx`: لو فيه `vanity_id` فعال → اعرض `VanityIdPill` فقط بدل الـ UID الأصلي (إخفاء سطر الـ ID العادي).
- `SearchPage.tsx`: استخدام الدالة الجديدة `search_users_by_id` بحيث البحث بالـ 4 أرقام يلاقي صاحب الـ vanity ID.
- `RoomUserProfileCard.tsx` و أي مكان آخر يعرض الـ UID: نفس المنطق (vanity أولًا، fallback للأصلي).
- Helper صغير `getDisplayUid(profile)` في `src/lib/utils.ts` لتوحيد المنطق.
- على client side: فلتر إضافي يخفي vanity المنتهي (في حال الـ cron لم يشتغل بعد).

### 3) السلوك عند الانتهاء
- الـ cron ينظف الحقول → البحث القديم بالأرقام المميزة يفشل، والـ UID الأصلي يعود للظهور تلقائيًا في البروفايل وكل الواجهات.
- الـ UID الأصلي لم يُحذف أبدًا (مخزن في `profiles.id` / الـ short uid)، فالاسترجاع فوري.

## الملفات المتأثرة
- migration جديد (تحديث RPC + إضافة `search_users_by_id` + cron)
- `src/lib/utils.ts` (إضافة `getDisplayUid`)
- `src/pages/Profile.tsx`, `src/pages/UserProfile.tsx`
- `src/pages/SearchPage.tsx`
- `src/components/RoomUserProfileCard.tsx` (وأي UID آخر ظاهر)

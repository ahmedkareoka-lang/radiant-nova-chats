export type Locale = "ar" | "en";

const translations = {
  // Auth
  "auth.login": { ar: "تسجيل الدخول", en: "Login" },
  "auth.signup": { ar: "إنشاء حساب", en: "Sign Up" },
  "auth.email": { ar: "البريد الإلكتروني", en: "Email" },
  "auth.phone": { ar: "الهاتف", en: "Phone" },
  "auth.password": { ar: "كلمة المرور", en: "Password" },
  "auth.name": { ar: "الاسم", en: "Name" },
  "auth.male": { ar: "ذكر", en: "Male" },
  "auth.female": { ar: "أنثى", en: "Female" },
  "auth.loading": { ar: "جارٍ...", en: "Loading..." },
  "auth.login_btn": { ar: "تسجيل الدخول", en: "Log In" },
  "auth.signup_btn": { ar: "إنشاء حساب", en: "Create Account" },
  "auth.signup_success": { ar: "تم التسجيل بنجاح! تحقق من بريدك.", en: "Signed up! Check your email." },
  "auth.error": { ar: "حدث خطأ", en: "An error occurred" },
  "auth.otp_sent": { ar: "تم إرسال رمز التحقق", en: "OTP sent" },
  "auth.otp_placeholder": { ar: "أدخل رمز التحقق", en: "Enter OTP code" },
  "auth.verify_otp": { ar: "تحقق", en: "Verify" },
  "auth.use_otp": { ar: "تسجيل برمز OTP", en: "Login with OTP" },
  "auth.use_password": { ar: "تسجيل بكلمة المرور", en: "Login with Password" },

  // Navigation
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.chat": { ar: "المحادثات", en: "Chat" },
  "nav.search": { ar: "البحث", en: "Search" },
  "nav.profile": { ar: "حسابي", en: "Profile" },
  "nav.store": { ar: "المتجر", en: "Store" },
  "nav.notifications": { ar: "الإشعارات", en: "Notifications" },
  "nav.wallet": { ar: "المحفظة", en: "Wallet" },
  "nav.inventory": { ar: "الحقيبة", en: "Inventory" },
  "nav.leaderboard": { ar: "المتصدرين", en: "Leaderboard" },
  "nav.daily_tasks": { ar: "المهام اليومية", en: "Daily Tasks" },
  "nav.games": { ar: "الألعاب", en: "Games" },
  "nav.agencies": { ar: "الوكالات", en: "Agencies" },

  // Store
  "store.title": { ar: "المتجر", en: "Store" },
  "store.frames": { ar: "الإطارات", en: "Frames" },
  "store.gifts": { ar: "الهدايا", en: "Gifts" },
  "store.entrances": { ar: "الدخوليات", en: "Entrances" },
  "store.badges": { ar: "الشارات", en: "Badges" },
  "store.all": { ar: "الكل", en: "All" },
  "store.buy": { ar: "شراء", en: "Buy" },
  "store.owned": { ar: "مملوك", en: "Owned" },
  "store.equip": { ar: "تجهيز", en: "Equip" },
  "store.unequip": { ar: "خلع", en: "Unequip" },
  "store.balance": { ar: "الرصيد", en: "Balance" },
  "store.topup": { ar: "شحن", en: "Top Up" },
  "store.price": { ar: "السعر", en: "Price" },
  "store.buy_success": { ar: "تم الشراء بنجاح!", en: "Purchase successful!" },
  "store.insufficient": { ar: "رصيدك غير كافٍ!", en: "Insufficient balance!" },

  // Rooms
  "room.enter": { ar: "✨ دخل الغرفة ✨", en: "✨ Entered the room ✨" },
  "room.mic_taken": { ar: "هذا المايك مشغول", en: "Mic is occupied" },
  "room.mic_locked": { ar: "هذا المايك مقفل 🔒", en: "Mic is locked 🔒" },
  "room.sat_on_mic": { ar: "جلست على المايك", en: "Sat on mic" },
  "room.left_mic": { ar: "نزلت من المايك", en: "Left the mic" },
  "room.send_msg": { ar: "اكتب رسالة...", en: "Type a message..." },
  "room.settings": { ar: "الإعدادات", en: "Settings" },
  "room.theme_changed": { ar: "تم تغيير خلفية الغرفة ✨", en: "Room theme changed ✨" },
  "room.create": { ar: "إنشاء غرفة", en: "Create Room" },
  "room.mics": { ar: "المايكات", en: "Mics" },

  // Gifts
  "gift.title": { ar: "🎁 الهدايا", en: "🎁 Gifts" },
  "gift.send": { ar: "إرسال الهدية", en: "Send Gift" },
  "gift.multi": { ar: "إرسال جماعي", en: "Multi Send" },
  "gift.select_recipient": { ar: "اختر المستلمين", en: "Select Recipients" },
  "gift.select_all": { ar: "تحديد الكل", en: "Select All" },
  "gift.deselect_all": { ar: "إلغاء الكل", en: "Deselect All" },
  "gift.count": { ar: "العدد", en: "Count" },
  "gift.total": { ar: "الإجمالي", en: "Total" },
  "gift.sending": { ar: "جارٍ الإرسال...", en: "Sending..." },
  "gift.insufficient": { ar: "رصيد غير كافٍ", en: "Insufficient balance" },
  "gift.select_both": { ar: "اختر شخصاً وهدية", en: "Select person & gift" },
  "gift.sent_success": { ar: "تم إرسال الهدية! 🎁", en: "Gift sent! 🎁" },
  "gift.new_gift": { ar: "هدية جديدة! 🎁", en: "New gift! 🎁" },

  // Notifications
  "notif.title": { ar: "الإشعارات", en: "Notifications" },
  "notif.empty": { ar: "لا توجد إشعارات", en: "No notifications" },
  "notif.gift_received": { ar: "حصلت على هدية!", en: "You received a gift!" },
  "notif.agency_accepted": { ar: "تم قبول طلب الوكالة", en: "Agency request accepted" },
  "notif.agency_rejected": { ar: "تم رفض طلب الوكالة", en: "Agency request rejected" },
  "notif.vip_activated": { ar: "تم تفعيل VIP!", en: "VIP activated!" },

  // General
  "general.save": { ar: "حفظ", en: "Save" },
  "general.cancel": { ar: "إلغاء", en: "Cancel" },
  "general.close": { ar: "إغلاق", en: "Close" },
  "general.confirm": { ar: "تأكيد", en: "Confirm" },
  "general.loading": { ar: "جارٍ التحميل...", en: "Loading..." },
  "general.error": { ar: "حدث خطأ", en: "Error" },
  "general.success": { ar: "تم بنجاح", en: "Success" },
  "general.language": { ar: "English", en: "العربية" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale = "ar"): string {
  return translations[key]?.[locale] || key;
}

export default translations;

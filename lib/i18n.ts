// Tiny client-side i18n. No deps. Stores choice in localStorage + cookie so
// the server can render the right language on first paint.

export type Lang = 'en' | 'hi';

export const STRINGS = {
  en: {
    tagline: 'Casual promises, made to stick.',
    hero1: 'The friction-free way to',
    heroAccent: 'lock in a promise',
    heroSub: 'Pinky-swear with a calendar reminder, or upgrade to a court-acceptable Aadhaar-eSigned contract.',
    pinkyTitle: 'Pinky Promise',
    pinkyPill: 'Free · Instant · No signup',
    pinkyB1: '✓ Type promise → get a link',
    pinkyB2: '✓ WhatsApp it to them',
    pinkyB3: '✓ Auto calendar reminder on both phones',
    pinkyB4: '✓ One-tap UPI repay button',
    pinkyB5: '✓ Zero accounts, zero database',
    pinkyFoot: 'Not legally binding — for friends, flatmates, family.',
    pinkyCta: 'Make a pinky promise →',
    proTitle: 'Official Contract',
    proPill: 'Court-acceptable · Demo eSign live',
    proB1: '✓ Aadhaar-eSigned (UIDAI verified)',
    proB2: '✓ Tamper-proof audit trail',
    proB3: '✓ Legal under IT Act § 5',
    proB4: '✓ Pre-built templates (loan, expense, service)',
    proB5: '✓ Optional UPI auto-debit on due date',
    proFoot: 'Demo eSign available now. Production launching soon.',
    proCta: 'Draft a contract →',
    wallLabel: 'Promise Wall',
    wallSub: 'shakes on the public wall',
    waitlistLabel: 'eSign Waitlist',
    waitlistSub: 'contracts drafted, awaiting Aadhaar launch',
    footer: 'No accounts needed for pinky promises. Your promise lives in the link itself.',
    login: 'Log in',
    logout: 'Log out',
    myDrafts: 'My drafts',
    backHome: '← Back to home',
  },
  hi: {
    tagline: 'पक्के वादे, बस एक लिंक में।',
    hero1: 'वादा निभाने का सबसे आसान तरीका',
    heroAccent: 'अब डिजिटल',
    heroSub: 'दोस्ती की पिंकी प्रॉमिस से लेकर अदालत में मान्य आधार-ई-साइन कॉन्ट्रैक्ट तक।',
    pinkyTitle: 'पिंकी प्रॉमिस',
    pinkyPill: 'मुफ़्त · तुरंत · बिना साइनअप',
    pinkyB1: '✓ वादा लिखें → लिंक पाएं',
    pinkyB2: '✓ WhatsApp पर भेजें',
    pinkyB3: '✓ दोनों के कैलेंडर में रिमाइंडर',
    pinkyB4: '✓ एक टैप में UPI से पेमेंट',
    pinkyB5: '✓ कोई अकाउंट या डेटाबेस नहीं',
    pinkyFoot: 'कानूनी मान्य नहीं — दोस्तों, रूममेट्स, परिवार के लिए।',
    pinkyCta: 'पिंकी प्रॉमिस बनाएं →',
    proTitle: 'आधिकारिक कॉन्ट्रैक्ट',
    proPill: 'अदालत में मान्य · डेमो ई-साइन उपलब्ध',
    proB1: '✓ आधार-ई-साइन (UIDAI सत्यापित)',
    proB2: '✓ छेड़छाड़-मुक्त ऑडिट ट्रेल',
    proB3: '✓ IT एक्ट § 5 के तहत वैध',
    proB4: '✓ तैयार टेम्पलेट (लोन, खर्च, सेवा)',
    proB5: '✓ देय तारीख़ पर UPI ऑटो-डेबिट',
    proFoot: 'डेमो ई-साइन अभी उपलब्ध। प्रोडक्शन जल्द आ रहा है।',
    proCta: 'कॉन्ट्रैक्ट बनाएं →',
    wallLabel: 'प्रॉमिस वॉल',
    wallSub: 'सार्वजनिक वादे',
    waitlistLabel: 'ई-साइन वेटलिस्ट',
    waitlistSub: 'तैयार कॉन्ट्रैक्ट्स',
    footer: 'पिंकी प्रॉमिस के लिए कोई अकाउंट नहीं चाहिए। आपका वादा लिंक में ही है।',
    login: 'लॉगिन',
    logout: 'लॉगआउट',
    myDrafts: 'मेरे ड्राफ्ट',
    backHome: '← होम पर वापस',
  },
} as const;

export type StringKey = keyof typeof STRINGS['en'];

export function t(lang: Lang, key: StringKey): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

export function isLang(x: string | undefined): x is Lang {
  return x === 'en' || x === 'hi';
}

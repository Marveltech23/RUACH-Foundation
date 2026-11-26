/* ══════════════════════════════════════════════════════════════════════════
   RUACH Foundation — Supabase & Payment Configuration
   ──────────────────────────────────────────────────────────────────────────
   HOW TO CONNECT:
   1. Open your Supabase project → Settings → API
   2. Replace SUPABASE_URL with your Project URL (https://xxxxx.supabase.co)
   3. Replace SUPABASE_ANON_KEY with your "anon / public" key
   4. (Optional) Replace PAYSTACK_PUBLIC_KEY with your Paystack public key
      (pk_test_... or pk_live_...) to accept live Naira card/bank donations.
   ══════════════════════════════════════════════════════════════════════════ */

window.RUACH_CONFIG = {
  SUPABASE_URL: 'https://nnobjhnzakpscsejmxbu.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_ne9NbztuALA5l00ATGr9BQ_rgYtuqDA',
  STORAGE_BUCKET: 'ruach-media',
  ADMIN_INVITE_CODE: 'RUACH-ADMIN-2026', // Change this or disable public signups in Supabase after creating your admin account
  PAYSTACK_PUBLIC_KEY: '', // e.g. 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx'
  BANK_TRANSFER_DETAILS: {
    bankName: 'RUACH Foundation Official Account',
    accountName: 'RUACH Foundation for Capacity Building',
    accountNumber: 'Contact info@ruachfoundation.org for transfer details'
  }
};

window.isSupabaseConfigured = function () {
  const cfg = window.RUACH_CONFIG || {};
  return Boolean(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes('YOUR_SUPABASE_URL') &&
    !cfg.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
  );
};

window.getSupabaseClient = function () {
  if (!window.isSupabaseConfigured()) return null;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('Supabase JS SDK not loaded.');
    return null;
  }
  if (!window.__ruachSupabaseClient) {
    window.__ruachSupabaseClient = window.supabase.createClient(
      window.RUACH_CONFIG.SUPABASE_URL,
      window.RUACH_CONFIG.SUPABASE_ANON_KEY
    );
  }
  return window.__ruachSupabaseClient;
};

/* Fallback articles so the frontend blog & article reader remain readable
   even before Supabase is connected or before the first post is published. */
window.RUACH_FALLBACK_BLOGS = [
  {
    slug: 'why-africas-leadership-crisis-is-a-character-crisis',
    category: 'Leadership',
    title: "Why Africa's Leadership Crisis Is Actually a Character Crisis — And How We Intend to Fix It",
    excerpt: "The conversation around African development has long centered on resources, governance, and infrastructure. But at RUACH, we believe the deepest deficit is one of formed character. Here's our perspective on why — and what we're doing about it.",
    author: 'Mrs. Nnasha Michael-Ihunde',
    published_at: '2025-06-15T09:00:00Z',
    featured_image_url: 'images/blog1.png',
    content: [
      "Across Africa, conversations about national transformation almost always begin with policy, funding, or infrastructure. Yet history repeatedly teaches a harder truth: systems only rise to the level of the people who steward them.",
      "When competence is divorced from character, talent becomes dangerous and influence becomes self-serving. At RUACH Foundation for Capacity Building, we have observed that the deepest deficit in our institutions is not intelligence or ambition—it is formed character.",
      "Building capacity from the inside out means investing in identity, integrity, emotional intelligence, humility, and servant leadership before handing someone a platform. Just as a building's hidden foundation determines whether it survives the storm, a leader's unseen character determines whether their impact endures.",
      "Through The RUACH Journey—Restoring Identity, Unlocking Potential, Activating Purpose, Cultivating Character, and Harnessing Influence—we are raising leaders across Nigeria who are prepared not only for success, but for significance."
    ].join('\n\n')
  },
  {
    slug: 'the-queen-esther-effect',
    category: 'Women Development',
    title: 'The Queen Esther Effect: What Happens When Women Own Their Power',
    excerpt: "Inside the results of our flagship finishing school — and why polished women are Africa's most underutilized leadership resource.",
    author: 'RUACH Editorial',
    published_at: '2025-05-20T09:00:00Z',
    featured_image_url: 'images/queenesther blog.png',
    content: [
      "Inspired by Queen Esther's journey of preparation before promotion, the Queen Esther Finishing School was created to equip individuals with the inner grounding and outward excellence required to thrive in every sphere of life.",
      "Over three progressive four-week certificate tracks—Royal Identity, Royal Excellence, and Royal Influence—participants confront self-doubt, refine their communication and etiquette, strengthen emotional resilience, and step boldly into leadership.",
      "The results speak for themselves: graduates walking into boardrooms, public offices, universities, and families with calm authority, dignity, and clarity of purpose.",
      "When individuals own their worth and pair it with disciplined character, they do not merely occupy rooms—they elevate them."
    ].join('\n\n')
  },
  {
    slug: 'raising-builders-not-just-workers-rcah',
    category: 'Youth Empowerment',
    title: 'Raising Builders, Not Just Workers: The Philosophy Behind R-CAH',
    excerpt: "RUACH's capacity hub is not a training center — it's a formation ecosystem. Here's the thinking that makes it different.",
    author: 'R-CAH Team',
    published_at: '2025-04-12T09:00:00Z',
    featured_image_url: 'images/blog3.png',
    content: [
      "Traditional youth programs often stop at teaching technical skills or handing out certificates. While skills open doors, they rarely sustain people once they step inside.",
      "The RUACH Capacity & Advancement Hub (R-CAH) was designed differently. Serving emerging leaders aged 18 to 35, R-CAH combines practical vocational and entrepreneurial training with mentorship, ethical formation, and community accountability.",
      "We are not merely preparing young people to wait for opportunities—we are equipping builders who can design solutions, lead teams with integrity, and strengthen the communities around them.",
      "When young people discover who they are and how to steward their gifts, unemployment gives way to innovation, and survival gives way to legacy."
    ].join('\n\n')
  }
];

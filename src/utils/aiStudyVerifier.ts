/**
 * Zero-Noise AI Study Verifier & Semantic Video Classifier
 * 
 * 100% offline, privacy-first, zero telemetry, zero external network exfiltration.
 * Evaluates video URLs, titles, channels, tags, and descriptions to determine
 * whether content qualifies as distraction-free educational study material
 * or carries high algorithmic distraction / brainrot risk.
 */

export interface VideoAnalysisInput {
  urlOrId: string;
  title?: string;
  channel?: string;
  tags?: string[];
  description?: string;
}

export interface ZeroTubeCustomVideo {
  id: string; // YouTube 11-char ID
  url: string;
  title: string;
  channel: string;
  category: string;
  duration?: string;
  tags: string[];
  description?: string;
  aiStudyScore: number; // 0 to 100
  aiVerdict: 'verified_productive' | 'caution_entertainment' | 'high_distraction_risk';
  domainCategory: string;
  detectedExam?: string;
  aiRationale: string;
  addedAt: number;
}

export interface AiStudyVerificationResult {
  isValidId: boolean;
  videoId: string;
  isShort: boolean;
  studyScore: number; // 0 to 100
  verdict: 'verified_productive' | 'caution_entertainment' | 'high_distraction_risk';
  domainCategory: string;
  detectedExam?: string;
  confidenceLevel: 'High' | 'Medium' | 'Estimated';
  recommendedTags: string[];
  rationale: string;
  academicMarkersFound: string[];
  distractionFlags: string[];
}

export const STORAGE_KEY_CUSTOM_ZEROTUBE = 'zero_tube_custom_videos_v1';
export const STORAGE_KEY_USER_TRUSTED_CHANNELS = 'zero_tube_trusted_channels_v1';

export interface StandardizedExamDef {
  badge: string;
  examName: string;
  category: string;
  patterns: RegExp[];
}

export const STANDARDIZED_EXAMS: StandardizedExamDef[] = [
  {
    badge: 'IMU-CET',
    examName: 'IMU CET (Indian Maritime University / Merchant Navy)',
    category: 'Maritime, Nautical Science & Merchant Navy',
    patterns: [/\bimu[- ]?cet\b/i, /\bimucet\b/i, /\bmerchant navy entrance\b/i, /\bdns sponsorship\b/i],
  },
  {
    badge: 'JEE (Main & Adv)',
    examName: 'IIT JEE (Mains & Advanced)',
    category: 'Competitive & Civil Services Exams',
    patterns: [/\bjee\b/i, /\biit[- ]?jee\b/i, /\bjee[- ]?mains?\b/i, /\bjee[- ]?adv(?:anced)?\b/i],
  },
  {
    badge: 'NEET',
    examName: 'NEET (National Eligibility Entrance Test - Medical)',
    category: 'Medicine, Biology & Chemistry',
    patterns: [/\bneet\b/i, /\bneet[- ]?ug\b/i, /\bneet[- ]?pg\b/i, /\baiims\b/i],
  },
  {
    badge: 'SAT',
    examName: 'SAT (Scholastic Assessment Test / College Board)',
    category: 'Mathematics & Physics',
    patterns: [/\bsat\b/i, /\bsat math\b/i, /\bsat digital\b/i, /\bdigital sat\b/i, /\bsat reading\b/i],
  },
  {
    badge: 'ACT / AP',
    examName: 'ACT / Advanced Placement Exams',
    category: 'Mathematics & Physics',
    patterns: [/\bact test\b/i, /\bap calculus\b/i, /\bap physics\b/i, /\bap chemistry\b/i, /\bap computer science\b/i],
  },
  {
    badge: 'UPSC CSE',
    examName: 'UPSC Civil Services (IAS / IPS / IFS)',
    category: 'Competitive & Civil Services Exams',
    patterns: [/\bupsc\b/i, /\bias\b/i, /\bips\b/i, /\bcivil services\b/i, /\bprelims\b/i, /\bmains\b/i, /\bcsat\b/i],
  },
  {
    badge: 'GATE',
    examName: 'GATE (Graduate Aptitude Test in Engineering)',
    category: 'Computer Science & Software',
    patterns: [/\bgate\b/i, /\bgate cse\b/i, /\bgate ece\b/i, /\bgate mechanical\b/i],
  },
  {
    badge: 'NDA / CDS',
    examName: 'National Defence Academy / Combined Defence Services',
    category: 'Competitive & Civil Services Exams',
    patterns: [/\bnda\b/i, /\bcds\b/i, /\bafcat\b/i, /\bssb interview\b/i],
  },
  {
    badge: 'CAT / MBA',
    examName: 'CAT / MBA Entrance (IIMs)',
    category: 'Philosophy, History & Economics',
    patterns: [/\bcat exam\b/i, /\biim cat\b/i, /\bquant for cat\b/i, /\bdilr\b/i],
  },
  {
    badge: 'GRE / GMAT',
    examName: 'GRE / GMAT Graduate Examinations',
    category: 'Mathematics & Physics',
    patterns: [/\bgre\b/i, /\bgmat\b/i, /\bgre quant\b/i, /\bgre verbal\b/i],
  },
  {
    badge: 'IELTS / TOEFL',
    examName: 'IELTS / TOEFL English Proficiency',
    category: 'Languages & Communication',
    patterns: [/\bielts\b/i, /\btoefl\b/i, /\bielts listening\b/i, /\bielts speaking\b/i, /\bielts band\b/i],
  },
  {
    badge: 'SSC / Banking',
    examName: 'SSC CGL / Banking PO Exams',
    category: 'Competitive & Civil Services Exams',
    patterns: [/\bssc cgl\b/i, /\bssc chsl\b/i, /\bibps\b/i, /\bsbi po\b/i, /\brrb ntpc\b/i],
  },
  {
    badge: 'CUET / CLAT',
    examName: 'CUET / CLAT Entrance Exams',
    category: 'Competitive & Civil Services Exams',
    patterns: [/\bcuet\b/i, /\bcuet ug\b/i, /\bclat\b/i],
  },
];

// Academic / Educational keywords mapped to Domain Categories
const ACADEMIC_DOMAINS: Record<string, string[]> = {
  'Computer Science & Software': [
    'algorithm', 'algorithms', 'data structure', 'python', 'typescript', 'javascript',
    'rust', 'c++', 'java', 'golang', 'coding', 'programming', 'web development',
    'react', 'next.js', 'vue', 'node.js', 'git', 'linux', 'docker', 'kubernetes',
    'database', 'sql', 'postgresql', 'mongodb', 'api', 'devops', 'backend',
    'frontend', 'fullstack', 'compiler', 'machine learning', 'deep learning',
    'artificial intelligence', 'ai', 'pytorch', 'tensorflow', 'neural network',
    'micrograd', 'cs50', 'leetcode', 'neetcode', 'system design', 'cybersecurity',
    'cryptography', 'distributed systems', 'operating system', 'kernel', 'debugging',
    'dsa', 'competitive programming', 'cloud computing', 'aws', 'web3', 'solidity'
  ],
  'Maritime, Nautical Science & Merchant Navy': [
    'merchant navy', 'paramount merchant navy', 'imu cet', 'imu-cet', 'nautical science',
    'marine engineering', 'dns', 'seamanship', 'navigation', 'ship stability', 'stcw',
    'deck cadet', 'engine cadet', 'dg shipping', 'colregs', 'maritime', 'celestial navigation',
    'chart work', 'naval architecture', 'gp rating', 'sponsorship test', 'gmdss',
    'marine diesel', 'ship construction', 'radar plotting', 'bridge watchkeeping',
    'marine propulsion', 'cargo handling', 'marpol', 'solas', 'maritime law',
    'anglo eastern', 'synergy marine', 'fleet management', 'great eastern'
  ],
  'Competitive & Civil Services Exams': [
    'upsc', 'ias', 'ips', 'cse', 'prelims', 'mains', 'csat', 'jee', 'jee mains',
    'jee advanced', 'iit jee', 'neet', 'neet pg', 'gate', 'nda', 'cds', 'afcat',
    'ssc', 'ssc cgl', 'cat exam', 'ca foundation', 'ncert', 'cbse', 'icse',
    'current affairs', 'general studies', 'gs paper'
  ],
  'Mathematics & Physics': [
    'calculus', 'linear algebra', 'discrete math', 'statistics', 'probability',
    'differential equations', 'geometry', 'trigonometry', 'algebra', 'quantum physics',
    'thermodynamics', 'mechanics', 'relativity', 'astrophysics', 'fluid dynamics',
    'electromagnetism', 'number theory', 'topology', 'matrix', 'vectors', 'derivatives',
    'integrals', 'complex numbers', 'proof', 'theorem'
  ],
  'Medicine, Biology & Chemistry': [
    'biology', 'chemistry', 'organic chemistry', 'biochemistry', 'genetics',
    'anatomy', 'neuroscience', 'physiology', 'immunology', 'pharmacology',
    'microbiology', 'cell biology', 'molecular biology', 'pathology', 'medicine',
    'dna', 'rna', 'crispr', 'metabolism', 'enzymes'
  ],
  'Deep Work, Focus & Cognitive Science': [
    'deep work', 'focus', 'flow state', 'pomodoro', 'study with me',
    'huberman', 'cal newport', 'memorization', 'spaced repetition', 'anki',
    'cognitive science', 'neuroscience of focus', 'attention span', 'productivity',
    'atomic habits', 'time blocking', 'executive function', 'dopamine detox'
  ],
  'Languages & Communication': [
    'grammar', 'vocabulary', 'pronunciation', 'ielts', 'toefl', 'linguistics',
    'spanish', 'french', 'german', 'japanese', 'mandarin', 'korean', 'latin',
    'fluency', 'polyglot', 'comprehension', 'language learning'
  ],
  'Philosophy, History & Economics': [
    'philosophy', 'stoicism', 'marcus aurelius', 'epictetus', 'seneca', 'plato',
    'aristotle', 'kant', 'nietzsche', 'ethics', 'logic', 'world history',
    'ancient history', 'civilization', 'economics', 'macroeconomics', 'microeconomics',
    'finance', 'investing', 'accounting', 'sociology', 'anthropology'
  ],
};

// Known high-trust academic channels (auto bonus)
const TRUSTED_ACADEMIC_CHANNELS = new Set([
  // Global Academic & Computer Science
  'freecodecamp.org',
  'freecodecamp',
  '3blue1brown',
  'cs50',
  'andrej karpathy',
  'andrew huberman',
  'huberman lab',
  'mit opencourseware',
  'khan academy',
  'stanford online',
  'harvard university',
  'statquest with josh starmer',
  'fireship',
  'theprimeagen',
  'lex fridman',
  'veritasium',
  'kurzgesagt – in a nutshell',
  'crashcourse',
  'ali abdaal',
  'thomas frank',
  'numberphile',
  'computerphile',
  'sentdex',
  'corey schafer',
  'traversy media',
  'web dev simplified',
  'derek banas',
  'kevin powell',
  'ben awad',
  'geeksforgeeks',
  'edureka',
  'simplilearn',

  // Maritime, Nautical Science & Merchant Navy
  'paramount merchant navy',
  'marine insight',
  'sailor satyam',
  'maritime study',
  'the marine whales',

  // Indian STEM, Engineering, CS & Coding
  'physics wallah',
  'alakh pandey',
  'codewithharry',
  'apna college',
  'take u forward',
  'striver',
  'gate smashers',
  'abdul bari',
  "jenny's lectures",
  'nptel',
  'nptel-nociitm',
  'chai aur code',
  'hitesh choudhary',
  'kunal kushwaha',
  'mohit tyagi',
  'competishun',
  'eduniti',
  'unacademy jee',
  'made easy',

  // Indian Civil Services, Defence & Higher Education
  'drishti ias',
  'studyiq',
  'studyiq ias',
  'khan gs research centre',
  'khan sir',
  'unacademy',
  'vision ias',
  'vedantu',
  'defence wallah',
  'learn with sumit',
  'trishul defence academy',
  'centurion defence academy',
  'ca rachana ranade',
  'neeraj arora',
  'dr najeeb',
]);

// High distraction / algorithmic clickbait / brainrot markers
const DISTRACTION_PATTERNS = [
  'prank',
  'pranked',
  'vlog',
  'daily vlog',
  'reaction',
  'reacts',
  'reacting to',
  'drama',
  'beef',
  'exposed',
  'spilling tea',
  'gossip',
  'cringe',
  'try not to laugh',
  'challenge',
  '$1 vs $',
  '24 hours in',
  'last to leave',
  'mrbeast',
  'pack opening',
  'lootbox',
  'fortnite',
  'gta 5',
  'gta v',
  'roblox',
  'brawl stars',
  'minecraft speedrun',
  'valorant clips',
  'tiktok compilation',
  'shorts',
  'shitpost',
  'meme compilation',
  'unboxing',
  'clothing haul',
  'asmr mukbang',
  'rage quit',
  'fights',
  'stream moments',
  'livestream fails',
];

/**
 * Extracts a valid YouTube 11-char video ID from various URLs or inputs
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // Handle standard URLs or schemeless strings
    const urlString = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlString);

    // youtu.be/ID
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.slice(1).split('?')[0].split('/')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    // youtube.com/watch?v=ID or /shorts/ID or /embed/ID
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtube-nocookie.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      const shortsIdx = pathSegments.indexOf('shorts');
      if (shortsIdx !== -1 && pathSegments[shortsIdx + 1]) {
        const id = pathSegments[shortsIdx + 1].split('?')[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }

      const embedIdx = pathSegments.indexOf('embed');
      if (embedIdx !== -1 && pathSegments[embedIdx + 1]) {
        const id = pathSegments[embedIdx + 1].split('?')[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    // regex fallback
    const match = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i.exec(
      trimmed
    );
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * AI Cognitive Evaluator: Scores and verifies YouTube / Morphe content for study value
 */
export function evaluateVideoForStudy(input: VideoAnalysisInput): AiStudyVerificationResult {
  const extractedId = extractYouTubeVideoId(input.urlOrId) || '';
  const isShort = input.urlOrId.toLowerCase().includes('/shorts/');

  // Combine title, channel, description, and tags for text analysis
  const corpus = [
    input.title || '',
    input.channel || '',
    input.description || '',
    ...(input.tags || []),
    input.urlOrId,
  ]
    .join(' ')
    .toLowerCase();

  let score = 52; // Neutral baseline
  const academicMarkersFound: string[] = [];
  const distractionFlags: string[] = [];
  const domainHits: Record<string, number> = {};

  // 1. Channel Reputation Check (User-Trusted + Known Institutional Channels)
  const channelClean = (input.channel || '').trim().toLowerCase();
  let channelTrusted = false;

  const userTrustedList = getUserTrustedChannels();
  for (const userChannel of userTrustedList) {
    if (userChannel && (channelClean.includes(userChannel) || corpus.includes(userChannel))) {
      score += 28;
      channelTrusted = true;
      academicMarkersFound.push(`User-Trusted Channel (${userChannel})`);
      break;
    }
  }

  if (!channelTrusted) {
    for (const trusted of TRUSTED_ACADEMIC_CHANNELS) {
      if (channelClean.includes(trusted) || corpus.includes(trusted)) {
        score += 28;
        channelTrusted = true;
        academicMarkersFound.push(`Trusted Academic Channel (${trusted})`);
        break;
      }
    }
  }

  let topDomain = 'General Skills & Self-Education';

  // 1b. Specific Standardized Exam Detection (JEE, NEET, IMU-CET, SAT, UPSC, etc.)
  let detectedExam: string | undefined = undefined;
  for (const exam of STANDARDIZED_EXAMS) {
    for (const pat of exam.patterns) {
      if (pat.test(corpus)) {
        detectedExam = exam.badge;
        score += 18; // High-intent curriculum bonus
        academicMarkersFound.push(`Target Exam: ${exam.badge}`);
        topDomain = exam.category;
        break;
      }
    }
    if (detectedExam) break;
  }

  // 2. Domain Categorization & Academic Keyword Matching
  for (const [domain, keywords] of Object.entries(ACADEMIC_DOMAINS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(corpus)) {
        domainHits[domain] = (domainHits[domain] || 0) + 1;
        if (!academicMarkersFound.includes(kw)) {
          academicMarkersFound.push(kw);
          score += 6;
        }
      }
    }
  }

  // Determine top domain if not overridden by explicit exam
  let maxHits = 0;
  for (const [domain, hits] of Object.entries(domainHits)) {
    if (hits > maxHits) {
      maxHits = hits;
      if (!detectedExam) {
        topDomain = domain;
      }
    }
  }

  // 3. Algorithmic Distraction & Clickbait Penalties
  for (const marker of DISTRACTION_PATTERNS) {
    if (corpus.includes(marker)) {
      distractionFlags.push(marker);
      score -= 24;
    }
  }

  // Shorts penalty: Zero-Noise blocks micro-shorts to prevent dopamine loop
  if (isShort) {
    distractionFlags.push('YouTube Shorts format (High Dopamine Loop)');
    score -= 35;
  }

  // Extreme Capitalization / Clickbait check
  const rawTitle = input.title || '';
  if (rawTitle.length > 10) {
    const uppercaseCount = (rawTitle.match(/[A-Z]/g) || []).length;
    const letterCount = (rawTitle.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && uppercaseCount / letterCount > 0.65 && !channelTrusted) {
      distractionFlags.push('Sensationalized clickbait title casing');
      score -= 12;
    }
  }

  // Bound score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Verdict Determination
  let verdict: 'verified_productive' | 'caution_entertainment' | 'high_distraction_risk' =
    'caution_entertainment';
  if (finalScore >= 68 && distractionFlags.length === 0) {
    verdict = 'verified_productive';
  } else if (finalScore < 45 || isShort || distractionFlags.length >= 2) {
    verdict = 'high_distraction_risk';
  }

  // Rationale Formulation
  let rationale = '';
  if (verdict === 'verified_productive') {
    if (detectedExam) {
      rationale = `Verified as high-intent curriculum for ${detectedExam}. AI study score: ${finalScore}/100 in ${topDomain}. Certified safe for Void focus blocks.`;
    } else {
      rationale = `AI Analysis passed with a high study index of ${finalScore}/100 in ${topDomain}. Content exhibits rigorous educational vocabulary and is certified safe for distraction-free Void study.`;
    }
  } else if (verdict === 'high_distraction_risk') {
    rationale = `Flagged for potential algorithmic distraction (${distractionFlags.join(', ')}). Video contains entertainment/clickbait markers that may disrupt deep work concentration.`;
  } else {
    rationale = `Moderate focus score (${finalScore}/100). Content appears neutral or mixed. Manual intentional verification ("I am productive.") will be required upon playback.`;
  }

  // Recommended Tags (Prefixed by exam badge if detected)
  const examTag = detectedExam ? [detectedExam.toLowerCase().replace(/[^a-z0-9]/g, '')] : [];
  const recommendedTags = Array.from(
    new Set([
      ...examTag,
      topDomain.split(' ')[0].toLowerCase(),
      ...academicMarkersFound.slice(0, 3).map((m) => m.toLowerCase().replace(/\s+/g, '-')),
    ])
  ).slice(0, 4);

  return {
    isValidId: Boolean(extractedId),
    videoId: extractedId,
    isShort,
    studyScore: finalScore,
    verdict,
    domainCategory: topDomain,
    detectedExam,
    confidenceLevel: channelTrusted || detectedExam || maxHits >= 3 ? 'High' : maxHits >= 1 ? 'Medium' : 'Estimated',
    recommendedTags,
    rationale,
    academicMarkersFound,
    distractionFlags,
  };
}

/**
 * Storage helpers for Custom Whitelisted Videos
 */
export function getCustomZeroTubeVideos(): ZeroTubeCustomVideo[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ZEROTUBE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomZeroTubeVideo(video: ZeroTubeCustomVideo): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = getCustomZeroTubeVideos().filter((v) => v.id !== video.id);
    existing.unshift(video);
    localStorage.setItem(STORAGE_KEY_CUSTOM_ZEROTUBE, JSON.stringify(existing.slice(0, 100)));
  } catch {}
}

export function removeCustomZeroTubeVideo(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const filtered = getCustomZeroTubeVideos().filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEY_CUSTOM_ZEROTUBE, JSON.stringify(filtered));
  } catch {}
}

/**
 * Storage helpers for User-Trusted Channels (Empowers users to permanently trust ANY creator / YouTuber)
 */
export function getUserTrustedChannels(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_TRUSTED_CHANNELS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUserTrustedChannel(channel: string): void {
  if (typeof localStorage === 'undefined') return;
  const clean = channel.trim().toLowerCase();
  if (!clean) return;
  try {
    const list = getUserTrustedChannels().filter((c) => c !== clean);
    list.unshift(clean);
    localStorage.setItem(STORAGE_KEY_USER_TRUSTED_CHANNELS, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export function removeUserTrustedChannel(channel: string): void {
  if (typeof localStorage === 'undefined') return;
  const clean = channel.trim().toLowerCase();
  try {
    const list = getUserTrustedChannels().filter((c) => c !== clean);
    localStorage.setItem(STORAGE_KEY_USER_TRUSTED_CHANNELS, JSON.stringify(list));
  } catch {}
}

export function isChannelTrusted(channel: string): boolean {
  const clean = channel.trim().toLowerCase();
  if (!clean) return false;
  if (TRUSTED_ACADEMIC_CHANNELS.has(clean)) return true;
  for (const t of TRUSTED_ACADEMIC_CHANNELS) {
    if (clean.includes(t) || t.includes(clean)) return true;
  }
  const userList = getUserTrustedChannels();
  return userList.some((c) => clean.includes(c) || c.includes(clean));
}

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
  confidenceLevel: 'High' | 'Medium' | 'Estimated';
  recommendedTags: string[];
  rationale: string;
  academicMarkersFound: string[];
  distractionFlags: string[];
}

export const STORAGE_KEY_CUSTOM_ZEROTUBE = 'zero_tube_custom_videos_v1';

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
    'cryptography', 'distributed systems', 'operating system', 'kernel', 'debugging'
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

  // 1. Channel Reputation Check
  const channelClean = (input.channel || '').trim().toLowerCase();
  let channelTrusted = false;
  for (const trusted of TRUSTED_ACADEMIC_CHANNELS) {
    if (channelClean.includes(trusted) || corpus.includes(trusted)) {
      score += 28;
      channelTrusted = true;
      academicMarkersFound.push(`Trusted Academic Channel (${trusted})`);
      break;
    }
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

  // Determine top domain
  let topDomain = 'General Skills & Self-Education';
  let maxHits = 0;
  for (const [domain, hits] of Object.entries(domainHits)) {
    if (hits > maxHits) {
      maxHits = hits;
      topDomain = domain;
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
    rationale = `AI Analysis passed with a high study index of ${finalScore}/100 in ${topDomain}. Content exhibits rigorous educational vocabulary and is certified safe for distraction-free Void study.`;
  } else if (verdict === 'high_distraction_risk') {
    rationale = `Flagged for potential algorithmic distraction (${distractionFlags.join(', ')}). Video contains entertainment/clickbait markers that may disrupt deep work concentration.`;
  } else {
    rationale = `Moderate focus score (${finalScore}/100). Content appears neutral or mixed. Manual intentional verification ("I am productive.") will be required upon playback.`;
  }

  // Recommended Tags
  const recommendedTags = Array.from(
    new Set([
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
    confidenceLevel: channelTrusted || maxHits >= 3 ? 'High' : maxHits >= 1 ? 'Medium' : 'Estimated',
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

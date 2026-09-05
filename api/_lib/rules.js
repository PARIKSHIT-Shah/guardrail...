// ---------------------------------------------------------------------------
// Stage 1: Prompt-injection detection (pattern-based, always on)
// ---------------------------------------------------------------------------
const INJECTION_PATTERNS = [
  /ignore (all|any|the)?\s*(previous|above|prior)\s*(instructions|prompts|rules)/i,
  /disregard (all|any|the)?\s*(previous|above|prior)?\s*(instructions|rules)/i,
  /you are now (in )?(developer|dan|jailbreak|unrestricted)/i,
  /pretend (you are|to be) (an? )?(unfiltered|unrestricted|jailbroken)/i,
  /reveal (your|the) system prompt/i,
  /what (is|are) your (system|hidden) (prompt|instructions)/i,
  /act as if you have no (restrictions|filters|guidelines)/i,
  /bypass (your|the|all) (safety|content)?\s*(filters|guidelines|restrictions)/i,
  /\bDAN\b.*(mode|jailbreak)/i,
  /forget (everything|all)\s*(you (were|have been) told|previous context)/i
];

// ---------------------------------------------------------------------------
// Stage 1: Toxicity keyword fallback (used when no OPENAI_API_KEY is set)
// ---------------------------------------------------------------------------
const TOXIC_KEYWORDS = [
  'kill yourself', 'i will kill you', 'i hate you', 'you are worthless',
  'stupid idiot', 'go die', 'subhuman', 'racial slur'
];

async function checkToxicityAndInjection(text) {
  const reasons = [];
  const categories = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      categories.push('prompt_injection');
      reasons.push('Detected a known prompt-injection / jailbreak pattern.');
      break;
    }
  }

  // Always run the built-in keyword check first — this guarantees a
  // baseline safety net even if OpenAI is unreachable, misconfigured, or
  // returns an unexpected/empty response.
  applyKeywordFallback(text, categories, reasons);

  if (process.env.OPENAI_API_KEY) {
    try {
      const resp = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ input: text })
      });

      if (!resp.ok) {
        throw new Error(`OpenAI moderation returned HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const result = data?.results?.[0];
      if (result?.flagged && !categories.includes('toxicity')) {
        categories.push('toxicity');
        const flaggedCats = Object.entries(result.categories || {})
          .filter(([, v]) => v)
          .map(([k]) => k);
        reasons.push(`OpenAI moderation flagged: ${flaggedCats.join(', ') || 'toxic content'}.`);
      }
    } catch (err) {
      // Network hiccup, bad key, or bad response — the keyword check above
      // has already run, so nothing is silently skipped.
      console.error('OpenAI moderation call failed, using keyword fallback only:', err.message);
    }
  }

  return { flagged: categories.length > 0, categories, reasons };
}

function applyKeywordFallback(text, categories, reasons) {
  const lower = text.toLowerCase();
  for (const phrase of TOXIC_KEYWORDS) {
    if (lower.includes(phrase)) {
      categories.push('toxicity');
      reasons.push(`Matched toxic-language pattern: "${phrase}".`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Stage 2: Content policy validation
// ---------------------------------------------------------------------------
const POLICY_CATEGORIES = {
  violence: [/\b(kill|murder|shoot|stab|bomb) (him|her|them|you|everyone)\b/i, /\bmass shooting\b/i],
  self_harm: [/\bhow to (commit|end my life|kill myself)\b/i, /\bself[- ]harm (methods|instructions)\b/i],
  hate_speech: [/\ball (jews|muslims|christians|immigrants|black people|white people) (are|should)\b/i],
  sexual_content: [/\bchild (porn|sexual|abuse material)\b/i, /\bexplicit sexual (content|acts) involving minors\b/i],
  illegal_activity: [/\bhow to (make|build) (a bomb|explosives|meth|illegal drugs)\b/i, /\bhow to hack into\b/i]
};

function checkContentPolicy(text) {
  const categories = [];
  const reasons = [];

  for (const [category, patterns] of Object.entries(POLICY_CATEGORIES)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        categories.push(category);
        reasons.push(`Content policy violation: ${category.replace('_', ' ')}.`);
        break;
      }
    }
  }

  return { flagged: categories.length > 0, categories, reasons };
}

// ---------------------------------------------------------------------------
// Stage 3: Final output generation
// ---------------------------------------------------------------------------
function generateSafeOutput(text) {
  const trimmed = text.trim();
  const preview = trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
  return `Message approved by all moderation stages. Echoing sanitized input: "${preview}"`;
}

// ---------------------------------------------------------------------------
// Orchestrator — runs the 3-stage Model Chain Prompting (MCP) pipeline
// ---------------------------------------------------------------------------
export async function runPipeline(input) {
  const trace = [];

  // Stage 1
  const stage1 = await checkToxicityAndInjection(input);
  trace.push({ stage: 'toxicity_injection', ...stage1 });
  if (stage1.flagged) {
    return {
      flagged: true,
      stage: 'toxicity_injection',
      categories: stage1.categories,
      reasons: stage1.reasons,
      finalOutput: null,
      trace
    };
  }

  // Stage 2
  const stage2 = checkContentPolicy(input);
  trace.push({ stage: 'content_policy', ...stage2 });
  if (stage2.flagged) {
    return {
      flagged: true,
      stage: 'content_policy',
      categories: stage2.categories,
      reasons: stage2.reasons,
      finalOutput: null,
      trace
    };
  }

  // Stage 3
  const finalOutput = generateSafeOutput(input);
  trace.push({ stage: 'final_generation', flagged: false, categories: [], reasons: ['Passed all checks.'] });

  return {
    flagged: false,
    stage: null,
    categories: [],
    reasons: [],
    finalOutput,
    trace
  };
}
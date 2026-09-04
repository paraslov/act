/**
 * Reference constants ported verbatim from the design prototype
 * (`docs/design/design/ACT Practice.dc.html`, lines ~806–929).
 *
 * These carry therapeutic framing and are English-final for v1. They are kept as
 * objects (id + label + description/prompt) rather than tuples so a locale-keyed
 * `ru` variant can be slotted in later without a rewrite. Reference data is NOT
 * stored in the database.
 *
 * Semantics honoured throughout the UI: toward is never "good" and away is never
 * "bad"; away is amber, not red; the flexibility total is never ranked or scored.
 */

/** The five flexibility-check axes, in display order. */
export const AXES = [
  {
    id: "awareness",
    label: "Awareness",
    prompt: "I noticed what was happening",
  },
  {
    id: "openness",
    label: "Openness",
    prompt: "I didn't spend everything fighting it",
  },
  { id: "choice", label: "Choice", prompt: "I made a pause before acting" },
  { id: "values", label: "Values", prompt: "I remembered what mattered" },
  { id: "action", label: "Action", prompt: "My action matched it" },
] as const;

/** Status effects — what had hold of behaviour, plus its counter-skill. */
export const STATES = [
  {
    id: "fusion",
    label: "Cognitive Fusion",
    description:
      "The question isn't “do I believe it 100%?” but “how much is this thought steering my behaviour right now?” Counter-skill: Defuse.",
  },
  {
    id: "avoidance",
    label: "Experiential Avoidance",
    description:
      "Avoidance isn't automatically bad — leaving a fight is great. ACT asks about its function and its price here. Counter-skill: Accept.",
  },
  {
    id: "autopilot",
    label: "Autopilot / past-future pull",
    description:
      "Reacting before any choice was made; attention living in rehearsal or replay. Counter-skill: Notice / Anchor.",
  },
  {
    id: "selfstory",
    label: "Conceptualized Self",
    description:
      "“I'm the kind of person who…” collapsing you into the content of a story. Counter-skill: notice the noticer.",
  },
  {
    id: "drift",
    label: "Values drift",
    description:
      "The direction went out of sight, so any action looked equally fine. Counter-skill: Orient.",
  },
  {
    id: "stuck",
    label: "Inaction or impulsive action",
    description:
      "Either frozen or fired off — the gap between hook and behaviour vanished. Counter-skill: Committed Action.",
  },
] as const;

/** The six flexibility skills used to unhook. */
export const SKILLS = [
  { id: "notice", label: "Notice" },
  { id: "defuse", label: "Defuse" },
  { id: "accept", label: "Accept / Make room" },
  { id: "anchor", label: "Anchor / Return" },
  { id: "orient", label: "Orient to values" },
  { id: "commit", label: "Committed Action" },
] as const;

/** The kind of thing that hooked attention. */
export const HOOK_TYPES = [
  { id: "thought", label: "Thought" },
  { id: "feeling", label: "Feeling" },
  { id: "urge", label: "Urge" },
  { id: "memory", label: "Memory" },
] as const;

/**
 * The eight three-hour time bands. Index 0–7 is what the `episodes.band` column
 * stores; these strings are display-only.
 */
export const BANDS = [
  "00–03",
  "03–06",
  "06–09",
  "09–12",
  "12–15",
  "15–18",
  "18–21",
  "21–00",
] as const;

/**
 * Static matchers used to group recurring hooks on the Progress view. A hook is
 * counted in a group when its text contains any of the group's `match` substrings
 * (case/diacritic-insensitive). This stays a static list for v1 (Known gap).
 */
export const HOOK_GROUPS = [
  {
    label: "“They'll see I can't handle it” — the competence story",
    match: ["can't handle", "incompetent"],
    type: "thought",
  },
  {
    label: "Urge to shut the laptop when it gets boring",
    match: ["laptop", "close the laptop"],
    type: "urge",
  },
  {
    label: "“Already ruined it, might as well” — all-or-nothing",
    match: ["ruined", "Too late", "Not worth starting"],
    type: "thought",
  },
  {
    label: "“She's not even listening to me”",
    match: ["listening"],
    type: "thought",
  },
  {
    label: "Flash of anger at public criticism",
    match: ["anger"],
    type: "feeling",
  },
] as const;

/** The five-step, read-only practice loop shown on the reference page. */
export const LOOP_REF = [
  {
    n: "1",
    name: "Notice",
    question: "What's happening right now?",
    help: "Register the thought, feeling, urge, body state or behaviour without reacting to it. This is the doorway to everything else — you cannot choose what you haven't seen.",
    example:
      "“Jaw tight. Thought: they don't respect my time. Urge: fire off a reply.”",
    trap: "Turning noticing into analysis. You're taking inventory, not writing a report.",
  },
  {
    n: "2",
    name: "Open",
    question: "Can this be here without a fight?",
    help: "Not liking it, not wanting it — just dropping the rope for a moment so your hands are free. Willingness is a stance toward the experience, not a technique for removing it.",
    example: "“The anger can sit in my chest while I keep typing.”",
    trap: "Opening up in order to make the feeling go. That's avoidance wearing acceptance's clothes.",
  },
  {
    n: "3",
    name: "Orient",
    question: "What matters here?",
    help: "Not what you feel like, not how to make this stop. Which quality of action do you want to show in this specific moment? Values are directions, so there's always one available.",
    example: "“I want to be someone who stays clear under pressure.”",
    trap: "Reaching for a grand life value when a small local one would do.",
  },
  {
    n: "4",
    name: "Choose",
    question: "Away or Toward?",
    help: "Both are real options. The criterion is workability — working toward what, at what price — not morality. An away move you chose consciously already costs less than one you slid into.",
    example:
      "Leaving the thread feels great for ten minutes and costs three days of dread.",
    trap: "Making the choice a verdict on your character. It's a direction, logged and moved on from.",
  },
  {
    n: "5",
    name: "Act",
    question: "What's the smallest useful step?",
    help: "Small enough that discomfort doesn't get a veto. One sentence, one call, one minute. Then it's done and there's evidence, rather than intention.",
    example: "“Reply with one clarifying question, nothing else.”",
    trap: "Waiting to feel ready. Readiness is a side effect of acting, not a prerequisite.",
  },
] as const;

/** Layered reference library for the Vault. */
export const LIB = {
  "Core map": [
    {
      t: "Psychological Flexibility",
      ev: "(a/b)",
      short:
        "Contacting your present experience and, in the same moment, keeping or changing behaviour according to the context and your chosen values. Not emotional control, not positive thinking — acceptance is only one part of it.",
      practice:
        "Watch for one thing: are you choosing the action, or is an automatic reaction dragging you? In the moment: what's happening — and what would be useful despite it?",
      example:
        "A blunt email arrives and you want to fire one back. Flexibility is noticing the urge, letting the irritation sit there, and writing the useful reply because you value clarity.",
      deep: "Operationalised through the six hexaflex processes, grouped as Open / Aware / Engaged. The construct's link to wellbeing holds up; each process as a separate causal mechanism is weaker — they overlap empirically, and mechanism measurement has historically been messy.",
    },
    {
      t: "Open / Aware / Engaged",
      ev: "(b)",
      short:
        "The three macro-processes the hexaflex folds into. Open: let inner experience be there. Aware: contact the present. Engaged: act on what matters.",
      practice:
        "Three morning buttons. Open — willing to feel discomfort today? Aware — will I catch autopilot? Engaged — who do I want to act like?",
      example:
        "Before a hard 1:1: “Open — my chest will be tight and that's allowed. Aware — I'll notice when I start rehearsing. Engaged — I want to be direct and kind.”",
      deep: "Harris frames these as Open Up / Be Present / Do What Matters. Practically convenient, but the borders are blurry — present-moment and self-as-context regularly overlap.",
    },
    {
      t: "Choice Point",
      ev: "(c)",
      short:
        "The interface for the whole system. A hook shows up (thought, feeling, urge, memory), you arrive at a fork, and behaviour goes Away or Toward.",
      practice:
        "Notice → unhook → choose. The job is not to remove hooks; it's to see them and pick a direction anyway.",
      example:
        "9pm, tired, the “I've earned this” thought arrives. Away: a third hour of scrolling. Toward: ten minutes of guitar, which is what you actually miss.",
      deep: "A Harris/Ciarrochi teaching device, not a seventh hexaflex process. It earns its place as UX, not as theory.",
    },
  ],
  Concepts: [
    {
      t: "Cognitive Fusion",
      ev: "(b)",
      short:
        "A thought is taken as literal truth or as a command, and starts running behaviour.",
      practice:
        "Check steering, not belief: how much is this thought driving me right now? Counter-skill: Defuse.",
      example:
        "“I'll humiliate myself” shows up and you decline the talk. The thought worked as an order, not as a thought.",
      deep: "From an RFT view, language gives words behavioural control without direct experience — which is where fusion gets its force.",
    },
    {
      t: "Experiential Avoidance",
      ev: "(a/b)",
      short:
        "Organising behaviour around not feeling, not thinking, not remembering something.",
      practice:
        "Ask about function and price: what is this avoidance doing here, and what does it cost me over months? Counter: Accept / Willingness.",
      example:
        "You don't make the important call because it's anxiety-provoking. Anxiety drops now; the problem and its cost grow.",
      deep: "Strong as a transdiagnostic process in general terms; specific causal claims are more complicated. Avoidance isn't pathological by form — walking away from a fight is excellent. Function, not form.",
    },
    {
      t: "Workability",
      ev: "frame",
      short:
        "ACT's criterion isn't “is this thought true?” but “is this behaviour working — toward what?” Without a stated direction the question is empty.",
      practice:
        "Instead of arguing with the thought: if I follow it every time, where do I end up, and at what cost?",
      example:
        "“I'm tired, I'll do nothing” may be perfectly true. Followed as a rule for a year, where does it take you?",
      deep: "Follows from functional contextualism and its pragmatic truth criterion: truth is successful working toward a chosen end.",
    },
    {
      t: "Self-as-Context",
      ev: "(b/c)",
      short:
        "The observer perspective from which you notice thoughts, feelings and roles without collapsing yourself into their content.",
      practice:
        "“I notice anxiety” rather than “I'm an anxious person.” It separates you from your self-stories.",
      example:
        "Catching “I'm a failure” mid-sentence and stepping half a pace back from it — the story is still there, you're just not inside it.",
      deep: "The most theoretically contested process even inside ACT; frequently conflated with present-moment contact.",
    },
  ],
  Skills: [
    {
      t: "Notice",
      ev: "(b)",
      short:
        "Register a thought, feeling, urge, sensation or behaviour without reacting to it immediately.",
      practice:
        "Pause and name what's happening inside. It's the doorway to every other skill.",
      example: "Catching the rising urge to interrupt before you interrupt.",
      deep: "Underlies present-moment contact; trained by ordinary mindfulness practice.",
    },
    {
      t: "Defuse",
      ev: "(b)",
      short:
        "Turn “this is true” into “this is a thought my mind is producing right now.”",
      practice:
        "Buttons: “I'm having the thought that…”, Name the Story, “thanks, mind”. The aim isn't a weaker thought — it's a looser grip.",
      example:
        "“Ah — the unfairness story again.” Same thought, much less steering.",
      deep: "If you defuse in order to make the thought disappear, it has become experiential avoidance wearing a skill's clothes. Target: thought → thought, not thought → truth.",
    },
    {
      t: "Accept / Make room",
      ev: "(b)",
      short:
        "Give inner experience room so you're not spending everything on the fight and not handing it the wheel.",
      practice:
        "Making Room, Expansion, Willingness, Urge Surfing — the urge as a wave: rise, peak, fall.",
      example:
        "Sitting through a craving for 90 seconds and letting it crest without acting on it.",
      deep: "Pain + struggle → suffering is a therapeutic metaphor: a large share of suffering is manufactured by the struggle against the original discomfort.",
    },
    {
      t: "Anchor / Return",
      ev: "(b)",
      short:
        "Get voluntary control of attention and body back when the emotion has already spiked.",
      practice:
        "Dropping Anchor (ACE): Acknowledge thoughts and feelings → Come back into the body with controlled movement → Engage with what you're doing.",
      example:
        "Mid-argument, cognitive work is unavailable. Feet on the floor, shoulders down, then back to the sentence.",
      deep: "Russ Harris's technique; especially useful where in-the-moment cognitive work is unrealistic.",
    },
    {
      t: "Orient to values",
      ev: "(b)",
      short:
        "Answer “what matters here / who do I want to be?” — not “what do I feel like?” and not “how do I get rid of this feeling?”",
      practice:
        "One question at the point of tension: what quality of action do I want to show right now?",
      example: "“Patient” outweighing the urge to cut the conversation off.",
      deep: "Values ≠ goals. A value is a direction you can't finish; a goal is a destination you can tick off.",
    },
    {
      t: "Committed Action",
      ev: "(a)",
      short:
        "Actually make the Toward Move, discomfort included — not merely understand the previous five skills.",
      practice:
        "One small step now. Flexible persistence: keep going, with the right to change route.",
      example: "The 200 bad words that get written anyway.",
      deep: "Behavioural activation and exposure as techniques have a strong evidence base. Committed action = persistence + flexibility, not grit alone.",
    },
  ],
  Basement: [
    {
      t: "Functional Contextualism",
      ev: "frame",
      short:
        "The philosophy of science under ACT. Behaviour is act-in-context; what matters is its function here, not its form or its truth in the abstract.",
      practice:
        "Ask not “what does this behaviour mean?” but “what function does it serve right here?”",
      example:
        "Skipping the party: one form, two functions — an evening with your kid (toward), or six months of dodging judgement (away).",
      deep: "Pragmatic truth criterion: “it works” always implies “toward what?” It's a frame, so evidence levels don't apply to it.",
    },
    {
      t: "RFT & rule-governed behaviour",
      ev: "(b)",
      short:
        "The theory of language ACT formally rests on: humans relate stimuli in networks, so words and rules acquire behavioural control without direct experience.",
      practice:
        "Explains where fusion, shoulds, self-stories and catastrophic futures get their power. You don't need the whole theory to use ACT.",
      example:
        "One label — “weak” — pulls a whole network of reactions along with it, no events required.",
      deep: "Distinguish functionally, never by wording: pliance (following for social consequences), tracking (following because the rule describes reality), augmenting (the rule changes how much consequences matter). The RFT → clinical-mechanism link is the weak joint in the chain.",
    },
  ],
} as const;

/** The Open / Aware / Engaged macro-process cards. */
export const FLEX_PILLARS = [
  {
    key: "Open",
    name: "Open",
    color: "oklch(0.55 0.13 55)",
    processes: "Defusion · Acceptance",
    body: "Thoughts get held as thoughts rather than instructions, and unwanted feelings are given room instead of a fight. The point is not liking them — it is not spending the whole budget on removing them first.",
    fail: "Fusion and avoidance: the thought becomes the truth, the feeling becomes the agenda.",
    ask: "Can this be here while I do the thing?",
  },
  {
    key: "Aware",
    name: "Aware",
    color: "oklch(0.5 0.1 250)",
    processes: "Present moment · Self-as-context",
    body: "Attention is voluntary — it can come back to the room, the body, the other person's face. And you can notice the noticer: the one having the story is not the story.",
    fail: "Autopilot, rehearsal, replay, and collapsing into “I'm the kind of person who…”.",
    ask: "Where is my attention, and who is watching?",
  },
  {
    key: "Engaged",
    name: "Engaged",
    color: "oklch(0.48 0.1 158)",
    processes: "Values · Committed action",
    body: "A direction stays in sight and behaviour moves that way in small, repeatable steps, with the discomfort still aboard rather than dropped off first.",
    fail: "Drift — the direction goes out of view, so every option looks equally fine — or the frozen and impulsive extremes.",
    ask: "What would the person I want to be do in the next sixty seconds?",
  },
] as const;

/** Common misconceptions about psychological flexibility. */
export const FLEX_MYTHS = [
  {
    title: "Not calm.",
    body: "Flexibility is measured while uncomfortable. A day with no anxiety and no chosen action scores nothing here.",
  },
  {
    title: "Not positive thinking.",
    body: "Nothing gets reframed into something nicer. The thought stays exactly as it is — its authority over behaviour is what changes.",
  },
  {
    title: "Not willpower.",
    body: "Forcing through is often rigid. Flexibility includes stopping, changing tack, or doing less when that is what the value asks for.",
  },
  {
    title: "Not a personality score.",
    body: "It varies by domain and by hour. Flexible at work and rigid at 22:00 in the kitchen is normal — that is exactly what the time bands are for.",
  },
] as const;

/** The three practice principles for growing flexibility. */
export const FLEX_GROWTH = [
  {
    n: "1",
    title: "Reps, not insight",
    body: "Understanding the model changes nothing on its own. The capacity grows only through repeated contact with the choice point while the discomfort is present.",
  },
  {
    n: "2",
    title: "Small and frequent beats large and rare",
    body: "Twelve minutes of the run counts. The learning is “discomfort has no veto”, and it arrives through many small proofs rather than one heroic one.",
  },
  {
    n: "3",
    title: "Write it down afterwards",
    body: "The episode log is the feedback channel. Without it the same loop repeats invisibly. Two rough lines in the evening is enough.",
  },
] as const;

export type VaultCategory = keyof typeof LIB;

/** Accent colors (also defined as CSS tokens in `globals.css`). */
export const TOWARD = "oklch(0.5 0.1 158)";
export const AWAY = "oklch(0.62 0.12 50)";

export type AxisKey = (typeof AXES)[number]["id"];
export type StateId = (typeof STATES)[number]["id"];
export type SkillId = (typeof SKILLS)[number]["id"];
export type HookType = (typeof HOOK_TYPES)[number]["id"];

/** Display string for a band index; empty string for an out-of-range index. */
export function bandLabel(index: number): string {
  return BANDS[index] ?? "";
}

/** Human label for a status-effect id, falling back to the first state. */
export function stateLabel(id: string): string {
  return (STATES.find((s) => s.id === id) ?? STATES[0]).label;
}

/** Human label for a skill id, falling back to the first skill. */
export function skillLabel(id: string): string {
  return (SKILLS.find((s) => s.id === id) ?? SKILLS[0]).label;
}

// Customer plan rules. Plain-English version: CustomerRules.md (keep the two in sync).
//
//  Free "Explorer": 14 days from account start, 1 learner, 5 stories created in that period.
//  Existing stories can always be read. Paid plans lift the limits.

export const FREE_PERIOD_DAYS = 14;
export const FREE_STORY_LIMIT = 5;
export const FREE_LEARNER_LIMIT = 1;
export const PLAN_LEARNER_LIMITS = { individual: 1, family: 5, classroom: 30 };

const DAY_MS = 24 * 60 * 60 * 1000;

export class PlanLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlanLimitError';
    this.status = 403;
    this.code = 'plan_limit';
  }
}

// Pure function: no database, no clock side effects (pass `now` to test).
export function computeEntitlement({
  plan = 'explorer',
  status = 'active',
  freeStartedAt,
  now = new Date(),
  learners = 0,
  storiesUsed = 0,
  exempt = false,
  isProduction = true,
} = {}) {
  // 'demo' status only counts as paid outside production (local testing); in production only
  // a real, active subscription unlocks paid access.
  const paidStatus = status === 'active' || (status === 'demo' && !isProduction);
  const paid = Boolean(exempt) || (plan !== 'explorer' && paidStatus);

  const started = freeStartedAt ? new Date(freeStartedAt) : now;
  const freeEndsAt = new Date(started.getTime() + FREE_PERIOD_DAYS * DAY_MS);
  const freeActive = now.getTime() < freeEndsAt.getTime();
  const daysLeft = freeActive ? Math.max(1, Math.ceil((freeEndsAt.getTime() - now.getTime()) / DAY_MS)) : 0;

  let learnersLimit = FREE_LEARNER_LIMIT;
  if (exempt) learnersLimit = Infinity;
  else if (paid) learnersLimit = PLAN_LEARNER_LIMITS[plan] || FREE_LEARNER_LIMIT;

  return {
    plan,
    paid,
    exempt: Boolean(exempt),
    freeActive,
    freeEndsAt,
    daysLeft,
    learners,
    learnersLimit,
    storiesUsed,
    storiesLimit: FREE_STORY_LIMIT,
    canCreateStory: paid || (freeActive && storiesUsed < FREE_STORY_LIMIT),
    canRevise: paid || freeActive,
    canAddLearners: count => learners + count <= learnersLimit,
  };
}

// What the browser is allowed to see (JSON-safe).
export function publicEntitlement(ent) {
  return {
    plan: ent.plan,
    paid: ent.paid,
    freeActive: ent.freeActive,
    freeEndsAt: ent.freeEndsAt.toISOString(),
    daysLeft: ent.daysLeft,
    learners: ent.learners,
    learnersLimit: Number.isFinite(ent.learnersLimit) ? ent.learnersLimit : null,
    storiesUsed: ent.storiesUsed,
    storiesLimit: ent.storiesLimit,
    canCreateStory: ent.canCreateStory,
  };
}

export function storyLimitMessage(ent, { child = false, comingSoon = true } = {}) {
  if (child) return 'Story creation is resting for now. Ask a grown-up to open Plans & billing.';
  const next = comingSoon ? 'Paid plans are coming soon.' : 'Choose a plan in Plans & billing to keep creating stories.';
  const keep = 'Your saved stories stay available to read.';
  if (!ent.freeActive) return `Your ${FREE_PERIOD_DAYS}-day free Explorer period has ended. ${next} ${keep}`;
  return `You have used all ${FREE_STORY_LIMIT} free Explorer stories. ${next} ${keep}`;
}

export function learnerLimitMessage(ent, { comingSoon = true } = {}) {
  const n = Number.isFinite(ent.learnersLimit) ? ent.learnersLimit : 0;
  const plan = ent.paid ? ent.plan.replace(/^[a-z]/, c => c.toUpperCase()) : 'free Explorer';
  const next = comingSoon ? 'Paid plans are coming soon.' : 'See Plans & billing to add more.';
  return `Your ${plan} plan includes ${n} learner${n === 1 ? '' : 's'}. ${next}`;
}

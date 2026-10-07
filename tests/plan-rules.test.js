import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEntitlement, publicEntitlement, storyLimitMessage, learnerLimitMessage,
  FREE_PERIOD_DAYS, FREE_STORY_LIMIT,
} from '../server/modules/plan-rules.js';

const day = 24 * 60 * 60 * 1000;
const start = new Date('2026-10-01T00:00:00Z');
const at = days => new Date(start.getTime() + days * day);

test('free Explorer: can create stories inside the 14-day window up to the story limit', () => {
  const ok = computeEntitlement({ freeStartedAt: start, now: at(3), storiesUsed: 4, learners: 1 });
  assert.equal(ok.paid, false);
  assert.equal(ok.freeActive, true);
  assert.equal(ok.canCreateStory, true);
  const full = computeEntitlement({ freeStartedAt: start, now: at(3), storiesUsed: FREE_STORY_LIMIT, learners: 1 });
  assert.equal(full.canCreateStory, false);
  assert.match(storyLimitMessage(full), /used all 5 free Explorer stories/);
});

test('free Explorer: window ends after 14 days and new stories stop', () => {
  const edge = computeEntitlement({ freeStartedAt: start, now: at(FREE_PERIOD_DAYS - 0.01), storiesUsed: 0 });
  assert.equal(edge.freeActive, true);
  const over = computeEntitlement({ freeStartedAt: start, now: at(FREE_PERIOD_DAYS + 0.01), storiesUsed: 0 });
  assert.equal(over.freeActive, false);
  assert.equal(over.canCreateStory, false);
  assert.equal(over.canRevise, false);
  assert.match(storyLimitMessage(over), /free Explorer period has ended/);
  assert.match(storyLimitMessage(over, { comingSoon: true }), /coming soon/);
  assert.match(storyLimitMessage(over, { comingSoon: false }), /Plans & billing/);
});

test('free Explorer: one learner only', () => {
  const ent = computeEntitlement({ freeStartedAt: start, now: at(1), learners: 1 });
  assert.equal(ent.canAddLearners(1), false);
  assert.equal(computeEntitlement({ freeStartedAt: start, now: at(1), learners: 0 }).canAddLearners(1), true);
  assert.match(learnerLimitMessage(ent), /includes 1 learner\./);
});

test('paid plans unlock everything and set learner limits', () => {
  const family = computeEntitlement({ plan: 'family', status: 'active', freeStartedAt: start, now: at(400), storiesUsed: 99, learners: 4 });
  assert.equal(family.paid, true);
  assert.equal(family.canCreateStory, true);
  assert.equal(family.canAddLearners(1), true);
  assert.equal(family.canAddLearners(2), false);
  const individual = computeEntitlement({ plan: 'individual', status: 'active', freeStartedAt: start, now: at(400), learners: 1 });
  assert.equal(individual.canAddLearners(1), false);
});

test('canceled or demo subscriptions do not unlock access in production', () => {
  for (const status of ['canceled', 'demo', 'past_due']) {
    const ent = computeEntitlement({ plan: 'family', status, freeStartedAt: start, now: at(400), isProduction: true });
    assert.equal(ent.paid, false, status);
    assert.equal(ent.canCreateStory, false, status);
  }
  // local development keeps the demo plan switcher usable
  assert.equal(computeEntitlement({ plan: 'family', status: 'demo', freeStartedAt: start, now: at(400), isProduction: false }).paid, true);
});

test('exempt accounts (owner) are never limited', () => {
  const ent = computeEntitlement({ freeStartedAt: start, now: at(900), storiesUsed: 500, learners: 40, exempt: true });
  assert.equal(ent.canCreateStory, true);
  assert.equal(ent.canAddLearners(10), true);
  assert.equal(publicEntitlement(ent).learnersLimit, null);
});

test('public entitlement is JSON-safe', () => {
  const ent = computeEntitlement({ freeStartedAt: start, now: at(5), storiesUsed: 2, learners: 1 });
  const json = JSON.parse(JSON.stringify(publicEntitlement(ent)));
  assert.equal(json.daysLeft, 9);
  assert.equal(json.storiesUsed, 2);
  assert.equal(json.storiesLimit, FREE_STORY_LIMIT);
  assert.equal(json.learnersLimit, 1);
});

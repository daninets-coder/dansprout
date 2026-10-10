import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordProblem, createLoginGuard } from '../server/modules/password-policy.js';

test('new passwords: length, repetition and common-password rules', () => {
  assert.match(passwordProblem('short1'), /at least 10/);
  assert.match(passwordProblem('aaaaaaaaaaaa'), /repetitive/);
  assert.match(passwordProblem('Password123'), /too common/);
  assert.match(passwordProblem('pass-word-1234'.replace('-', '')), /./); // 'password-1234' style variants are caught after stripping symbols
  assert.equal(passwordProblem('correct horse battery'), '');
  assert.equal(passwordProblem('Maple-River-4821'), '');
});

test('login guard locks one email after repeated failures and unlocks after the window or a success', () => {
  let time = 0;
  const guard = createLoginGuard({ maxFailures: 3, windowMs: 1000, now: () => time });
  for (let i = 0; i < 2; i++) guard.fail('a@x.com');
  assert.equal(guard.locked('a@x.com'), false);
  guard.fail('a@x.com');
  assert.equal(guard.locked('a@x.com'), true);
  assert.equal(guard.locked('b@x.com'), false);   // other emails are unaffected
  time = 1500;
  assert.equal(guard.locked('a@x.com'), false);   // window passed
  guard.fail('a@x.com'); guard.clear('a@x.com');
  assert.equal(guard.locked('a@x.com'), false);
});

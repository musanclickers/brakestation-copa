import { describe, it, expect } from 'vitest';
import { canonicalize, generateSeal, verifySeal, generateGlobalSeal, verifyGlobalSeal, generatePhaseSeal, verifyPhaseSeal } from '../index';

const TEST_SECRET = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

describe('canonicalize', () => {
  it('sorts top-level keys deterministically', () => {
    const a = canonicalize({ z: 1, a: 2, m: 3 });
    const b = canonicalize({ m: 3, a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"m":3,"z":1}');
  });

  it('sorts nested keys recursively', () => {
    const payload = { data: { z: 1, a: 2 }, type: 'test' };
    const result = canonicalize(payload);
    expect(result).toBe('{"data":{"a":2,"z":1},"type":"test"}');
  });

  it('preserves arrays without reordering', () => {
    const result = canonicalize({ items: [3, 1, 2] });
    expect(result).toBe('{"items":[3,1,2]}');
  });
});

describe('generateSeal', () => {
  it('produces a 64-char hex string (SHA-256)', () => {
    const seal = generateSeal({ test: 'data' }, TEST_SECRET);
    expect(seal).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for same input', () => {
    const payload = { ticket_code: 'BS-042', user_id: 'abc-123' };
    const seal1 = generateSeal(payload, TEST_SECRET);
    const seal2 = generateSeal(payload, TEST_SECRET);
    expect(seal1).toBe(seal2);
  });

  it('is deterministic regardless of key insertion order', () => {
    const seal1 = generateSeal({ a: 1, b: 2 }, TEST_SECRET);
    const seal2 = generateSeal({ b: 2, a: 1 }, TEST_SECRET);
    expect(seal1).toBe(seal2);
  });

  it('produces different output for different payloads', () => {
    const seal1 = generateSeal({ champion: 'Argentina' }, TEST_SECRET);
    const seal2 = generateSeal({ champion: 'Brazil' }, TEST_SECRET);
    expect(seal1).not.toBe(seal2);
  });

  it('produces different output for different secrets', () => {
    const payload = { test: 'data' };
    const seal1 = generateSeal(payload, TEST_SECRET);
    const seal2 = generateSeal(payload, 'b'.repeat(64));
    expect(seal1).not.toBe(seal2);
  });
});

describe('verifySeal', () => {
  it('returns true for a valid seal', () => {
    const payload = { champion: 'Argentina', ticket: 'BS-001' };
    const seal = generateSeal(payload, TEST_SECRET);
    expect(verifySeal(payload, seal, TEST_SECRET)).toBe(true);
  });

  it('returns false for a tampered payload', () => {
    const original = { champion: 'Argentina', ticket: 'BS-001' };
    const seal = generateSeal(original, TEST_SECRET);
    const tampered = { champion: 'Brazil', ticket: 'BS-001' };
    expect(verifySeal(tampered, seal, TEST_SECRET)).toBe(false);
  });

  it('returns false for an invalid seal format', () => {
    const payload = { test: 'data' };
    expect(verifySeal(payload, 'not-a-hex-string', TEST_SECRET)).toBe(false);
  });

  it('returns false for a truncated seal', () => {
    const payload = { test: 'data' };
    const seal = generateSeal(payload, TEST_SECRET);
    expect(verifySeal(payload, seal.slice(0, 32), TEST_SECRET)).toBe(false);
  });

  it('verifies the full prediction payload structure from the PRD', () => {
    const payload = {
      v: '1.0',
      type: 'prediction',
      ticket_code: 'BS-042',
      user_id: 'a8f3-uuid-here',
      submitted_at: '2026-06-08T14:23:51-06:00',
      data: {
        champion: 'Argentina',
        runner_up: 'France',
        third_place: 'Brasil',
        top_scorer: 'Mbappe',
        golden_ball: 'Messi',
        opening_result: '1',
        semi1_winner: 'Argentina',
        semi2_winner: 'France',
        final_result: '1',
        final_total_goals: 4,
      },
    };
    const seal = generateSeal(payload, TEST_SECRET);
    expect(verifySeal(payload, seal, TEST_SECRET)).toBe(true);

    // Tamper with nested data
    const tampered = {
      ...payload,
      data: { ...payload.data, champion: 'Brazil' },
    };
    expect(verifySeal(tampered, seal, TEST_SECRET)).toBe(false);
  });
});

describe('global seal — 104 predictions', () => {
  const sortedPicks = Array.from({ length: 104 }, (_, i) => ({
    match_code: `M-${String(i + 1).padStart(3, '0')}`,
    h: 1,
    a: 0,
  }));

  it('produces deterministic global seal regardless of input order', () => {
    const shuffled = [...sortedPicks].reverse();
    const sealA = generateGlobalSeal(sortedPicks, TEST_SECRET);
    const sealB = generateGlobalSeal(shuffled, TEST_SECRET);
    expect(sealA).toBe(sealB);
  });

  it('changes if any single prediction is altered', () => {
    const a = generateGlobalSeal(sortedPicks, TEST_SECRET);
    const tampered = sortedPicks.map((p, i) => i === 50 ? { ...p, h: 9 } : p);
    const b = generateGlobalSeal(tampered, TEST_SECRET);
    expect(a).not.toBe(b);
  });

  it('verifies a valid global seal', () => {
    const seal = generateGlobalSeal(sortedPicks, TEST_SECRET);
    expect(verifyGlobalSeal(sortedPicks, seal, TEST_SECRET)).toBe(true);
  });

  it('rejects tampered predictions against original seal', () => {
    const seal = generateGlobalSeal(sortedPicks, TEST_SECRET);
    const tampered = [...sortedPicks];
    tampered[10] = { ...tampered[10], a: 99 };
    expect(verifyGlobalSeal(tampered, seal, TEST_SECRET)).toBe(false);
  });
});

describe('phase seal', () => {
  const picks = Array.from({ length: 16 }, (_, i) => ({
    match_code: `R32-${String(i + 1).padStart(2, '0')}`,
    h: 2, a: 1,
  }));

  it('generates deterministic seal for a phase', () => {
    const a = generatePhaseSeal('r32', picks, TEST_SECRET);
    const b = generatePhaseSeal('r32', [...picks].reverse(), TEST_SECRET);
    expect(a).toBe(b);
  });

  it('produces a 64-char hex string', () => {
    const seal = generatePhaseSeal('r32', picks, TEST_SECRET);
    expect(seal).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies a valid phase seal', () => {
    const seal = generatePhaseSeal('r32', picks, TEST_SECRET);
    expect(verifyPhaseSeal('r32', picks, seal, TEST_SECRET)).toBe(true);
  });

  it('rejects tampered phase predictions', () => {
    const seal = generatePhaseSeal('r32', picks, TEST_SECRET);
    const tampered = picks.map((p, i) => i === 5 ? { ...p, h: 9 } : p);
    expect(verifyPhaseSeal('r32', tampered, seal, TEST_SECRET)).toBe(false);
  });

  it('different phases generate different seals for same picks', () => {
    const a = generatePhaseSeal('r32', picks, TEST_SECRET);
    const b = generatePhaseSeal('r16', picks, TEST_SECRET);
    expect(a).not.toBe(b);
  });

  it('works with groups phase (72 matches)', () => {
    const groupPicks = Array.from({ length: 72 }, (_, i) => ({
      match_code: `G-${String(i + 1).padStart(3, '0')}`,
      h: 1, a: 0,
    }));
    const seal = generatePhaseSeal('groups', groupPicks, TEST_SECRET);
    expect(verifyPhaseSeal('groups', groupPicks, seal, TEST_SECRET)).toBe(true);
  });

  it('works with final_phase (2 matches)', () => {
    const finalPicks = [
      { match_code: 'M-103', h: 2, a: 1 },
      { match_code: 'M-104', h: 3, a: 2 },
    ];
    const seal = generatePhaseSeal('final_phase', finalPicks, TEST_SECRET);
    expect(verifyPhaseSeal('final_phase', finalPicks, seal, TEST_SECRET)).toBe(true);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_HEATMAP_ZONES,
  getHeatmapZoneForStep,
  computeAveragePlantLoad,
  classifyLoadSeverity
} from './heatmap';

test('PRODUCTION_HEATMAP_ZONES covers all 7 tour steps including flare stack and chemical warehouse', () => {
  assert.equal(PRODUCTION_HEATMAP_ZONES.length, 7);
  for (let i = 0; i < 7; i++) {
    const zone = getHeatmapZoneForStep(i);
    assert.equal(zone.stepIndex, i);
    assert.ok(zone.loadPct >= 80 && zone.loadPct <= 100);
  }
});

test('computeAveragePlantLoad calculates accurate mean across all 7 active production steps', () => {
  // (88 + 96 + 99 + 87 + 97 + 92 + 85) / 7 = 644 / 7 = 92
  const avg = computeAveragePlantLoad();
  assert.equal(avg, 92);
});

test('classifyLoadSeverity returns distinct severity tiers for nominal, elevated, and peak loads', () => {
  assert.equal(classifyLoadSeverity(99).label, 'Пиковая активность');
  assert.equal(classifyLoadSeverity(90).label, 'Высокая нагрузка');
  assert.equal(classifyLoadSeverity(85).label, 'Оптимальный режим');
});

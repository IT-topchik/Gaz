import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_HEATMAP_ZONES,
  getHeatmapZoneForStep,
  computeAveragePlantLoad,
  classifyLoadSeverity
} from './heatmap';

test('PRODUCTION_HEATMAP_ZONES covers all 5 tour steps plus flare stack', () => {
  assert.equal(PRODUCTION_HEATMAP_ZONES.length, 6);
  for (let i = 0; i < 5; i++) {
    const zone = getHeatmapZoneForStep(i);
    assert.equal(zone.stepIndex, i);
    assert.ok(zone.loadPct >= 80 && zone.loadPct <= 100);
  }
});

test('computeAveragePlantLoad calculates accurate mean across the 5 main production steps', () => {
  // (88 + 96 + 99 + 87 + 97) / 5 = 467 / 5 = 93.4
  const avg = computeAveragePlantLoad();
  assert.equal(avg, 93.4);
});

test('classifyLoadSeverity returns distinct severity tiers for nominal, elevated, and peak loads', () => {
  assert.equal(classifyLoadSeverity(99).label, 'Пиковая активность');
  assert.equal(classifyLoadSeverity(90).label, 'Высокая нагрузка');
  assert.equal(classifyLoadSeverity(85).label, 'Оптимальный режим');
});

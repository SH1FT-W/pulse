// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import '../pulse-rhythm';
import { PulseRhythm, sameBuckets } from '../pulse-rhythm';

class FakeObserver {
  observed = 0;
  observe(): void {
    this.observed++;
  }
  disconnect(): void {
    this.observed = 0;
  }
}

describe('pulse-rhythm', () => {
  it('compares bars by content', () => {
    expect(sameBuckets([1, null, 2], [1, null, 2])).toBe(true);
    expect(sameBuckets([1, null, 2], [1, 0, 2])).toBe(false);
    expect(sameBuckets([[0, 0.5]], [[0, 0.5]])).toBe(true);
    expect(sameBuckets([[0, 0.5]], [[0, 0.6]])).toBe(false);
    expect(sameBuckets([], undefined)).toBe(false);
  });

  it('a snapshot with the same windows does not render the bar again', async () => {
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: FakeObserver });
    const bar = document.createElement('pulse-rhythm');
    if (!(bar instanceof PulseRhythm)) throw new Error('keine Leiste');
    bar.buckets = [1, 2, 0, null];
    document.body.append(bar);
    await bar.updateComplete;
    let renders = 0;
    const original = bar.render.bind(bar);
    bar.render = () => {
      renders++;
      return original();
    };
    bar.buckets = [1, 2, 0, null];
    bar.gaps = [];
    await bar.updateComplete;
    expect(renders).toBe(0);
    bar.buckets = [1, 2, 1, null];
    await bar.updateComplete;
    expect(renders).toBe(1);
  });
});

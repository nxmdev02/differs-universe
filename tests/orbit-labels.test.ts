import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeOrbitLabels } from '../app/utils/orbit-labels'

test('crowded phone labels stay readable, inside the scene and clear of Earth', () => {
  for (const width of [294, 364, 404]) {
    const earth = { x: width / 2, y: 320, radius: 46 }
    const labels = Array.from({ length: 13 }, (_, index) => ({
      project: { name: `long-project-name-${index}` },
      x: width / 2 + Math.cos(index) * 80,
      y: 500 + Math.sin(index) * 120,
      radius: 22,
      labelX: 0,
      labelY: 0,
    }))
    placeOrbitLabels(labels, earth, width, 970)
    for (const [index, label] of labels.entries()) {
      assert.ok(label.labelX - 63 >= 0 && label.labelX + 63 <= width)
      assert.ok(label.labelY >= 94 && label.labelY + 36 <= 970 - 80)
      assert.ok(
        Math.abs(label.labelX - earth.x) >= 119 || label.labelY > 418 || label.labelY + 36 < 266,
      )
      for (const other of labels.slice(index + 1)) {
        assert.ok(
          Math.abs(label.labelX - other.labelX) >= 126 ||
            Math.abs(label.labelY - other.labelY) >= 39,
          'project labels must not overlap',
        )
      }
    }
  }
})

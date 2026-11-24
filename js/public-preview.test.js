const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('./public-preview.js');

function doc(fields) {
  return Object.assign({
    id: 'd1',
    day_number: 24,
    month: 'November',
    title: 'Today',
    verse_reference: 'Joshua 1:9',
    verse_text: 'Be strong.',
    devotion_body: 'full text',
    audio_url: 'https://example.com/a.mp3',
    image_url: 'https://example.com/a.jpg',
    challenge: 'Do the work',
    prayer: 'Lord, help',
    is_complete: true
  }, fields);
}

test('only published devotions with a month and day are mirrored', function () {
  const result = api.plan([
    doc({ id: 'pub', title: 'Published' }),
    doc({ id: 'draft', title: 'Emmanuel', month: 'December', is_complete: false }),
    doc({ id: 'blank', title: 'No flag', is_complete: undefined }),
    doc({ id: 'nomonth', month: '', is_complete: true }),
    doc({ id: 'noday', day_number: 0, is_complete: true })
  ]);
  assert.deepEqual(result.publishable.map(function (d) { return d.id; }), ['pub']);
  assert.deepEqual(result.unpublished.map(function (d) { return d.id; }), ['draft', 'blank']);
  assert.deepEqual(result.incomplete.map(function (d) { return d.id; }), ['nomonth', 'noday']);
});

test('mirror payload is title and verse plus is_complete, never the protected fields', function () {
  const row = api.payload(doc({ title: 'Published' }));
  assert.deepEqual(row, {
    month: 'November',
    day_number: 24,
    title: 'Published',
    verse_reference: 'Joshua 1:9',
    verse_text: 'Be strong.',
    is_complete: true
  });
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'devotion_body'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'audio_url'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'image_url'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'challenge'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, 'prayer'), false);
});

test('unpublished and stale mirror ids are removed, published ids stay', function () {
  const plan = api.plan([
    doc({ id: 'keep' }),
    doc({ id: 'draft', is_complete: false, month: 'December', title: 'Emmanuel' })
  ]);
  const remove = api.idsToRemove(['keep', 'draft', 'stale-from-last-publish'], plan.publishable);
  assert.deepEqual(remove, ['draft', 'stale-from-last-publish']);
});

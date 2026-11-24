const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('./devotion-today.js');

// 2026-11-25 05:30 UTC is 11:30pm on Nov 24 in Chicago, and 12:30am on Nov 25
// in New York. The site must follow Chicago, which is what the app uses.
const NOV_24_CHICAGO = new Date('2026-11-25T05:30:00.000Z');
const DEC_1_CHICAGO = new Date('2026-12-01T06:30:00.000Z');

function row(fields) {
  return Object.assign({
    day_number: 1,
    month: 'November',
    title: 'Untitled',
    is_complete: true
  }, fields);
}

test('calendar date is America/Chicago, not the visitor zone or Eastern', function () {
  const parts = api.todayParts(NOV_24_CHICAGO);
  assert.equal(parts.year, 2026);
  assert.equal(parts.monthIndex, 10);
  assert.equal(parts.monthName, 'November');
  assert.equal(parts.day, 24);
  assert.equal(api.TZ, 'America/Chicago');
});

test('selects the published devotion whose day_number is today in the current month', function () {
  const picked = api.selectToday([
    row({ day_number: 1, title: 'Day One', month: 'November' }),
    row({ day_number: 2, title: 'Day Two', month: 'November' }),
    row({ day_number: 3, title: 'Day Three', month: 'November' }),
    row({ day_number: 23, title: 'Yesterday', month: 'November' }),
    row({ day_number: 24, title: 'November Twenty Four', month: 'November', theme: 'Courage' }),
    row({ day_number: 24, title: 'October Twenty Four', month: 'October' }),
    row({ day_number: 1, title: 'Emmanuel Begins', month: 'December', theme: 'Emmanuel', is_complete: false, devotion_body: 'unpublished body' }),
    row({ day_number: 24, title: 'Emmanuel Day', month: 'December', theme: 'Emmanuel', is_complete: false })
  ], NOV_24_CHICAGO);

  assert.equal(picked.devotion.title, 'November Twenty Four');
  assert.equal(picked.today.day, 24);
  assert.deepEqual(picked.monthDevotions.map(function (d) { return d.title; }), [
    'Day One', 'Day Two', 'Day Three', 'Yesterday', 'November Twenty Four'
  ]);
});

test('does not fall back to an earlier day or to an unpublished day 24', function () {
  const picked = api.selectToday([
    row({ day_number: 1, title: 'Day One' }),
    row({ day_number: 23, title: 'Yesterday' }),
    row({ day_number: 24, title: 'Unpublished Today', is_complete: false, devotion_body: 'full text' })
  ], NOV_24_CHICAGO);
  assert.equal(picked.devotion, null);
  assert.equal(picked.monthDevotions.length, 2);
});

test('hides December imports once that month arrives if they are still unpublished', function () {
  const picked = api.selectToday([
    row({
      day_number: 1,
      month: 'December',
      title: 'God With Us',
      theme: 'Emmanuel',
      is_complete: false,
      devotion_body: 'not ready'
    }),
    row({ day_number: 1, month: 'November', title: 'Last Month' })
  ], DEC_1_CHICAGO);
  assert.equal(picked.devotion, null);
  assert.equal(picked.monthDevotions.length, 0);
});

test('a public mirror row is shown only when is_complete is true', function () {
  const shown = api.selectToday([
    { day_number: '24', month: 'november', title: 'Public Mirror', verse_reference: 'John 1:1', verse_text: 'In the beginning', is_complete: true }
  ], NOV_24_CHICAGO);
  assert.equal(shown.devotion.title, 'Public Mirror');

  const missingFlag = api.selectToday([
    { day_number: 24, month: 'November', title: 'Old Mirror', verse_text: 'verse' }
  ], NOV_24_CHICAGO);
  assert.equal(missingFlag.devotion, null);

  const otherFlag = api.selectToday([
    row({ day_number: 24, title: 'Flagged', is_complete: undefined, published: true, devotion_body: 'body' })
  ], NOV_24_CHICAGO);
  assert.equal(otherFlag.devotion, null);
});

test('a full devotion with no published flag stays hidden', function () {
  const picked = api.selectToday([
    { day_number: 24, month: 'November', title: 'No Flag', devotion_body: 'secret' }
  ], NOV_24_CHICAGO);
  assert.equal(picked.devotion, null);
});

test('explicit is_complete false hides a row even if it was copied to the public mirror', function () {
  const picked = api.selectToday([
    { day_number: 24, month: 'November', title: 'Leaked', is_complete: false, verse_text: 'verse' }
  ], NOV_24_CHICAGO);
  assert.equal(picked.devotion, null);
});

test('preview HTML is today\'s teaser and does not include another month', function () {
  const today = api.todayParts(NOV_24_CHICAGO);
  const devotion = row({
    day_number: 24,
    title: 'November Twenty Four',
    theme: 'Courage',
    verse_reference: 'Proverbs 27:17',
    verse_text: 'Iron sharpens iron, so one man sharpens another.',
    devotion_body: 'A long written devotion that stays truncated on the homepage so the rest remains in the app. '.repeat(4),
    challenge: 'Do the hard thing',
    prayer: 'Lord, help me'
  });
  const home = api.homePeekHtml(devotion, today);
  const block = api.todayBlockHtml(devotion, today);
  assert.match(home, /November Twenty Four/);
  assert.match(home, /November 24/);
  assert.match(home, /Day 24/);
  assert.match(home, /Pro/);
  assert.doesNotMatch(home, /Do the hard thing/);
  assert.doesNotMatch(home, /Lord, help me/);
  assert.match(block, /Today/);
  assert.match(block, /November Twenty Four/);
  assert.match(block, /Proverbs 27:17/);
  assert.doesNotMatch(block, /A long written devotion/);
  assert.doesNotMatch(block, /Emmanuel/);
});

test('a different year of the same month name is not this month\'s series', function () {
  const picked = api.selectToday([
    row({ day_number: 24, title: 'Next November', year: 2027 })
  ], NOV_24_CHICAGO);
  assert.equal(picked.devotion, null);
});

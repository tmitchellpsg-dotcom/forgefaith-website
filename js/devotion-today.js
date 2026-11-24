// Shared "today's devotion" selection for the public site.
// The iOS app source is not in this repo. The site follows the same rule the
// owner confirmed: America/Chicago calendar date, day_number equal to that
// day of the month, current month's series, and only published devotions.
// Bulk-imported rows are stored with is_complete: false (the admin
// "Mark as Published" checkbox) and must not be shown.
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root) return;
  root.ffTodayParts = function (date) { return api.todayParts(date); };
  root.ffSelectTodayDevotion = function (devotions, date) { return api.selectToday(devotions, date); };
  root.ffPublishedThisMonth = function (devotions, date) { return api.publishedThisMonth(devotions, date); };
  root.ffTodayBlockHtml = function (devotion, today) { return api.todayBlockHtml(devotion, today); };
  root.ffHomePeekHtml = function (devotion, today) { return api.homePeekHtml(devotion, today); };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  var TZ = 'America/Chicago';
  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var APP_URL = 'https://apps.apple.com/us/app/id6781935591';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function clip(value, max) {
    var text = String(value == null ? '' : value);
    if (text.length <= max) return esc(text);
    return esc(text.slice(0, max)) + '\u2026';
  }

  function todayParts(date) {
    var p = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(date || new Date()).forEach(function (part) {
      p[part.type] = part.value;
    });
    var monthIndex = +p.month - 1;
    return {
      year: +p.year,
      monthIndex: monthIndex,
      monthName: MONTHS[monthIndex],
      day: +p.day
    };
  }

  function hasProtectedContent(d) {
    return !!(d.devotion_body || d.body_1 || d.body_2 || d.body_3 ||
      d.life_application || d.challenge || d.prayer || d.audio_url);
  }

  // Published means the admin checkbox (is_complete) or an explicit published
  // flag. A full devotion with neither flag stays hidden. devotions_public
  // rows are title + scripture only and carry no flag; those are the public
  // teaser channel. An explicit false always wins, so an unpublished import
  // cannot slip through.
  function isShownOnSite(d) {
    if (!d || typeof d !== 'object') return false;
    if (d.is_complete === false || d.published === false) return false;
    if (d.is_complete === true || d.published === true) return true;
    return !hasProtectedContent(d);
  }

  function inCurrentMonth(d, today) {
    var month = String(d.month == null ? '' : d.month).trim().toLowerCase();
    if (month !== today.monthName.toLowerCase()) return false;
    if (d.year != null && d.year !== '' && Number(d.year) !== today.year) return false;
    return true;
  }

  function byDay(a, b) {
    return (Number(a.day_number) || 0) - (Number(b.day_number) || 0);
  }

  function publishedThisMonth(devotions, date) {
    var today = todayParts(date);
    return (devotions || []).filter(function (d) {
      return isShownOnSite(d) && inCurrentMonth(d, today);
    }).sort(byDay);
  }

  function selectToday(devotions, date) {
    var today = todayParts(date);
    var monthDevotions = publishedThisMonth(devotions, date);
    var devotion = null;
    for (var i = 0; i < monthDevotions.length; i++) {
      if (Number(monthDevotions[i].day_number) === today.day) {
        devotion = monthDevotions[i];
        break;
      }
    }
    return { today: today, devotion: devotion, monthDevotions: monthDevotions };
  }

  function todayBlockHtml(devotion, today) {
    if (!devotion || !today) return '';
    return '<section class="today-dev">' +
      '<div class="today-dev-head">' +
        '<span class="today-dev-eyebrow">Today&rsquo;s Devotion</span>' +
        '<span class="today-dev-date">' + esc(today.monthName) + ' ' + today.day + ', ' + today.year + '</span>' +
      '</div>' +
      '<p class="today-dev-day">Day ' + esc(devotion.day_number) + (devotion.theme ? ' &middot; ' + esc(devotion.theme) : '') + '</p>' +
      '<h2 class="today-dev-title">' + esc(devotion.title || 'Untitled') + '</h2>' +
      (devotion.verse_text ? '<blockquote class="today-dev-verse">&ldquo;' + esc(devotion.verse_text) + '&rdquo;</blockquote>' : '') +
      (devotion.verse_reference ? '<p class="today-dev-ref">&mdash; ' + esc(devotion.verse_reference) + ' (NASB)</p>' : '') +
      '<p class="today-dev-note">The written devotion, audio version, reflection questions and prayer are in the app.</p>' +
      '<a class="btn-primary" href="' + APP_URL + '" target="_blank" rel="noopener">Read the Full Devotion</a>' +
    '</section>';
  }

  function homePeekHtml(devotion, today) {
    if (!devotion || !today) return '';
    var free = Number(devotion.day_number) === 1;
    var body = devotion.devotion_body || devotion.body_1 || '';
    var access = free ? 'Free' : 'Pro';
    return '<div class="peek-card fade-in visible">' +
      '<p class="peek-day">Today &middot; ' + esc(today.monthName) + ' ' + today.day + ' &middot; Day ' + esc(devotion.day_number) + ' &mdash; ' + access + '</p>' +
      '<h3>' + esc(devotion.title || '') + '</h3>' +
      (devotion.verse_text
        ? '<p class="peek-verse">&ldquo;' + clip(devotion.verse_text, 80) + '&rdquo;' +
          (devotion.verse_reference ? ' &mdash; ' + esc(devotion.verse_reference) : '') + '</p>'
        : '') +
      (body ? '<p>' + clip(body, 140) + '</p>' : '') +
      '<div class="peek-cta"><a href="pages/devotions.html" class="btn-ghost">Read Full Devotion</a></div>' +
    '</div>';
  }

  return {
    TZ: TZ,
    MONTHS: MONTHS,
    todayParts: todayParts,
    isShownOnSite: isShownOnSite,
    publishedThisMonth: publishedThisMonth,
    selectToday: selectToday,
    todayBlockHtml: todayBlockHtml,
    homePeekHtml: homePeekHtml
  };
});

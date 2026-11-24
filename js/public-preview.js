// Decides what "Publish Public Previews" may write to devotions_public.
// The main devotions collection is never part of this result: callers may
// only set or delete documents in the public mirror.
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root) return;
  root.ffPlanPublicPreviews = api.plan;
  root.ffPublicPreviewPayload = api.payload;
  root.ffPublicPreviewIdsToRemove = api.idsToRemove;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  function isPublishable(d) {
    return !!(d && d.id && d.is_complete === true && d.month && d.day_number);
  }

  function plan(devotions) {
    var publishable = [];
    var unpublished = [];
    var incomplete = [];
    (devotions || []).forEach(function (d) {
      if (isPublishable(d)) publishable.push(d);
      else if (d && d.is_complete === true) incomplete.push(d);
      else unpublished.push(d);
    });
    return { publishable: publishable, unpublished: unpublished, incomplete: incomplete };
  }

  // Title and scripture only, plus the published flag the public site requires.
  // Body, audio, images, challenge, and prayer are intentionally omitted.
  function payload(d) {
    return {
      month: d.month,
      day_number: d.day_number,
      title: d.title || '',
      verse_reference: d.verse_reference || '',
      verse_text: d.verse_text || '',
      is_complete: true
    };
  }

  function idsToRemove(existingIds, publishable) {
    var live = {};
    (publishable || []).forEach(function (d) {
      if (d && d.id) live[d.id] = true;
    });
    return (existingIds || []).filter(function (id) { return !live[id]; });
  }

  return {
    plan: plan,
    payload: payload,
    idsToRemove: idsToRemove,
    isPublishable: isPublishable
  };
});

/* GA4 for the public site only. Analytics failures must never interrupt the builder. */
(() => {
  'use strict';
  const enabled = ['thock.cc', 'www.thock.cc'].includes(location.hostname);
  const measurementId = 'G-PM25KR04FW';
  const seenSteps = new Set(), answers = new Map();
  let started = false, completed = false;
  function event(name, params = {}) {
    if (!enabled) return;
    try { window.gtag('event', name, {transport_type: 'beacon', ...params}); } catch {}
  }
  window.ThockAnalytics = Object.freeze({
    event,
    step(question, step_number) {
      if (seenSteps.has(question)) return;
      seenSteps.add(question);
      event('quiz_step_view', {question, step_number});
    },
    answer(question, step_number, answer) {
      if (answer == null) return;
      if (!started) { started = true; event('quiz_start', {step_number}); }
      if (answers.get(question) === answer) return;
      answers.set(question, answer);
      event('quiz_answer', {question, step_number, answer});
    },
    complete(params) {
      if (completed || !started) return;
      completed = true;
      event('quiz_complete', params);
    },
    reset() {
      event('quiz_reset');
      seenSteps.clear(); answers.clear(); started = false; completed = false;
    }
  });
  if (!enabled) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
  function productClick(e) {
    if (e.type === 'auxclick' && e.button !== 1) return;
    const a = e.target.closest?.('a[rel~="sponsored"]');
    if (!a) return;
    try {
      const url = new URL(a.href);
      if (!/^https?:$/.test(url.protocol)) return;
      event('product_click', {
        item_id: a.dataset.productId || '',
        item_category: a.dataset.productCategory || '',
        retailer: url.hostname,
        link_url: url.origin + url.pathname
      });
    } catch {}
  }
  document.addEventListener('click', productClick);
  document.addEventListener('auxclick', productClick);
})();

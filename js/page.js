// Shared page motion: reveal content blocks smoothly as they enter view.
(function () {
  if (!("IntersectionObserver" in window)) return;
  var els = document.querySelectorAll("main .block > *, footer.site .ftop, footer.site .cols > div");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  els.forEach(function (el, i) {
    el.classList.add("rv");
    el.style.transitionDelay = Math.min((i % 4) * 60, 180) + "ms";
    io.observe(el);
  });
})();

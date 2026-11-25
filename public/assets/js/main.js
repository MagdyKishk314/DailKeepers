/* Dialkeepers landing page. No dependencies.
   Everything on the page is in the HTML already, so crawlers, screen readers and no-JS
   visitors see all of it. This script adds a little motion on top:
   - counts the sample-audit figures up when they scroll into view
   - fades sections in once, as they arrive
   - firms up the top bar once the page has scrolled
   - sends the form without a page reload */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---------- Top bar: firmer glass once the page has scrolled ---------- */
  var topbar = document.getElementById("topbar");
  if (topbar) {
    var ticking = false;
    var syncTopbar = function () {
      topbar.classList.toggle("is-stuck", window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(syncTopbar);
        }
      },
      { passive: true }
    );
    syncTopbar();
  }

  /* ---------- Count-up for the sample-audit figures ---------- */
  function countUp(el) {
    var to = Number(el.dataset.to);
    var suffix = el.dataset.suffix || "";
    var start = performance.now();
    var duration = 1400;
    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toLocaleString("en-US") + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (hasIO && !reduce) {
    var counts = [].slice.call(document.querySelectorAll(".count"));
    counts.forEach(function (el) {
      el.textContent = "0" + (el.dataset.suffix || "");
    });
    var countIO = new IntersectionObserver(
      function (items) {
        items.forEach(function (item) {
          if (!item.isIntersecting) return;
          countIO.unobserve(item.target);
          countUp(item.target);
        });
      },
      { threshold: 0.6 }
    );
    counts.forEach(function (el) {
      countIO.observe(el);
    });

    /* ---------- Fade sections in, once ---------- */
    var targets = [].slice.call(
      document.querySelectorAll(
        "main .head, .card, .timeline li, .console, .tile, .note, .faq details, " +
          "#book .split > div:first-child, .form-card"
      )
    );
    var revealIO = new IntersectionObserver(
      function (items) {
        items.forEach(function (item) {
          if (!item.isIntersecting) return;
          item.target.classList.add("in");
          revealIO.unobserve(item.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    targets.forEach(function (el) {
      var siblings = el.parentElement ? [].slice.call(el.parentElement.children) : [el];
      var delay = Math.min(siblings.indexOf(el), 5) * 70;
      el.style.setProperty("--d", delay + "ms");
      el.classList.add("reveal");
      revealIO.observe(el);
    });
  }

  /* ---------- Form ---------- */
  var form = document.getElementById("book-form");
  var msg = document.getElementById("form-msg");
  if (form && msg && window.fetch) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      msg.textContent = "Sending.";

      var payload = {};
      new FormData(form).forEach(function (value, key) {
        payload[key] = value;
      });

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (res.ok && data.ok) {
                form.reset();
                msg.textContent = "Sent. We will reply by email with a time for your audit call.";
              } else {
                msg.textContent = data.message || "Something went wrong. Try again in a minute.";
              }
            });
        })
        .catch(function () {
          msg.textContent = "Could not reach the server. Check your connection and try again.";
        })
        .then(function () {
          button.disabled = false;
        });
    });
  }
})();

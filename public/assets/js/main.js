/* Dialkeepers landing page. No dependencies.
   Everything on the page is in the HTML already, so crawlers, screen readers and no-JS
   visitors see all of it. This script adds a little motion on top:
   - animates the hero signal (jagged when unmanaged, steady once managed)
   - fades sections in once, as they arrive
   - firms up the top bar once the page has scrolled
   - sends the form without a page reload, then shows the Calendly calendar */
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

  if (hasIO && !reduce) {
    /* ---------- Fade sections in, once ---------- */
    var targets = [].slice.call(
      document.querySelectorAll(
        "main .head, .problem, .timeline li, .tile, .note, .faq details, " +
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

  /* ---------- Logo row: keyboard-reachable pause button ---------- */
  var logos = document.querySelector(".logos");
  var toggle = logos && logos.querySelector(".marquee-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var paused = logos.classList.toggle("is-paused");
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.textContent = paused ? "Play logo animation" : "Pause logo animation";
    });
  }

  /* ---------- Hero signal: jagged on the left, steady on the right ---------- */
  var signal = document.querySelector(".signal");
  if (signal) {
    var paths = signal.querySelectorAll(".sig");
    var dot = signal.querySelector(".sig-dot");
    var W = 1000;
    var MID = 100;
    var STEP = 4;

    // 0 on the left (unmanaged), easing to 1 on the right (managed).
    var calmAt = function (u) {
      var k = Math.min(1, Math.max(0, (u - 0.38) / 0.24));
      return k * k * (3 - 2 * k);
    };
    var yAt = function (u, t) {
      var calm = calmAt(u);
      var chaos =
        (0.55 * Math.sin(u * 38 + t * 2.3) +
          0.35 * Math.sin(u * 71 - t * 3.1 + 1.3) +
          0.25 * Math.sin(u * 113 + t * 4.7 + 2.1)) *
        (0.6 + 0.4 * Math.sin(u * 9 + t * 1.7));
      var steady = Math.sin(u * 16 - t * 1.4);
      return MID + (1 - calm) * 70 * chaos + calm * 24 * steady;
    };
    var draw = function (t) {
      for (var i = 0; i < paths.length; i++) {
        // The two echoes are fainter copies a little behind in time and smaller.
        var lag = (paths.length - 1 - i) * 0.6;
        var scale = 1 - (paths.length - 1 - i) * 0.25;
        var d = "M0 " + yAt(0, t - lag).toFixed(1);
        for (var x = STEP; x <= W; x += STEP) {
          var y = MID + (yAt(x / W, t - lag) - MID) * scale;
          d += "L" + x + " " + y.toFixed(1);
        }
        paths[i].setAttribute("d", d);
      }
      if (dot) dot.style.top = (yAt(0.5, t) / 2).toFixed(2) + "%";
    };

    if (reduce) {
      draw(0);
    } else {
      // Only animate while the hero is on screen.
      var running = false;
      var loop = function (now) {
        if (!running) return;
        draw(now / 1000);
        requestAnimationFrame(loop);
      };
      var start = function (on) {
        if (on && !running) {
          running = true;
          requestAnimationFrame(loop);
        } else if (!on) {
          running = false;
        }
      };
      if (hasIO) {
        new IntersectionObserver(function (items) {
          start(items[0].isIntersecting);
        }).observe(signal);
      } else {
        start(true);
      }
    }
  }

  /* ---------- Booking: after the form is sent, swap it for the Calendly calendar ---------- */
  var CALENDLY_URL = "https://calendly.com/magdy314-work/free-audit?background_color=f7f5f0&primary_color=f2a33a";
  var CALENDLY_JS = "https://assets.calendly.com/assets/external/widget.js";

  function showBooking(lead) {
    var booking = document.getElementById("booking");
    var frame = document.getElementById("booking-frame");
    if (!booking || !frame) return;
    form.hidden = true;
    booking.hidden = false;
    var heading = document.getElementById("booking-h");
    if (heading) heading.focus();

    // Pre-fill the visitor's name and email in Calendly.
    var url =
      CALENDLY_URL +
      "&name=" + encodeURIComponent(lead.name || "") +
      "&email=" + encodeURIComponent(lead.email || "");
    var init = function () {
      window.Calendly.initInlineWidget({ url: url, parentElement: frame });
    };
    if (window.Calendly) return init();
    var script = document.createElement("script");
    script.src = CALENDLY_JS;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
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
                showBooking(payload);
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

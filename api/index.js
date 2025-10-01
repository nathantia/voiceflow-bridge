<style>
  /* Hidden state */
  [data-voiceflow-target="offer-banner"][data-visible="false"] { 
    display: none !important;
  }
  /* Visible state — force flex */
  [data-voiceflow-target="offer-banner"][data-visible="true"] {
    display: flex !important;
    opacity: 1;
    transition: opacity 200ms ease;
  }
  /* Start transparent */
  [data-voiceflow-target="offer-banner"] { opacity: 0; }
</style>

<script>
(function () {
  // ===== CONFIG =====
  var TARGET_VALUE = "offer-banner";                // must match attribute in Designer
  var TOKEN = "site-default-token";                 // must match Voiceflow POST
  var BASE  = "https://voiceflow-bridge.vercel.app";
  var POLL_MS = 3000;

  // ===== RUNTIME =====
  var STATUS_URL = BASE + "/api?op=status&token=" + encodeURIComponent(TOKEN);
  var CLEAR_URL  = BASE + "/api?op=clear&token=" + encodeURIComponent(TOKEN);

  function markHidden() {
    var els = document.querySelectorAll('[data-voiceflow-target="' + TARGET_VALUE + '"]');
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute("data-visible", "false");
      els[i].style.setProperty("display", "none", "important");
    }
  }

  function setTextSafely(node, text) {
    // basic sanitization: textContent avoids HTML injection
    try { node.textContent = text == null ? "" : String(text); } catch(e) {}
  }

  function populateData(payload) {
    if (!payload || typeof payload !== "object") return;
    // first_name field(s)
    var nameEls = document.querySelectorAll('[data-voiceflow-field="first_name"]');
    for (var i = 0; i < nameEls.length; i++) {
      setTextSafely(nameEls[i], payload.first_name || "");
    }
  }

  function reveal() {
    var els = document.querySelectorAll('[data-voiceflow-target="' + TARGET_VALUE + '"]');
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute("data-visible", "true");
      els[i].style.setProperty("display", "flex", "important");
      els[i].classList.remove("hidden");
    }
  }

  markHidden();

  var timer = setInterval(function () {
    fetch(STATUS_URL, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (data.show === true) {
          // inject dynamic fields first
          populateData(data.data);
          // then reveal UI
          reveal();
          clearInterval(timer);
          // clear the flag so it doesn't retrigger
          fetch(CLEAR_URL, { method: "GET", cache: "no-store" }).catch(function(){});
        }
      })
      .catch(function () {});
  }, POLL_MS);
})();
</script>

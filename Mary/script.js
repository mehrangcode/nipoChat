/* ===========================================================
   Mary ✿ — interactions
   =========================================================== */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- page navigation (client-side) ---------- */
  const pages    = $$("[data-page]");
  const navLinks = $$(".nav__links a");
  const menu     = $("#menu");
  const toggle   = $(".nav__toggle");

  function showPage(id, push = true) {
    const target = document.getElementById(id);
    if (!target) return;

    pages.forEach((p) => p.classList.toggle("active", p === target));
    navLinks.forEach((a) =>
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + id)
    );

    // re-run reveal for the newly shown page, then scroll up
    revealWithin(target);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (push && location.hash !== "#" + id) {
      history.pushState({ id }, "", "#" + id);
    }
    closeMenu();
  }

  // intercept every internal [data-link]
  $$("[data-link]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href").replace("#", "");
      if (document.getElementById(id)) {
        e.preventDefault();
        showPage(id);
      }
    });
  });

  window.addEventListener("popstate", () => {
    showPage((location.hash || "#home").slice(1), false);
  });

  /* ---------- mobile menu ---------- */
  function closeMenu() {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- scroll reveal ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.12 }
      )
    : null;

  function revealWithin(scope) {
    const items = $$(".reveal", scope);
    if (!io) { items.forEach((el) => el.classList.add("in")); return; }
    // stagger a little for a sweet cascade
    items.forEach((el, i) => {
      el.classList.remove("in");
      el.style.transitionDelay = Math.min(i * 70, 420) + "ms";
      io.observe(el);
    });
  }

  /* ---------- gallery filter ---------- */
  const chips = $$(".chip");
  const cards = $$("#grid .card");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      cards.forEach((card) => {
        const match = f === "all" || card.dataset.cat === f;
        card.classList.toggle("hide", !match);
      });
    });
  });

  /* ---------- lightbox ---------- */
  const lb     = $("#lightbox");
  const lbImg  = $("#lightbox-img");
  const lbCap  = $("#lightbox-cap");
  const lbClose = $(".lightbox__close");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const img = $("img", card);
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = card.dataset.title || "";
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
    });
  });
  function closeLb() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); }
  lbClose.addEventListener("click", closeLb);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

  /* ---------- contact form ---------- */
  const form  = $(".contact__form");
  const toast = $("#toast");
  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // NB: use explicit selectors — form.name resolves to the form's own
  // name attribute, not the <input name="name">.
  const fields = {
    name:    form.querySelector('[name="name"]'),
    email:   form.querySelector('[name="email"]'),
    message: form.querySelector('[name="message"]'),
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;

    const setErr = (key, msg) => {
      $(`[data-err="${key}"]`).textContent = msg;
      fields[key].classList.toggle("invalid", Boolean(msg));
      if (msg) ok = false;
    };

    setErr("name",    fields.name.value.trim()    ? "" : "Please tell me your name ♡");
    setErr("email",   emailRe.test(fields.email.value.trim()) ? "" : "A valid email, please ✿");
    setErr("message", fields.message.value.trim().length >= 5 ? "" : "Just a few more words 💬");

    if (ok) {
      form.reset();
      showToast("Yay! Your message is on its way 💌");
    }
  });

  // clear an error as soon as the user fixes it
  Object.entries(fields).forEach(([key, field]) => {
    field.addEventListener("input", () => {
      if (field.classList.contains("invalid")) {
        field.classList.remove("invalid");
        $(`[data-err="${key}"]`).textContent = "";
      }
    });
  });

  /* ---------- misc ---------- */
  $("#year").textContent = new Date().getFullYear();

  // initial route + first reveal
  const start = (location.hash || "#home").slice(1);
  showPage(document.getElementById(start) ? start : "home", false);
})();

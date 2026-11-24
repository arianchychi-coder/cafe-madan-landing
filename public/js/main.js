(() => {
  "use strict";

  const body = document.body;
  const hero = document.getElementById("hero");
  const openButton = document.getElementById("open-map");
  const expedition = document.getElementById("expedition");
  const atlas = document.getElementById("atlas");
  const mapViewport = document.getElementById("map-viewport");
  const mapSheet = document.getElementById("map-sheet");
  const mapStops = document.getElementById("map-stops");
  const journeyBar = document.querySelector(".journey-bar");
  const stops = [...document.querySelectorAll("[data-stop]")];
  const pins = [...document.querySelectorAll("[data-pin]")];
  const routeSvg = document.getElementById("map-route");
  const routeLine = document.getElementById("route-line");
  const routeShadow = document.getElementById("route-shadow");
  const progressTrack = document.querySelector(".journey-progress");
  const progressFill = document.getElementById("journey-progress-fill");
  const journeyCount = document.getElementById("journey-count");
  const readFill = document.getElementById("reading-line-fill");
  const form = document.getElementById("registration-form");
  const nameField = document.getElementById("full-name");
  const phoneField = document.getElementById("mobile");
  const checkoutPanel = document.getElementById("checkout-panel");
  const payButton = document.getElementById("payment-button");
  const status = document.getElementById("form-status");
  const couponField = document.getElementById("coupon-code");
  const applyCouponButton = document.getElementById("apply-coupon");
  const couponStatus = document.getElementById("coupon-status");
  const treasureReceipt = document.getElementById("treasure-receipt");
  const discountLine = document.getElementById("discount-line");
  const basePriceValue = document.getElementById("base-price-value");
  const discountAmount = document.getElementById("discount-amount");
  const finalPrice = document.getElementById("final-price");
  const payAmount = document.getElementById("pay-amount");
  const registrationEndpoint = "/register";
  const BASE_PRICE = 100_000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeStop = 0;
  let ticking = false;
  let routeLength = 1;
  let couponApplied = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const faNumber = value => String(value).replace(/[0-9]/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
  const toLatin = value => value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const toman = value => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;

  function unlockMap() {
    if (!body.classList.contains("locked")) return;
    openButton.disabled = true;
    openButton.setAttribute("aria-expanded", "true");
    hero.classList.add("is-opening");

    window.setTimeout(() => {
      expedition.hidden = false;
      expedition.inert = false;
      body.classList.remove("locked");
      openButton.disabled = false;
      syncAtlasGeometry();
      buildRoute();
      observeStops();
      requestScrollUpdate();
      window.setTimeout(() => atlas.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" }), 60);
    }, reducedMotion.matches ? 120 : 2050);
  }
  openButton.addEventListener("click", unlockMap);

  function setActiveStop(index) {
    activeStop = clamp(index, 0, stops.length - 1);
    stops.forEach((stop, i) => {
      stop.classList.toggle("is-active", i === activeStop);
      pins[i].classList.toggle("is-passed", i < activeStop);
    });
    journeyCount.innerHTML = `${faNumber(activeStop + 1)} <i>/</i> ${faNumber(stops.length)}`;
  }

  function observeStops() {
    if (!("IntersectionObserver" in window)) {
      setActiveStop(0);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => {
        const center = window.innerHeight * 0.49;
        const aDistance = Math.abs(a.boundingClientRect.top + a.boundingClientRect.height * 0.45 - center);
        const bDistance = Math.abs(b.boundingClientRect.top + b.boundingClientRect.height * 0.45 - center);
        return aDistance - bDistance;
      })[0];
      if (visible) setActiveStop(Number(visible.target.dataset.stop));
    }, { threshold: [0.12, 0.25, 0.42, 0.6], rootMargin: "-16% 0px -22% 0px" });
    stops.forEach(stop => observer.observe(stop));
  }

  function buildRoute() {
    const svgRect = routeSvg.getBoundingClientRect();
    if (!svgRect.width || !svgRect.height) return;
    routeSvg.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`);
    const points = pins.map(pin => {
      const rect = pin.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - svgRect.left, y: rect.top + rect.height / 2 - svgRect.top };
    });
    if (points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return;

    let path = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      const middleY = (previous.y + point.y) / 2;
      const mobile = window.innerWidth <= 720;
      const bend = Math.min(svgRect.width * (mobile ? 0.035 : 0.105), mobile ? 17 : 118);
      const side = index % 2 === 0 ? -1 : 1;
      path += ` C ${previous.x + side * bend} ${previous.y + (middleY - previous.y) * 0.7}, ${point.x + side * bend} ${middleY + (point.y - middleY) * 0.3}, ${point.x} ${point.y}`;
    });
    routeLine.setAttribute("d", path);
    routeShadow.setAttribute("d", path);
    routeLength = routeLine.getTotalLength();
    routeLine.style.strokeDasharray = String(routeLength);
    routeLine.style.strokeDashoffset = String(routeLength);
  }

  function syncAtlasGeometry() {
    const height = mapSheet.offsetHeight;
    if (height > 0) atlas.style.height = `${height}px`;
  }

  function routeProgress() {
    if (!pins.length) return 0;
    const first = pins[0].getBoundingClientRect();
    const last = pins[pins.length - 1].getBoundingClientRect();
    const firstCenter = first.top + first.height / 2;
    const lastCenter = last.top + last.height / 2;
    const focus = window.innerHeight * 0.56;
    return clamp((focus - firstCenter) / Math.max(1, lastCenter - firstCenter), 0, 1);
  }

  function updateScrollEffects() {
    ticking = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pageProgress = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
    readFill.style.transform = `scaleX(${pageProgress})`;
    if (body.classList.contains("locked")) return;

    const atlasRect = atlas.getBoundingClientRect();
    const barHeight = journeyBar.offsetHeight || 70;
    const viewportHeight = mapViewport.clientHeight || Math.max(1, window.innerHeight - barHeight);
    const travelDistance = Math.max(1, mapSheet.offsetHeight - viewportHeight);
    const mapOffset = clamp(barHeight - atlasRect.top, 0, travelDistance);
    const mapProgress = mapOffset / travelDistance;
    const mobile = window.innerWidth <= 720;
    const tilt = mobile ? 0.75 : 2.1;
    mapSheet.style.setProperty("--map-scroll-y", `${-mapOffset}px`);
    mapSheet.style.setProperty("--map-tilt-x", `${Math.sin(mapProgress * Math.PI * 2) * tilt}deg`);
    mapSheet.style.setProperty("--map-tilt-y", `${Math.sin(mapProgress * Math.PI) * (mobile ? -0.3 : -1.15)}deg`);
    mapSheet.style.setProperty("--map-lift", `${Math.sin(mapProgress * Math.PI) * -6}px`);

    const progress = routeProgress();
    routeLine.style.strokeDashoffset = String(routeLength * (1 - progress));
    progressFill.style.width = `${progress * 100}%`;
    progressTrack.setAttribute("aria-valuenow", String(Math.round(progress * 100)));

    stops.forEach((stop, index) => {
      const rect = stop.getBoundingClientRect();
      const focus = clamp((rect.top + rect.height * 0.5 - window.innerHeight * 0.52) / Math.max(window.innerHeight, 1), -0.8, 0.8);
      const image = stop.querySelector(".map-stop__image");
      const direction = index % 2 === 0 ? 1 : -1;
      image.style.setProperty("--image-tilt-x", `${focus * (mobile ? 2.4 : 3.8)}deg`);
      image.style.setProperty("--image-tilt-y", `${direction * (mobile ? 1.2 : 2.6)}deg`);
      image.style.setProperty("--image-lift", `${focus * (mobile ? 7 : 13)}px`);
    });
  }

  function requestScrollUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollEffects);
  }
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", () => {
    if (!expedition.hidden) {
      syncAtlasGeometry();
      buildRoute();
    }
    requestScrollUpdate();
  }, { passive: true });
  window.addEventListener("load", () => {
    if (!expedition.hidden) {
      syncAtlasGeometry();
      buildRoute();
    }
    requestScrollUpdate();
  }, { once: true });
  if ("ResizeObserver" in window) {
    const mapSizeObserver = new ResizeObserver(() => {
      if (expedition.hidden) return;
      syncAtlasGeometry();
      buildRoute();
      requestScrollUpdate();
    });
    mapSizeObserver.observe(mapSheet);
  }
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      if (expedition.hidden) return;
      syncAtlasGeometry();
      buildRoute();
      requestScrollUpdate();
    });
  }

  function normalizePhone(value) {
    return toLatin(value).replace(/\D/g, "");
  }
  function nameIsValid() {
    const name = nameField.value.trim().replace(/\s+/g, " ");
    return name.length >= 3 && /\p{L}/u.test(name);
  }
  function phoneIsValid() {
    const digits = normalizePhone(phoneField.value);
    return digits.length === 11 && /^09\d{9}$/.test(digits);
  }
  function constrainPhoneInput() {
    let digits = phoneField.value.replace(/[^0-9۰-۹٠-٩]/g, "");
    digits = Array.from(digits).slice(0, 11).join("");
    const latin = toLatin(digits);
    if (latin.length > 0 && latin[0] !== "0") digits = "";
    else if (latin.length > 1 && latin[1] !== "9") digits = Array.from(digits).slice(0, 1).join("");
    phoneField.value = digits;
  }
  function updatePrice() {
    const discount = couponApplied ? Math.round(BASE_PRICE * 0.1) : 0;
    const total = BASE_PRICE - discount;
    basePriceValue.textContent = new Intl.NumberFormat("fa-IR").format(BASE_PRICE);
    discountAmount.textContent = `−${toman(discount)}`;
    finalPrice.textContent = toman(total);
    payAmount.textContent = toman(total);
    discountLine.hidden = !couponApplied;
    treasureReceipt.classList.toggle("has-discount", couponApplied);
  }
  function setFieldValidity(field, errorId, valid, message, showError) {
    const error = document.getElementById(errorId);
    field.setAttribute("aria-invalid", String(showError && !valid));
    error.textContent = showError && !valid ? message : "";
  }
  function validateForm(showErrors = false) {
    const nameValid = nameIsValid();
    const phoneValid = phoneIsValid();
    setFieldValidity(nameField, "name-error", nameValid, "نام را کامل‌تر وارد کن (حداقل ۳ نویسه).", showErrors || nameField.dataset.touched === "true");
    setFieldValidity(phoneField, "phone-error", phoneValid, "شمارهٔ موبایل را با ۱۱ رقم و با ۰۹ وارد کن.", showErrors || phoneField.dataset.touched === "true");
    const valid = nameValid && phoneValid;
    checkoutPanel.hidden = !valid;
    if (!valid) status.textContent = "";
    return valid;
  }

  function applyCoupon() {
    if (!validateForm()) return;
    const code = couponField.value.trim().toLowerCase();
    if (!code) {
      couponApplied = false;
      couponStatus.classList.remove("is-success", "is-error");
      couponStatus.textContent = "اول کد تخفیف را وارد کن.";
      updatePrice();
      return;
    }
    if (code === "cafe-madan") {
      couponApplied = true;
      couponStatus.classList.remove("is-error");
      couponStatus.classList.add("is-success");
      couponStatus.textContent = "تبریک؛ کد معتبر است و ۱۰٪ تخفیف برای شما اعمال شد.";
    } else {
      couponApplied = false;
      couponStatus.classList.remove("is-success");
      couponStatus.classList.add("is-error");
      couponStatus.textContent = "متأسفانه نقشهٔ گنجت اشتباه است.";
    }
    updatePrice();
  }

  nameField.addEventListener("input", () => validateForm());
  phoneField.addEventListener("input", () => {
    constrainPhoneInput();
    validateForm();
  });
  couponField.addEventListener("input", () => {
    if (couponApplied) {
      couponApplied = false;
      updatePrice();
    }
    couponStatus.classList.remove("is-success", "is-error");
    couponStatus.textContent = "";
    if (couponField.value.trim().toLowerCase() === "cafe-madan") applyCoupon();
  });
  couponField.addEventListener("blur", () => {
    if (couponField.value.trim()) applyCoupon();
  });
  couponField.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyCoupon();
  });
  applyCouponButton.addEventListener("click", applyCoupon);
  [nameField, phoneField].forEach(field => field.addEventListener("blur", () => {
    field.dataset.touched = "true";
    validateForm();
  }));
  form.addEventListener("submit", event => {
    event.preventDefault();
    validateForm(true);
  });
  payButton.addEventListener("click", async () => {
    if (!validateForm(true)) return;
    payButton.disabled = true;
    status.classList.remove("error");
    status.textContent = "در حال ذخیرهٔ اطلاعات ثبت‌نام…";
    let registrationSaved = false;
    try {
      const response = await fetch(registrationEndpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: nameField.value.trim().replace(/\s+/g, " "),
          phone: normalizePhone(phoneField.value),
          coupon: couponApplied ? "cafe-madan" : ""
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(result.message || "ثبت‌نام انجام نشد. اطلاعات را بررسی کن.");
      }
      registrationSaved = true;
      status.textContent = "ثبت‌نامت با موفقیت ذخیره شد.";
      return;
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message || "ارتباط با سرور برقرار نشد. دوباره تلاش کن.";
      payButton.disabled = registrationSaved;
      if (registrationSaved) {
        const buttonLabel = payButton.querySelector("span:first-child");
        if (buttonLabel) buttonLabel.textContent = "ثبت‌نام ذخیره شد";
      }
    }
  });

  updatePrice();
  validateForm();
})();

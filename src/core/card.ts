import { type CardManifest, CardManifestSchema } from "./types";

export const CARD_STYLES = String.raw`
.holo-stage{--holo-ink:oklch(.18 .025 345);--holo-paper:oklch(.985 .008 345);--holo-rose:oklch(.64 .22 353);--holo-aqua:oklch(.79 .13 196);--holo-sun:oklch(.84 .16 86);--holo-violet:oklch(.65 .2 305);--holo-mint:oklch(.78 .13 160);--theme-soft:oklch(.93 .055 353);--holo-back-a:oklch(.34 .14 353);--holo-back-b:oklch(.13 .025 345);position:relative;perspective:1100px;display:grid;place-items:center;width:min(92vw,520px);color:var(--holo-ink);font-family:"Atkinson Hyperlegible Next",ui-sans-serif,system-ui,sans-serif;touch-action:pan-y}
.holo-stage--standalone{width:var(--card-width,min(94vw,560px));touch-action:none}
.holo-stage *{box-sizing:border-box}
.holo-flip-toggle{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.holo-card{--mx:50%;--my:50%;--posx:50%;--posy:50%;--active:0;--rx:0deg;--ry:0deg;--accent:var(--holo-rose);--frame-width:2px;position:relative;display:block;width:100%;aspect-ratio:5/7;border-radius:clamp(22px,5vw,32px);transform-style:preserve-3d;transform:rotateX(var(--rx)) rotateY(var(--ry));will-change:transform;cursor:pointer;-webkit-tap-highlight-color:transparent}
.holo-flip-toggle:focus-visible + .holo-card{outline:3px solid var(--holo-aqua);outline-offset:5px}
.holo-card[data-accent="aqua"]{--accent:var(--holo-aqua);--theme-soft:oklch(.92 .055 205);--holo-paper:oklch(.98 .018 205);--holo-back-a:oklch(.39 .12 205);--holo-back-b:oklch(.14 .035 220)}
.holo-card[data-accent="sun"]{--accent:var(--holo-sun);--theme-soft:oklch(.94 .07 86);--holo-paper:oklch(.985 .02 88);--holo-back-a:oklch(.47 .13 76);--holo-back-b:oklch(.16 .035 70)}
.holo-card[data-accent="violet"]{--accent:var(--holo-violet);--theme-soft:oklch(.92 .065 305);--holo-paper:oklch(.98 .018 305);--holo-back-a:oklch(.38 .14 305);--holo-back-b:oklch(.14 .035 310)}
.holo-card[data-accent="mint"]{--accent:var(--holo-mint);--theme-soft:oklch(.92 .055 160);--holo-paper:oklch(.98 .018 160);--holo-back-a:oklch(.39 .11 160);--holo-back-b:oklch(.14 .035 170)}
.holo-card[data-accent="custom"]{--accent:var(--custom-color);--theme-soft:color-mix(in oklch,var(--custom-color) 24%,white);--holo-paper:color-mix(in oklch,var(--custom-color) 10%,white);--holo-back-a:color-mix(in oklch,var(--custom-color) 58%,black);--holo-back-b:color-mix(in oklch,var(--custom-color) 18%,black)}
.holo-card{--holo:repeating-linear-gradient(125deg,oklch(.76 .18 25/.58) 0%,oklch(.88 .15 88/.58) 8%,oklch(.85 .17 145/.58) 16%,oklch(.85 .13 195/.58) 24%,oklch(.72 .16 265/.58) 32%,oklch(.76 .2 320/.58) 40%,oklch(.76 .18 25/.58) 48%)}
.holo-flipper{position:relative;display:block;width:100%;height:100%;padding:var(--frame-width);border-radius:clamp(22px,5vw,32px);transform-style:preserve-3d;transition:transform 1s cubic-bezier(.22,.9,.24,1);background:linear-gradient(145deg,oklch(.88 .018 345),white 18%,oklch(.75 .025 345) 42%,white 57%,oklch(.8 .02 345) 78%,white),var(--holo);background-blend-mode:overlay;background-size:100% 100%,300% 300%;background-position:0 0,var(--posx) var(--posy);box-shadow:0 45px 90px -34px oklch(.04 .02 345/.8),0 14px 34px -18px oklch(.04 .02 345/.55)}
.holo-card[data-frame="gold"],.holo-card[data-frame="prism"],.holo-card[data-frame="ink"],.holo-card[data-frame="copper"],.holo-card[data-frame="pearl"]{--frame-width:3px}
.holo-card[data-frame="gold"] .holo-flipper{background:linear-gradient(135deg,oklch(.7 .13 78),oklch(.95 .12 92) 18%,oklch(.58 .11 68) 43%,oklch(.92 .11 88) 66%,oklch(.52 .1 63));box-shadow:0 45px 90px -34px oklch(.18 .08 70/.85),0 14px 34px -18px oklch(.28 .1 75/.55)}
.holo-card[data-frame="prism"] .holo-flipper{background:var(--holo);background-size:260% 260%;background-position:var(--posx) var(--posy);box-shadow:0 45px 90px -34px color-mix(in oklch,var(--accent) 45%,black),0 0 24px color-mix(in oklch,var(--accent) 30%,transparent)}
.holo-card[data-frame="ink"] .holo-flipper{background:linear-gradient(145deg,oklch(.09 .02 345),color-mix(in oklch,var(--accent) 38%,oklch(.12 .02 345)),oklch(.06 .01 345));box-shadow:0 45px 90px -30px oklch(.02 0 0/.9),0 14px 34px -18px oklch(.02 0 0/.65)}
.holo-card[data-frame="copper"] .holo-flipper{background:linear-gradient(140deg,oklch(.43 .12 48),oklch(.78 .13 58) 20%,oklch(.5 .14 42) 44%,oklch(.83 .11 68) 66%,oklch(.38 .1 38));box-shadow:0 45px 90px -32px oklch(.22 .1 45/.82),0 10px 26px -14px oklch(.48 .14 50/.55)}
.holo-card[data-frame="pearl"] .holo-flipper{background:linear-gradient(135deg,oklch(.98 .025 330),oklch(.94 .045 210) 24%,white 46%,oklch(.95 .05 110) 68%,oklch(.97 .035 310));box-shadow:0 45px 90px -34px oklch(.38 .05 260/.48),0 0 24px oklch(.86 .08 220/.42)}
.holo-flip-toggle:checked + .holo-card .holo-flipper{transform:rotateY(180deg)}
.holo-face{position:absolute;inset:var(--frame-width);display:block;border-radius:calc(clamp(22px,5vw,32px) - var(--frame-width));overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:inset(0 round calc(clamp(22px,5vw,32px) - var(--frame-width)))}
.holo-face--front{transform:translateZ(0)}
.holo-face--back{transform:rotateY(180deg) translateZ(0)}
.holo-surface{position:relative;display:grid;grid-template-rows:minmax(0,var(--photo-height,56%)) minmax(0,1fr);height:100%;overflow:hidden;border-radius:inherit;clip-path:inherit;background:radial-gradient(120% 85% at 28% 0%,white 0 18%,transparent 58%),linear-gradient(155deg,color-mix(in oklch,var(--theme-soft) 42%,white),var(--theme-soft));box-shadow:inset 0 0 0 1px oklch(.25 .03 345/.08)}
.holo-surface::before,.holo-back::before{position:absolute;pointer-events:none;content:"";opacity:.3}
.holo-surface::before{z-index:1;inset:var(--photo-height,56%) 0 0}
.holo-back::before{z-index:1;inset:0;opacity:.2}
.holo-card[data-pattern="rays"] .holo-surface::before,.holo-card[data-pattern="rays"] .holo-back::before{background:repeating-conic-gradient(from -12deg at 50% 0%,color-mix(in oklch,var(--accent) 30%,transparent) 0 8deg,transparent 8deg 18deg)}
.holo-card[data-pattern="grid"] .holo-surface::before,.holo-card[data-pattern="grid"] .holo-back::before{background-image:linear-gradient(color-mix(in oklch,var(--accent) 28%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklch,var(--accent) 28%,transparent) 1px,transparent 1px);background-size:22px 22px}
.holo-card[data-pattern="sparkles"] .holo-surface::before,.holo-card[data-pattern="sparkles"] .holo-back::before{background-image:radial-gradient(circle,color-mix(in oklch,var(--accent) 60%,white) 0 1.5px,transparent 2px),radial-gradient(circle,color-mix(in oklch,var(--accent) 48%,transparent) 0 2px,transparent 2.5px);background-position:0 0,13px 17px;background-size:31px 37px,43px 47px}
.holo-card[data-pattern="waves"] .holo-surface::before,.holo-card[data-pattern="waves"] .holo-back::before{background:repeating-radial-gradient(ellipse at 50% 0%,transparent 0 15px,color-mix(in oklch,var(--accent) 32%,transparent) 16px 18px,transparent 19px 32px)}
.holo-card[data-pattern="stars"] .holo-surface::before,.holo-card[data-pattern="stars"] .holo-back::before{background-image:radial-gradient(circle,color-mix(in oklch,var(--accent) 70%,white) 0 1px,transparent 1.5px),radial-gradient(circle,color-mix(in oklch,var(--accent) 45%,transparent) 0 2px,transparent 2.5px),radial-gradient(circle,white 0 1px,transparent 1.5px);background-position:0 0,17px 11px,29px 31px;background-size:37px 43px,53px 61px,71px 79px}
.holo-photo-wrap{position:relative;margin:clamp(10px,3vw,16px);margin-bottom:0;overflow:hidden;border-radius:clamp(15px,3vw,21px);clip-path:inset(0 round clamp(15px,3vw,21px));background:linear-gradient(135deg,oklch(.87 .12 350),oklch(.85 .11 205));isolation:isolate}
.holo-photo-wrap.is-photo-editable{cursor:grab;touch-action:none}
.holo-photo-wrap.is-photo-editable:active{cursor:grabbing}
.holo-photo{width:100%;height:100%;display:block;object-fit:cover;object-position:var(--photo-x,50%) var(--photo-y,50%)}
.holo-copy{position:relative;z-index:4;display:flex;min-height:0;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;padding:clamp(18px,5vw,30px)}
.holo-occasion{margin:0 0 8px;color:oklch(.43 .06 345);font-size:clamp(.58rem,2.6vw,var(--occasion-size,.86rem));font-weight:700;letter-spacing:.02em}
.holo-title{margin:0;color:var(--holo-ink);font-family:"Bricolage Grotesque",ui-rounded,system-ui,sans-serif;font-size:clamp(1.2rem,7vw,var(--title-size,3rem));font-weight:680;letter-spacing:-.035em;line-height:.97;text-wrap:balance;overflow-wrap:anywhere}
.holo-message{margin:clamp(10px,2.5vw,18px) 0 0;color:oklch(.29 .035 345);font-size:clamp(.68rem,3.4vw,var(--message-size,1.13rem));line-height:1.36;text-wrap:pretty;white-space:pre-wrap;overflow-wrap:anywhere}
.holo-signature{align-self:flex-end;max-width:82%;margin:auto 0 0;padding-top:10px;color:oklch(.38 .07 345);font-size:var(--signature-size,1rem);font-weight:700;text-align:right}
.holo-copy [contenteditable="true"]{border-radius:6px;outline:none;cursor:text;transition:background 150ms ease,box-shadow 150ms ease}
.holo-copy [contenteditable="true"]:hover{background:oklch(1 0 0/.58)}
.holo-copy [contenteditable="true"]:focus{background:white;box-shadow:0 0 0 3px color-mix(in oklch,var(--accent) 24%,transparent)}
.holo-copy [contenteditable="true"]:empty::before{color:oklch(.5 .025 345);content:attr(data-placeholder)}
.holo-chip{position:absolute;z-index:12;right:clamp(18px,5vw,28px);top:clamp(18px,5vw,28px);min-height:36px;display:inline-flex;align-items:center;padding:7px 11px;border:1px solid oklch(1 0 0/.65);border-radius:999px;background:oklch(.15 .02 345/.72);box-shadow:0 6px 18px oklch(.05 0 0/.18);color:white;font-size:.78rem;font-weight:700;text-decoration:none;backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent}
.holo-chip:focus-visible{outline:3px solid var(--holo-aqua);outline-offset:3px}
.holo-foil,.holo-lines,.holo-glare,.holo-photo-foil,.holo-sparkle{position:absolute;inset:0;z-index:5;pointer-events:none}
.holo-foil{background-image:var(--holo);background-size:260% 260%;background-position:var(--posx) var(--posy);mix-blend-mode:overlay;opacity:calc(.22 + var(--active)*.52);mask-image:radial-gradient(circle at var(--mx) var(--my),#000 0%,#0005 32%,transparent 62%)}
.holo-lines{background-image:repeating-linear-gradient(100deg,transparent 0 3px,white 3px 4px);background-size:200% 100%;background-position:var(--posx) 0;mix-blend-mode:overlay;opacity:calc(var(--active)*.24)}
.holo-glare{background:radial-gradient(circle at var(--mx) var(--my),white,transparent 43%);mix-blend-mode:soft-light;opacity:calc(var(--active)*.9)}
.holo-photo-foil{background-image:var(--holo);background-size:220% 220%;background-position:var(--posx) var(--posy);mix-blend-mode:color-dodge;opacity:calc(.1 + var(--active)*.45)}
.holo-sparkle{background-image:radial-gradient(circle at 20% 35%,white 0,transparent 1px),radial-gradient(circle at 68% 12%,oklch(.9 .08 220) 0,transparent 1px),radial-gradient(circle at 82% 74%,oklch(.94 .09 85) 0,transparent 1px);background-size:47px 61px,71px 53px,59px 79px;background-position:var(--posx) var(--posy),calc(100% - var(--posx)) var(--posy),var(--posx) calc(100% - var(--posy));mix-blend-mode:color-dodge;opacity:calc(.1 + var(--active)*.75)}
.holo-back{position:relative;display:grid;place-items:center;width:100%;height:100%;overflow:hidden;border-radius:inherit;clip-path:inherit;background:radial-gradient(circle at 50% 42%,var(--holo-back-a),var(--holo-back-b) 72%)}
.holo-back-logo{position:relative;z-index:4;color:white;font-family:"Bricolage Grotesque",ui-rounded,system-ui,sans-serif;font-size:clamp(2.4rem,11vw,4.6rem);font-weight:760;letter-spacing:-.055em}
.holo-back-logo span{color:var(--holo-aqua)}
.holo-back-foil,.holo-back-glare{position:absolute;inset:0;pointer-events:none}
.holo-back-foil{z-index:2;background-image:var(--holo);background-size:240% 240%;background-position:var(--posx) var(--posy);mix-blend-mode:color-dodge;opacity:calc(.25 + var(--active)*.55)}
.holo-back-glare{z-index:3;background:radial-gradient(circle at var(--mx) var(--my),oklch(1 0 0/.7),transparent 44%);mix-blend-mode:screen;opacity:calc(.16 + var(--active)*.65)}
.holo-card[data-template="confetti"] .holo-copy{background:radial-gradient(circle at 15% 20%,var(--accent) 0 3px,transparent 4px),radial-gradient(circle at 86% 36%,var(--holo-aqua) 0 2px,transparent 3px),radial-gradient(circle at 73% 80%,var(--holo-sun) 0 3px,transparent 4px);background-size:54px 62px,70px 66px,82px 74px}
.holo-card[data-template="keepsake"] .holo-surface{background:linear-gradient(160deg,white,oklch(.94 .018 345))}
.holo-card[data-template="keepsake"] .holo-photo-wrap{border-radius:clamp(15px,3vw,21px)}
.holo-card[data-template="aurora"] .holo-photo-wrap::after{content:"";position:absolute;inset:auto -15% -25% -15%;height:55%;background:radial-gradient(ellipse,var(--accent),transparent 68%);mix-blend-mode:screen;opacity:.5}
@media (pointer:coarse){.holo-foil,.holo-lines,.holo-glare,.holo-photo-foil,.holo-sparkle,.holo-back-foil,.holo-back-glare{mix-blend-mode:normal}.holo-lines{opacity:calc(var(--active)*.14)}.holo-photo-foil,.holo-back-foil{opacity:calc(.12 + var(--active)*.32)}}
@media (hover:none){.holo-photo-foil,.holo-sparkle,.holo-back-foil{animation:holo-idle 7s ease-in-out infinite}}
@keyframes holo-idle{0%,100%{background-position:35% 45%}50%{background-position:70% 58%}}
@media (prefers-reduced-motion:reduce){.holo-card{transform:none!important;will-change:auto}.holo-flipper{transition:none}.holo-photo-foil,.holo-sparkle,.holo-back-foil{animation:none}.holo-glare,.holo-lines,.holo-back-glare{display:none}}
`;

const INTERACTION_SCRIPT = String.raw`
(() => {
  const stage = document.querySelector(".holo-stage");
  const card = document.querySelector(".holo-card");
  const reveal = document.querySelector(".holo-reveal");
  const revealButton = document.querySelector(".holo-reveal-button");
  const publishedCard = document.querySelector(".holo-published-card");
  const copy = card?.querySelector(".holo-copy");
  if (!stage || !card) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const state = {
    rx: 0, ry: 0, tx: 0, ty: 0, active: false, raf: 0,
    dragging: false, moved: false, startX: 0, startY: 0,
    baseBeta: null, baseGamma: null, orientationReceiving: false,
    orientationEnabled: false, permissionAttempted: false
  };
  const revealGesture = {
    dragging: false, opened: false, pointerId: null,
    startX: 0, startY: 0, dx: 0, dy: 0
  };

  const applyCopyScale = (scale) => {
    card.style.setProperty("--title-size", (3 * scale).toFixed(2) + "rem");
    card.style.setProperty("--message-size", (1.13 * scale).toFixed(2) + "rem");
    card.style.setProperty("--occasion-size", (.86 * scale).toFixed(2) + "rem");
    card.style.setProperty("--signature-size", scale.toFixed(2) + "rem");
  };
  const fitCopy = () => {
    if (!copy) return;
    let scale = 1;
    applyCopyScale(scale);
    void copy.offsetHeight;
    while (copy.scrollHeight > copy.clientHeight + 1 && scale > .55) {
      scale = Math.max(.55, scale - .03);
      applyCopyScale(scale);
      void copy.offsetHeight;
    }
  };

  const setViewport = () => {
    const height = window.innerHeight;
    document.documentElement.style.setProperty("--app-height", height + "px");
    document.documentElement.style.setProperty(
      "--card-width",
      Math.max(220, Math.min(window.innerWidth - 24, (height - 24) * 5 / 7, 560)) + "px"
    );
    requestAnimationFrame(fitCopy);
  };
  if (stage.classList.contains("holo-stage--standalone")) {
    setViewport();
    addEventListener("resize", setViewport);
    addEventListener("orientationchange", () => setTimeout(setViewport, 80));
  }

  const resetRevealDrag = () => {
    reveal?.style.setProperty("--reveal-top-drag", "0px");
    reveal?.style.setProperty("--reveal-bottom-drag", "0px");
    reveal?.style.setProperty("--reveal-copy-shift", "0px");
  };
  revealButton?.addEventListener("pointerdown", (event) => {
    if (revealGesture.opened) return;
    reveal?.classList.add("is-dragging");
    revealGesture.dragging = true;
    revealGesture.pointerId = event.pointerId;
    revealGesture.startX = event.clientX;
    revealGesture.startY = event.clientY;
    revealGesture.dx = 0;
    revealGesture.dy = 0;
    revealButton.setPointerCapture?.(event.pointerId);
  });
  reveal?.addEventListener("pointermove", (event) => {
    const box = reveal.getBoundingClientRect();
    reveal.style.setProperty("--reveal-x", ((event.clientX - box.left) / box.width * 100).toFixed(1) + "%");
    reveal.style.setProperty("--reveal-y", ((event.clientY - box.top) / box.height * 100).toFixed(1) + "%");
    if (!revealGesture.dragging || revealGesture.opened) return;
    revealGesture.dx = event.clientX - revealGesture.startX;
    revealGesture.dy = event.clientY - revealGesture.startY;
    const progress = Math.min(1, Math.abs(revealGesture.dx) / (box.width * .36));
    reveal.style.setProperty("--reveal-top-drag", (-progress * 12).toFixed(1) + "px");
    reveal.style.setProperty("--reveal-bottom-drag", (progress * 12).toFixed(1) + "px");
    reveal.style.setProperty("--reveal-copy-shift", (revealGesture.dx * .12).toFixed(1) + "px");
    event.preventDefault();
  });
  reveal?.addEventListener("pointerleave", () => {
    if (revealGesture.dragging) return;
    reveal.style.setProperty("--reveal-x", "50%");
    reveal.style.setProperty("--reveal-y", "42%");
  });

  const applyLight = (rx, ry) => {
    const x = Math.max(0, Math.min(100, 50 + (ry / 14) * 48));
    const y = Math.max(0, Math.min(100, 50 - (rx / 14) * 48));
    const strength = Math.min(1, (Math.abs(rx) + Math.abs(ry)) / 18);
    card.style.setProperty("--mx", x.toFixed(1) + "%");
    card.style.setProperty("--my", y.toFixed(1) + "%");
    card.style.setProperty("--posx", (20 + x * .6).toFixed(1) + "%");
    card.style.setProperty("--posy", (20 + y * .6).toFixed(1) + "%");
    card.style.setProperty("--active", Math.max(strength, state.active ? .35 : 0).toFixed(2));
  };

  const tick = () => {
    state.rx += (state.tx - state.rx) * .12;
    state.ry += (state.ty - state.ry) * .12;
    card.style.setProperty("--rx", state.rx.toFixed(3) + "deg");
    card.style.setProperty("--ry", state.ry.toFixed(3) + "deg");
    applyLight(state.rx, state.ry);
    if (Math.abs(state.tx-state.rx)>.02 || Math.abs(state.ty-state.ry)>.02) {
      state.raf=requestAnimationFrame(tick);
    } else {
      state.raf=0;
    }
  };
  const loop = () => { if (!state.raf) state.raf=requestAnimationFrame(tick); };
  const setTarget = (rx, ry, active = true) => {
    state.tx = Math.max(-14, Math.min(14, rx));
    state.ty = Math.max(-14, Math.min(14, ry));
    state.active = active;
    loop();
  };

  stage.addEventListener("pointerdown", (event) => {
    if (reduceMotion || finePointer || state.orientationReceiving) return;
    state.dragging = true;
    state.moved = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    card.setPointerCapture?.(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (reduceMotion) return;
    const box = card.getBoundingClientRect();
    if (finePointer && event.buttons === 0) {
      const x = (event.clientX-box.left)/box.width;
      const y = (event.clientY-box.top)/box.height;
      setTarget((.5-y)*28, (x-.5)*28);
      return;
    }
    if (state.dragging && !state.orientationReceiving) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (Math.hypot(dx, dy) > 7) state.moved = true;
      setTarget((-dy / box.height) * 28, (dx / box.width) * 28);
    }
  });

  const endDrag = () => {
    if (!state.dragging) return;
    state.dragging = false;
    setTarget(0, 0, false);
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerleave", () => {
    if (finePointer) setTarget(0, 0, false);
  });

  const onOrientation = (event) => {
    if (event.beta == null || event.gamma == null) return;
    if (state.baseBeta == null) {
      state.baseBeta = event.beta;
      state.baseGamma = event.gamma;
    }
    state.orientationReceiving = true;
    setTarget(-(event.beta - state.baseBeta) * .45, (event.gamma - state.baseGamma) * .45);
  };

  const enableOrientation = () => {
    if (state.orientationEnabled || reduceMotion) return;
    state.orientationEnabled = true;
    addEventListener("deviceorientation", onOrientation);
  };

  const requestOrientation = () => {
    if (reduceMotion || state.permissionAttempted || !window.DeviceOrientationEvent) return;
    state.permissionAttempted = true;
    const Orientation = window.DeviceOrientationEvent;
    if (typeof Orientation.requestPermission === "function") {
      Orientation.requestPermission().then((permission) => {
        if (permission === "granted") enableOrientation();
      }).catch(() => {});
    } else {
      enableOrientation();
    }
  };

  card.addEventListener("click", (event) => {
    if (state.moved) {
      event.preventDefault();
      state.moved = false;
      return;
    }
    requestOrientation();
  });

  const openPublishedCard = () => {
    if (revealGesture.opened) return;
    revealGesture.opened = true;
    revealGesture.dragging = false;
    requestOrientation();
    publishedCard?.removeAttribute("inert");
    publishedCard?.removeAttribute("aria-hidden");
    publishedCard?.setAttribute("data-revealed", "true");
    revealButton?.setAttribute("disabled", "");
    reveal?.classList.add("is-opening");
    setTimeout(() => reveal?.setAttribute("hidden", ""), reduceMotion ? 0 : 1150);
  };

  const finishRevealSwipe = (event, cancelled = false) => {
    if (!revealGesture.dragging || revealGesture.opened) return;
    revealGesture.dragging = false;
    reveal?.classList.remove("is-dragging");
    if (revealGesture.pointerId != null) {
      revealButton?.releasePointerCapture?.(revealGesture.pointerId);
    }
    const box = reveal?.getBoundingClientRect();
    const enoughDistance = box ? Math.abs(revealGesture.dx) >= box.width * .32 : false;
    const horizontal = Math.abs(revealGesture.dx) > Math.abs(revealGesture.dy) * 1.15;
    if (!cancelled && enoughDistance && horizontal) {
      openPublishedCard();
    } else {
      resetRevealDrag();
    }
    event?.preventDefault?.();
  };
  revealButton?.addEventListener("pointerup", (event) => finishRevealSwipe(event));
  revealButton?.addEventListener("pointercancel", (event) => finishRevealSwipe(event, true));
  revealButton?.addEventListener("click", () => {
    if (finePointer) openPublishedCard();
  });
  revealButton?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPublishedCard();
    }
  });
})();
`;

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "meu-holocard";
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

export function parseManifest(value: unknown): CardManifest {
  return CardManifestSchema.parse(value);
}

export function renderCardMarkup(
  manifestInput: CardManifest,
  photoUrl: string,
  productUrl = "/",
): string {
  const manifest = parseManifest(manifestInput);
  return `<div class="holo-stage holo-stage--standalone">
  <input class="holo-flip-toggle" id="holo-flip" type="checkbox" aria-label="Virar o cartão" />
  <label class="holo-card" for="holo-flip" data-template="${manifest.template}" data-accent="${manifest.accent}" data-frame="${manifest.frame}" data-pattern="${manifest.pattern}" style="--photo-height:${manifest.photoHeight}%;--photo-x:${manifest.photoPositionX}%;--photo-y:${manifest.photoPositionY}%;--custom-color:${manifest.customColor}">
    <span class="holo-flipper">
      <span class="holo-face holo-face--front">
        <span class="holo-surface">
          <span class="holo-photo-wrap">
            <img class="holo-photo" src="${escapeHtml(photoUrl)}" alt="" />
            <span class="holo-photo-foil" aria-hidden="true"></span>
            <span class="holo-sparkle" aria-hidden="true"></span>
          </span>
          <span class="holo-copy">
            <span class="holo-occasion">${escapeHtml(manifest.occasion)}</span>
            <span class="holo-title">${escapeHtml(manifest.title)}</span>
            <span class="holo-message">${escapeHtml(manifest.message)}</span>
            ${manifest.signature ? `<span class="holo-signature">${escapeHtml(manifest.signature)}</span>` : ""}
          </span>
          <span class="holo-foil" aria-hidden="true"></span>
          <span class="holo-lines" aria-hidden="true"></span>
          <span class="holo-glare" aria-hidden="true"></span>
        </span>
      </span>
      <span class="holo-face holo-face--back">
        <span class="holo-back">
          <span class="holo-back-foil" aria-hidden="true"></span>
          <span class="holo-back-glare" aria-hidden="true"></span>
          <span class="holo-back-logo">holocard <span>✦</span></span>
        </span>
      </span>
    </span>
  </label>
  <a class="holo-chip" href="${escapeHtml(productUrl)}" aria-label="Abrir a página do Holocard">
    holocard ✦
  </a>
</div>`;
}

interface RenderDocumentOptions {
  photoUrl: string;
  canonicalUrl?: string;
  socialImageUrl?: string;
  productUrl?: string;
}

export function renderCardDocument(
  manifestInput: CardManifest,
  options: RenderDocumentOptions,
): string {
  const manifest = parseManifest(manifestInput);
  const canonicalUrl = options.canonicalUrl ?? "";
  const socialImageUrl = options.socialImageUrl ?? options.photoUrl;
  const productUrl = options.productUrl ?? "/";
  const assetOrigin = productUrl.replace(/\/$/, "");
  const title = `${manifest.title} · Holocard`;
  const description = manifest.message.replace(/\s+/g, " ").slice(0, 180);
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: manifest.title,
    description,
    inLanguage: manifest.locale,
    url: canonicalUrl || undefined,
    image: socialImageUrl,
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="${escapeHtml(manifest.locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <link rel="icon" href="${escapeHtml(`${assetOrigin}/favicon.svg`)}" type="image/svg+xml" />
  <link rel="mask-icon" href="${escapeHtml(`${assetOrigin}/favicon.svg`)}" color="#e72e83" />
  <link rel="apple-touch-icon" href="${escapeHtml(`${assetOrigin}/apple-touch-icon.png`)}" />
  <link rel="manifest" href="${escapeHtml(`${assetOrigin}/site.webmanifest`)}" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#2b1521" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(socialImageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="${escapeHtml(manifest.locale.replace("-", "_"))}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(socialImageUrl)}" />
  ${canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" /><meta property="og:url" content="${escapeHtml(canonicalUrl)}" />` : ""}
  <script type="application/ld+json">${structuredData}</script>
  <style>${CARD_STYLES}
  html,body{margin:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none}
  body{--reveal-a:oklch(.4 .17 353);--reveal-b:oklch(.13 .025 345);margin:0;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 18% 12%,oklch(.49 .19 353),transparent 34%),radial-gradient(circle at 82% 82%,oklch(.45 .12 204),transparent 38%),oklch(.13 .025 345)}
  body[data-accent="aqua"]{--reveal-a:oklch(.43 .14 205);--reveal-b:oklch(.13 .03 220);background:radial-gradient(circle at 18% 12%,oklch(.5 .13 205),transparent 34%),radial-gradient(circle at 82% 82%,oklch(.44 .14 255),transparent 38%),oklch(.13 .03 220)}
  body[data-accent="sun"]{--reveal-a:oklch(.5 .15 76);--reveal-b:oklch(.15 .035 65);background:radial-gradient(circle at 18% 12%,oklch(.56 .14 76),transparent 34%),radial-gradient(circle at 82% 82%,oklch(.46 .14 25),transparent 38%),oklch(.14 .035 65)}
  body[data-accent="violet"]{--reveal-a:oklch(.43 .17 305);--reveal-b:oklch(.13 .03 310);background:radial-gradient(circle at 18% 12%,oklch(.49 .17 305),transparent 34%),radial-gradient(circle at 82% 82%,oklch(.43 .14 265),transparent 38%),oklch(.13 .03 310)}
  body[data-accent="mint"]{--reveal-a:oklch(.43 .12 160);--reveal-b:oklch(.13 .03 175);background:radial-gradient(circle at 18% 12%,oklch(.48 .12 160),transparent 34%),radial-gradient(circle at 82% 82%,oklch(.42 .11 200),transparent 38%),oklch(.13 .03 175)}
  body[data-accent="custom"]{--reveal-a:color-mix(in oklch,var(--custom-color) 58%,black);--reveal-b:color-mix(in oklch,var(--custom-color) 16%,black);background:radial-gradient(circle at 18% 12%,color-mix(in oklch,var(--custom-color) 72%,white),transparent 34%),radial-gradient(circle at 82% 82%,color-mix(in oklch,var(--custom-color) 54%,black),transparent 38%),color-mix(in oklch,var(--custom-color) 14%,black)}
  .page{position:fixed;inset:0;box-sizing:border-box;display:grid;place-items:center;width:100%;height:var(--app-height,100svh);overflow:hidden;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
  .holo-published-card,.holo-reveal{grid-area:1/1}
  .holo-published-card{display:grid;place-items:center;opacity:0;filter:blur(12px);transform:scale(.92)}
  .holo-published-card[data-revealed="true"]{animation:holo-card-uncover 800ms cubic-bezier(.16,1,.3,1) both}
  .holo-reveal{--reveal-x:50%;--reveal-y:42%;position:relative;z-index:20;width:var(--card-width,min(94vw,560px));aspect-ratio:5/7;filter:drop-shadow(0 32px 46px oklch(.04 0 0/.48))}
  .holo-reveal-button{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;border-radius:clamp(22px,5vw,32px);overflow:visible;background:transparent;color:white;font:inherit;cursor:grab;touch-action:none;box-shadow:inset 0 0 0 2px oklch(1 0 0/.64),inset 0 0 34px oklch(1 0 0/.12);-webkit-tap-highlight-color:transparent}
  .holo-reveal-button:active{cursor:grabbing}
  @media (hover:hover) and (pointer:fine){.holo-reveal-button,.holo-reveal-button:active{cursor:pointer}}
  .holo-reveal-button:focus-visible{outline:3px solid white;outline-offset:6px}
  .holo-reveal-half{position:absolute;left:0;width:100%;height:50%;overflow:hidden;background:var(--reveal-b);transition:transform 180ms cubic-bezier(.25,1,.5,1);will-change:transform,opacity}
  .holo-reveal.is-dragging .holo-reveal-half{transition:none}
  .holo-reveal-half::before,.holo-reveal-half::after{position:absolute;left:0;width:100%;height:200%;content:""}
  .holo-reveal-half::before{background:radial-gradient(circle at var(--reveal-x) var(--reveal-y),oklch(1 0 0/.52),transparent 36%),repeating-linear-gradient(125deg,oklch(.78 .18 22/.34) 0%,oklch(.9 .15 90/.32) 8%,oklch(.84 .15 155/.3) 16%,oklch(.82 .13 205/.34) 24%,oklch(.7 .17 275/.34) 32%,oklch(.76 .19 325/.34) 40%,oklch(.78 .18 22/.34) 48%),linear-gradient(145deg,var(--reveal-a),var(--reveal-b));background-blend-mode:soft-light,color-dodge,normal;background-size:100% 100%,280% 280%,100% 100%;background-position:center,var(--reveal-x) var(--reveal-y),center}
  .holo-reveal-half::after{background-image:radial-gradient(circle,oklch(1 0 0/.7) 0 1px,transparent 1.5px),radial-gradient(circle,oklch(.88 .12 205/.7) 0 1px,transparent 1.5px),repeating-linear-gradient(125deg,transparent 0 14px,oklch(1 0 0/.065) 14px 15px,transparent 15px 30px);background-position:0 0,13px 17px,0 0;background-size:31px 37px,43px 47px,auto;mix-blend-mode:color-dodge;opacity:.26;animation:holo-reveal-foil 7s ease-in-out infinite}
  .holo-reveal-half--top{top:0;border-radius:clamp(22px,5vw,32px) clamp(22px,5vw,32px) 0 0;transform:translateY(var(--reveal-top-drag,0))}
  .holo-reveal-half--bottom{bottom:0;border-radius:0 0 clamp(22px,5vw,32px) clamp(22px,5vw,32px);transform:translateY(var(--reveal-bottom-drag,0))}
  .holo-reveal-half--top::before,.holo-reveal-half--top::after{top:0}
  .holo-reveal-half--bottom::before,.holo-reveal-half--bottom::after{bottom:0}
  .holo-reveal-line{position:absolute;z-index:3;top:50%;left:10%;width:80%;height:1px;background:linear-gradient(90deg,transparent,oklch(1 0 0/.9) 18%,oklch(1 0 0/.9) 82%,transparent);box-shadow:0 0 22px white;transform-origin:center}
  .holo-reveal-line::after{position:absolute;top:50%;left:50%;width:20px;height:20px;background:white;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);content:"";filter:drop-shadow(0 0 10px white);transform:translate(-50%,-50%)}
  .holo-reveal-copy{position:absolute;z-index:4;inset:0;text-align:center;text-shadow:0 2px 14px oklch(.05 0 0/.45);pointer-events:none}
  .holo-reveal-copy strong{position:absolute;right:10%;bottom:56%;left:10%;font-family:ui-rounded,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:clamp(1.75rem,7vw,2.65rem);font-weight:760;letter-spacing:-.045em;line-height:.98;text-wrap:balance}
  .holo-reveal-copy small{position:absolute;top:56%;right:10%;left:10%;font-size:.92rem;font-weight:650;letter-spacing:0;transform:translateX(var(--reveal-copy-shift,0));transition:transform 120ms ease}
  .holo-reveal-instruction--desktop{display:none}
  @media (hover:hover) and (pointer:fine){.holo-reveal-instruction--touch{display:none}.holo-reveal-instruction--desktop{display:inline}}
  .holo-reveal.is-opening .holo-reveal-half--top{animation:holo-reveal-top 1050ms cubic-bezier(.65,0,.35,1) forwards}
  .holo-reveal.is-opening .holo-reveal-half--bottom{animation:holo-reveal-bottom 1050ms cubic-bezier(.65,0,.35,1) forwards}
  .holo-reveal.is-opening .holo-reveal-line{animation:holo-reveal-line 600ms cubic-bezier(.16,1,.3,1) forwards}
  .holo-reveal.is-opening .holo-reveal-copy{animation:holo-reveal-copy 180ms ease forwards}
  @keyframes holo-reveal-top{0%{transform:translateY(var(--reveal-top-drag,0))}18%{transform:translateY(-2%)}100%{opacity:0;transform:translateY(-115%) rotateX(-10deg)}}
  @keyframes holo-reveal-bottom{0%{transform:translateY(var(--reveal-bottom-drag,0))}18%{transform:translateY(2%)}100%{opacity:0;transform:translateY(115%) rotateX(10deg)}}
  @keyframes holo-reveal-line{0%{opacity:.6;transform:scaleX(.18)}45%{opacity:1;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1.08)}}
  @keyframes holo-reveal-copy{to{opacity:0;transform:scale(.96)}}
  @keyframes holo-reveal-foil{0%,100%{background-position:0 0,13px 17px;filter:hue-rotate(0deg)}50%{background-position:20px 14px,-8px 31px;filter:hue-rotate(35deg)}}
  @keyframes holo-card-uncover{from{opacity:0;filter:blur(12px);transform:scale(.92)}to{opacity:1;filter:blur(0);transform:scale(1)}}
  @media (pointer:coarse){.holo-reveal-half::after{mix-blend-mode:screen}}
  @media (prefers-reduced-motion:reduce){.holo-reveal-half::after{animation:none}.holo-published-card[data-revealed="true"]{animation:none;opacity:1;filter:none;transform:none}.holo-reveal.is-opening .holo-reveal-half,.holo-reveal.is-opening .holo-reveal-line,.holo-reveal.is-opening .holo-reveal-copy{display:none;animation:none}}
  </style>
</head>
<body data-accent="${manifest.accent}" style="--custom-color:${manifest.customColor}">
  <main class="page">
    <div class="holo-published-card" inert aria-hidden="true">
      ${renderCardMarkup(manifest, options.photoUrl, productUrl)}
    </div>
    <div class="holo-reveal">
      <button class="holo-reveal-button" type="button" aria-label="Deslize para abrir o cartão e ativar movimento">
        <span class="holo-reveal-half holo-reveal-half--top" aria-hidden="true"></span>
        <span class="holo-reveal-half holo-reveal-half--bottom" aria-hidden="true"></span>
        <span class="holo-reveal-line" aria-hidden="true"></span>
        <span class="holo-reveal-copy">
          <strong>Tem um cartão para você.</strong>
          <small>
            <span class="holo-reveal-instruction--touch">Deslize para abrir</span>
            <span class="holo-reveal-instruction--desktop">Clique para abrir</span>
          </small>
        </span>
      </button>
    </div>
  </main>
  <noscript><style>.holo-reveal{display:none}.holo-published-card{opacity:1;filter:none;transform:none}</style></noscript>
  <script>${INTERACTION_SCRIPT}</script>
</body>
</html>`;
}

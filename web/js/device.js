// What kind of device this is, so the page can lay itself out for phones, tablets and desktops
// (the same idea as a separate phone layout, but one game for every screen).
//   phone:   touch screen, short side under 600 px   -> compact title screen, big touch buttons, rotate hint
//   tablet:  touch screen, larger                    -> roomy layout, big touch buttons
//   desktop: mouse and keyboard                      -> keyboard hints
// `app` is true when running installed (home screen / store app) rather than in a browser tab.
export const device = { kind: 'desktop', touch: false, portrait: false, app: false };

function detect() {
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  device.touch = !!(coarse || ('ontouchstart' in window && navigator.maxTouchPoints > 0));
  const short = Math.min(window.innerWidth, window.innerHeight);
  device.kind = device.touch ? (short < 600 ? 'phone' : 'tablet') : 'desktop';
  device.portrait = window.innerHeight > window.innerWidth;
  device.app = !!((window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches))
    || navigator.standalone || /[?&]app\b/.test(location.search));
  const d = document.documentElement.dataset;
  d.device = device.kind; d.touch = device.touch; d.portrait = device.portrait; d.app = device.app;
}
detect();
window.addEventListener('resize', detect);
window.addEventListener('orientationchange', detect);

/** iPhone/iPad Safari: no install prompt, the player adds it from the Share menu. */
export const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

import { DEMO_VIEWS, enabledViews, findView } from './views.js';
import { buildTargetUrl, isHiddenPath } from './route-map.js';

const TAG = 'vipcar-demo-switcher';

const STYLES = `
:host{all:initial;position:fixed;left:0;top:50%;z-index:2147483000;transform:translateY(-50%);font:500 13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f4f4f2}
:host([hidden]){display:none}
*{box-sizing:border-box}
.toggle{display:grid;place-items:center;width:30px;height:42px;padding:0;border:1px solid #2e312c;border-left:0;border-radius:0 6px 6px 0;background:#111310;color:#f4f4f2;cursor:pointer;opacity:.55;transition:opacity 120ms ease,width 120ms ease}
.toggle:hover,.toggle:focus-visible,.toggle[aria-expanded="true"]{opacity:1;width:36px}
.toggle:focus-visible,.item:focus-visible,.actions button:focus-visible{outline:2px solid #d94a2b;outline-offset:2px}
.panel{position:absolute;left:42px;top:50%;transform:translateY(-50%);width:min(260px,calc(100vw - 56px));padding:12px;border:1px solid #2e312c;border-radius:6px;background:#111310;box-shadow:0 18px 40px rgba(0,0,0,.35)}
.panel[hidden]{display:none}
h2{margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#a7aba5}
ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.item{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #2e312c;border-radius:4px;background:#1a1c19;color:inherit;font:inherit;text-align:left;cursor:pointer}
.item:hover{border-color:#d94a2b}
.item[aria-current="true"]{cursor:default;border-color:#d94a2b;background:#22140f}
.item strong{display:block;font-size:13px}
.item small{display:block;color:#a7aba5;font-size:11px}
.badge{flex:none;padding:2px 6px;border-radius:3px;background:#d94a2b;color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.confirm{margin-top:10px;padding-top:10px;border-top:1px solid #2e312c}
.confirm[hidden]{display:none}
.confirm p{margin:0 0 10px;font-size:12px;color:#e6e6e3}
.actions{display:flex;gap:8px}
.actions button{flex:1;padding:8px;border-radius:4px;font:inherit;font-size:12px;cursor:pointer}
.primary{border:1px solid #b83a1f;background:#b83a1f;color:#fff}
.secondary{border:1px solid #3a3d37;background:transparent;color:#f4f4f2}
@media (max-width:640px){.toggle{width:22px;height:36px}.toggle:hover,.toggle:focus-visible,.toggle[aria-expanded="true"]{width:30px}.toggle svg{width:14px;height:14px}.panel{left:34px}}
@media (prefers-reduced-motion:reduce){.toggle{transition:none}}
@media print{:host{display:none}}
`;

const ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>';

/**
 * Remembers form controls the visitor typed into, so switching views never
 * drops unsaved details silently. A control counts while it is still on the page.
 */
function createDirtyTracker(host) {
  const touched = new Set();
  const onInput = (event) => {
    const target = event.target;
    if (!(target instanceof Element) || host.contains(target)) return;
    if (!target.closest('form')) return;
    touched.add(target);
  };
  const onRouteChange = () => touched.clear();
  document.addEventListener('input', onInput, true);
  document.addEventListener('change', onInput, true);
  window.addEventListener('popstate', onRouteChange);
  return {
    isDirty() {
      for (const element of touched) {
        if (!element.isConnected) touched.delete(element);
      }
      return [...touched].some((element) => {
        if (element.type === 'checkbox' || element.type === 'radio') return element.checked !== element.defaultChecked;
        return String(element.value ?? '').trim() !== '';
      });
    },
    destroy() {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
      window.removeEventListener('popstate', onRouteChange);
      touched.clear();
    },
  };
}

/**
 * Mount the discreet demo-view switcher. Call only in demo builds.
 * @param {{
 *   currentViewId: string,
 *   dev?: boolean | 'auto',
 *   views?: readonly object[],
 *   navigate?: (url: string) => void,
 * }} options `dev: 'auto'` (default) links to each view's dev server only when this
 *   page is itself served from the current view's dev origin; otherwise links stay
 *   on the same origin, as on the combined demo site.
 * @returns {() => void} unmount
 */
export function mountDemoSwitcher({ currentViewId, dev = 'auto', views = DEMO_VIEWS, navigate } = {}) {
  if (typeof document === 'undefined') return () => {};
  const current = findView(currentViewId, views);
  const available = enabledViews(views);
  if (!current || available.length < 2) return () => {};
  const useDevOrigins = dev === 'auto' ? window.location.origin === current.devOrigin : Boolean(dev);
  if (document.querySelector(TAG)) return () => {};

  const host = document.createElement(TAG);
  host.setAttribute('dir', 'ltr');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${STYLES}</style>
    <button class="toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="panel" aria-label="Switch demo view (current: ${current.label})" title="Switch demo view">${ICON}</button>
    <div class="panel" id="panel" role="dialog" aria-label="Demo views" hidden>
      <h2>Demo views</h2>
      <ul></ul>
      <div class="confirm" role="alertdialog" aria-live="assertive" hidden>
        <p></p>
        <div class="actions"><button class="primary" type="button" data-action="switch">Switch anyway</button><button class="secondary" type="button" data-action="stay">Stay here</button></div>
      </div>
    </div>`;

  const toggle = root.querySelector('.toggle');
  const panel = root.querySelector('.panel');
  const list = root.querySelector('ul');
  const confirmBox = root.querySelector('.confirm');
  const confirmText = confirmBox.querySelector('p');
  const tracker = createDirtyTracker(host);
  const go = navigate ?? ((url) => window.location.assign(url));
  let pendingUrl = '';

  for (const view of available) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'item';
    button.dataset.viewId = view.id;
    const isCurrent = view.id === current.id;
    if (isCurrent) button.setAttribute('aria-current', 'true');
    const label = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = view.label;
    const small = document.createElement('small');
    small.textContent = view.description;
    label.append(strong, small);
    button.append(label);
    if (isCurrent) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Current';
      button.append(badge);
    }
    item.append(button);
    list.append(item);
  }

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) {
      confirmBox.hidden = true;
      pendingUrl = '';
    }
  };

  const choose = (viewId) => {
    if (viewId === current.id) return;
    const target = findView(viewId, views);
    if (!target) return;
    const { url } = buildTargetUrl({ fromView: current, toView: target, location: window.location, dev: useDevOrigins });
    if (tracker.isDirty()) {
      pendingUrl = url;
      confirmText.textContent = `This page has details you have not sent yet. They will not be carried over to ${target.label}.`;
      confirmBox.hidden = false;
      confirmBox.querySelector('[data-action="stay"]').focus();
      return;
    }
    go(url);
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  list.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('.item') : null;
    if (button) choose(button.dataset.viewId);
  });
  confirmBox.addEventListener('click', (event) => {
    const action = event.target instanceof Element ? event.target.closest('button')?.dataset.action : null;
    if (action === 'switch' && pendingUrl) go(pendingUrl);
    if (action === 'stay') {
      confirmBox.hidden = true;
      pendingUrl = '';
      toggle.focus();
    }
  });

  const onKeydown = (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  };
  const onPointerDown = (event) => {
    if (!panel.hidden && !event.composedPath().includes(host)) setOpen(false);
  };
  const syncVisibility = () => {
    const hidden = isHiddenPath(window.location.pathname, current);
    host.hidden = hidden;
    if (hidden) setOpen(false);
  };

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('popstate', syncVisibility);
  syncVisibility();
  document.body.append(host);

  return () => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('popstate', syncVisibility);
    tracker.destroy();
    host.remove();
  };
}

/* Shared keyboard and modal behavior. No global letter or arrow shortcuts. */
(() => {
  let keyboardUsed = false;
  const stack = [];
  const focusable = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
  const visible = el => !el.closest('[hidden],[inert]') && el.getClientRects().length > 0;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isEditing = target => !!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]');
  const modified = e => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing || e.repeat;

  function sync() {
    const top = stack.at(-1);
    for (const el of document.querySelectorAll('.top,main,#results,#picker')) {
      el.inert = !!top && el !== top.root && !el.contains(top.root);
    }
    document.body.classList.toggle('lock', !!top);
  }
  function openModal(root, close, initial) {
    if (stack.some(m => m.root === root)) return;
    const previous = document.activeElement;
    stack.push({root, close, previous});
    sync();
    const dialog = root.querySelector('[role="dialog"]');
    if (dialog) dialog.tabIndex = -1;
    (initial || root.querySelector(focusable) || dialog)?.focus({preventScroll:true});
  }
  function closeModal(root) {
    const index = stack.findIndex(m => m.root === root);
    if (index < 0) return;
    const [modal] = stack.splice(index, 1);
    sync();
    if (modal.previous?.isConnected && visible(modal.previous)) modal.previous.focus({preventScroll:true});
    else if (!stack.length) document.querySelector('[id^="nav-"][aria-current="page"]')?.focus({preventScroll:true});
  }

  document.addEventListener('pointerdown', () => {keyboardUsed = false}, true);
  document.addEventListener('keydown', e => {
    if (!e.metaKey && !e.ctrlKey && !e.altKey) keyboardUsed = true;
    // Native dialogs handle Escape and focus themselves.
    if (document.querySelector('dialog[open]')) return;
    const top = stack.at(-1);
    if (!top) return;
    if (e.key === 'Escape' && !modified(e)) {
      e.preventDefault(); e.stopImmediatePropagation(); top.close(); return;
    }
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    const items = [...top.root.querySelectorAll(focusable)].filter(visible);
    const first = items[0], last = items.at(-1);
    if (!first) {e.preventDefault(); return}
    const active = document.activeElement;
    if (!top.root.contains(active) || (e.shiftKey && (active === first || !items.includes(active)))) {
      e.preventDefault(); (e.shiftKey ? last : first).focus();
    } else if (!e.shiftKey && (active === last || !items.includes(active))) {
      e.preventDefault(); first.focus();
    }
  }, true);

  window.ThockUI = {openModal, closeModal, reducedMotion, isEditing, modified,
    get keyboardUsed() {return keyboardUsed}, get modalOpen() {return !!stack.length || !!document.querySelector('dialog[open]')}};
})();

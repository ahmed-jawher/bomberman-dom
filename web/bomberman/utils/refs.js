/**
 * Named refs on top of the framework's function refs.
 *
 * `ref("player1")` returns the *same* callback every time it is asked for, so
 * the vdom sees an unchanged attribute and does not re-register it on every
 * render. `getRef("player1")` reads the element back.
 *
 * Refs are flushed in a microtask after the tree is committed, so read them
 * from an event handler or a deferred onMount, never during render().
 */

const elements = {};
const callbacks = new Map();

export function ref(name) {
  if (!callbacks.has(name)) {
    callbacks.set(name, (element) => {
      elements[name] = element;
    });
  }
  return callbacks.get(name);
}

export function getRef(name) {
  return elements[name];
}

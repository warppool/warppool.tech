/* Static build: the compute network is offline, so the opt-in is disabled. */
(function () {
  const figure = document.querySelector('[data-forest]');
  const button = document.querySelector('[data-plant-tab]');
  if (!figure || !button) return;
  button.disabled = true;
  figure.dataset.state = 'unsupported';
  figure.querySelector('[data-plant-label]').textContent = 'The network is paused';
  figure.querySelector('[data-plant-note]').textContent =
    'Warppool is not accepting new workers right now.';
})();

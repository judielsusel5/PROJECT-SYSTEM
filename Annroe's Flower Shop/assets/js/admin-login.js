/* admin-login.js — DEMO sign-in. Not real authentication and not secure:
   the credentials below are visible to anyone who reads this file. */
(function () {
  'use strict';

  const DEMO_USERS = ['admin', 'admin@annroes-demo.local'];
  const DEMO_PASSWORD = 'flowers1992';

  const form = document.getElementById('loginForm');
  const userInput = document.getElementById('loginUser');
  const passInput = document.getElementById('loginPass');
  const remember = document.getElementById('loginRemember');
  const alertBox = document.getElementById('loginAlert');
  const submitBtn = document.getElementById('loginSubmit');
  const toggleBtn = document.getElementById('togglePass');

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
  }
  function hideAlert() { alertBox.classList.add('d-none'); }

  function setInvalid(input, invalid) {
    input.classList.toggle('is-invalid', invalid);
    input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function validate() {
    const userOk = userInput.value.trim() !== '';
    const passOk = passInput.value !== '';
    setInvalid(userInput, !userOk);
    setInvalid(passInput, !passOk);
    if (!userOk) { userInput.focus(); return false; }
    if (!passOk) { passInput.focus(); return false; }
    return true;
  }

  /* Theme toggle (this page has no topbar) */
  const themeBtn = document.getElementById('themeToggle');
  AnnroeAdmin.applyTheme(AnnroeAdmin.getTheme());
  themeBtn.addEventListener('click', AnnroeAdmin.toggleTheme);

  /* Show / hide password */
  toggleBtn.addEventListener('click', function () {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    toggleBtn.setAttribute('aria-pressed', String(show));
    toggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggleBtn.innerHTML = '<i class="bi ' + (show ? 'bi-eye-slash' : 'bi-eye') + '" aria-hidden="true"></i>';
  });

  /* Remembered username */
  try {
    const saved = localStorage.getItem(AnnroeAdmin.STORAGE_KEYS.remembered);
    if (saved) { userInput.value = saved; remember.checked = true; }
  } catch (e) { /* ignore */ }

  document.getElementById('fillDemo').addEventListener('click', function () {
    userInput.value = DEMO_USERS[0];
    passInput.value = DEMO_PASSWORD;
    setInvalid(userInput, false);
    setInvalid(passInput, false);
    hideAlert();
    submitBtn.focus();
  });

  [userInput, passInput].forEach(function (input) {
    input.addEventListener('input', function () { setInvalid(input, false); hideAlert(); });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideAlert();
    if (!validate()) return;

    const name = userInput.value.trim().toLowerCase();
    if (DEMO_USERS.indexOf(name) === -1 || passInput.value !== DEMO_PASSWORD) {
      setInvalid(userInput, false);
      setInvalid(passInput, false);
      showAlert('The username or password does not match the demo account. Use the demo login shown below the form.');
      passInput.value = '';
      passInput.focus();
      return;
    }

    try {
      if (remember.checked) localStorage.setItem(AnnroeAdmin.STORAGE_KEYS.remembered, userInput.value.trim());
      else localStorage.removeItem(AnnroeAdmin.STORAGE_KEYS.remembered);
    } catch (e) { /* ignore */ }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Signing in…';
    window.setTimeout(function () { window.location.href = 'dashboard.html'; }, 500);
  });
})();

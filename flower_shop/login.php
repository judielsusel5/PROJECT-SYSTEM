<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>My account · Annroe's Flower Shop</title>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head><body class="auth-page">
<div class="auth-top">
<header class="top mini">
 <a class="home-link" href="index.php"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>HOME</a>
 <a class="logo" href="index.php"><img src="assets/image/logo.jpg" alt="Annroe's Flower Shop"></a>
 <span></span>
</header>

<div class="banner"><div>
  <h1 id="ttl">My account</h1>
  <p class="crumb"><a href="index.php">HOME</a> / <span id="crumb">Login</span></p>
</div></div>
</div>

<main id="auth" data-view="login">

  <!-- LOGIN -->
  <section class="view v-login auth">
    <form class="login" id="fLogin" novalidate>
      <h2>Login</h2>
      <label for="le">Email address <b>*</b></label>
      <input id="le" type="email" autocomplete="email">
      <span class="err" id="leE"></span>
      <label for="lp">Password <b>*</b></label>
      <div class="pwwrap"><input id="lp" type="password" autocomplete="current-password"><button type="button" data-pw="lp">Show</button></div>
      <span class="err" id="lpE"></span>
      <button class="loginbtn" type="submit">LOG IN</button>
      <p class="msg" id="lm" role="alert"></p>
    </form>
    <div class="newcust">
      <h2>New customer?</h2>
      <p>Create an account to keep your details with us and make future orders quicker. It only takes a minute.</p>
      <a class="contbtn" href="#" data-go="register">CREATE AN ACCOUNT</a>
    </div>
  </section>

  <!-- REGISTER -->
  <section class="view v-register auth-one">
    <form class="login reg" id="fReg" novalidate>
      <h2>Create an account</h2>
      <label for="rn">Full name <b>*</b></label>
      <input id="rn" type="text" autocomplete="name">
      <span class="err" id="rnE"></span>
      <label for="re">Email address <b>*</b></label>
      <input id="re" type="email" autocomplete="email">
      <span class="err" id="reE"></span>
      <label for="rp">Password <b>*</b> <small>(at least 6 characters)</small></label>
      <div class="pwwrap"><input id="rp" type="password" autocomplete="new-password"><button type="button" data-pw="rp">Show</button></div>
      <span class="err" id="rpE"></span>
      <label for="rc">Confirm password <b>*</b></label>
      <input id="rc" type="password" autocomplete="new-password">
      <span class="err" id="rcE"></span>
      <button class="loginbtn" type="submit">CREATE ACCOUNT</button>
      <p class="msg" id="rm" role="alert"></p>
      <p class="back">Already have an account? <a href="#" data-go="login">Log in</a></p>
    </form>
  </section>

  <!-- WELCOME (logged in) -->
  <section class="view v-welcome auth-one">
    <div class="welcome">
      <svg class="tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg>
      <h2 id="wh">Welcome</h2>
      <p id="wp">You are logged in.</p>
      <a class="contbtn" href="index.php#best">SEE BEST SELLERS</a>
      <a class="contbtn" id="dash" href="admin.php" style="display:none">DASHBOARD</a>
      <button class="loginbtn out" id="out" type="button">LOG OUT</button>
    </div>
  </section>

</main>

<footer class="foot">Annroe's Flower Shop · Always passionate since 1992</footer>

<script src="assets/js/script.js"></script>
<script>
(() => {
  const $ = id => document.getElementById(id);
  const A = $("auth"), RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const titles = { login: "Login", register: "Create an account", welcome: "Welcome" };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function show(v) {
    A.dataset.view = v;
    $("crumb").textContent = titles[v];
    document.querySelectorAll(".err,.msg").forEach(x => { x.textContent = ""; x.classList.remove("ok", "pop"); });
    document.querySelectorAll("input.bad").forEach(x => x.classList.remove("bad"));
    window.scrollTo({ top: 0 });
  }
  function shake(f) { f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); }
  function fail(inputId, errId, text) {
    const i = $(inputId), er = $(errId);
    i.classList.add("bad"); er.textContent = text;
    er.classList.remove("pop"); void er.offsetWidth; er.classList.add("pop");
    shake(i.closest("form")); return false;
  }
  function clear(form) {
    form.querySelectorAll(".err,.msg").forEach(x => { x.textContent = ""; x.classList.remove("ok", "pop"); });
    form.querySelectorAll("input.bad").forEach(x => x.classList.remove("bad"));
  }
  const busy = (b, t) => { b.disabled = true; b.classList.add("loading"); b.innerHTML = '<span class="spin"></span>' + t; };
  const done = (b, t) => { b.classList.remove("loading"); b.classList.add("done"); b.innerHTML = '<span class="ok-i">&#10003;</span>' + t; };
  const idle = (b, t) => { b.disabled = false; b.classList.remove("loading", "done"); b.textContent = t; };

  function welcome() {
    const s = Account.session(); if (!s) return show("login");
    $("dash").style.display = s.role === "admin" ? "" : "none";
    Account.updateHeader(); show("welcome");
    $("wh").textContent = "Welcome, " + s.name.split(" ")[0] + "!";
    $("wp").textContent = "You are logged in as " + s.email + ".";
  }

  /* switch views */
  document.querySelectorAll("[data-go]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); show(a.dataset.go); }));

  /* show / hide password */
  document.querySelectorAll("[data-pw]").forEach(b => b.addEventListener("click", () => {
    const i = $(b.dataset.pw), h = i.type === "password";
    i.type = h ? "text" : "password"; b.textContent = h ? "Hide" : "Show";
  }));

  /* login */
  $("fLogin").addEventListener("submit", async e => {
    e.preventDefault(); clear(e.target);
    const em = $("le").value.trim(), pw = $("lp").value; let ok = true;
    if (!RE.test(em)) ok = fail("le", "leE", "Please enter a valid email address.");
    if (!pw) ok = fail("lp", "lpE", "Please enter your password.");
    if (!ok) return;
    const btn = e.target.querySelector(".loginbtn"), label = btn.textContent;
    busy(btn, "Logging in…");
    const [r] = await Promise.all([Account.login(em, pw), wait(800)]);
    if (r.error) {
      idle(btn, label);
      if (r.error === "nouser") return fail("le", "leE", "We couldn't find an account with that email.");
      if (r.error === "badpw") return fail("lp", "lpE", "Incorrect password. Please try again.");
      $("lm").textContent = "Something went wrong. Please try again."; return;
    }
    done(btn, "Logged in");
    await wait(700);
    e.target.reset(); welcome(); idle(btn, label);
  });

  /* register */
  $("fReg").addEventListener("submit", async e => {
    e.preventDefault(); clear(e.target);
    const n = $("rn").value.trim(), em = $("re").value.trim(), pw = $("rp").value, c = $("rc").value; let ok = true;
    if (n.length < 2) ok = fail("rn", "rnE", "Please enter your full name.");
    if (!RE.test(em)) ok = fail("re", "reE", "Please enter a valid email address.");
    if (pw.length < 6) ok = fail("rp", "rpE", "Password must be at least 6 characters.");
    if (c !== pw) ok = fail("rc", "rcE", "Passwords do not match.");
    if (!ok) return;
    const btn = e.target.querySelector(".loginbtn"), label = btn.textContent;
    busy(btn, "Creating account…");
    const [r] = await Promise.all([Account.register(n, em, pw), wait(900)]);
    if (r.error) {
      idle(btn, label);
      if (r.error === "exists") return fail("re", "reE", "An account with this email already exists.");
      $("rm").textContent = "We couldn't save your account. Please make sure browser storage is enabled."; return;
    }
    await Account.login(em, pw);
    done(btn, "Account created");
    await wait(800);
    e.target.reset(); welcome(); idle(btn, label);
  });

  /* logout */
  $("out").addEventListener("click", () => { Account.logout(); Account.updateHeader(); show("login"); });

  /* initial view */
  if (Account.session()) welcome();
  else if (new URLSearchParams(location.search).get("view") === "register") show("register");
})();
</script>
</body></html>
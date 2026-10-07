<?php
require_once __DIR__ . '/config/database.php';

$products = get_products($conn);       // all rows from the `products` table ([] if DB is down)
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>All Flowers · Annroe's Flower Shop</title>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head><body>
<div class="topbar" id="top"><span>&#9742; Our phone number: (+63) 000 000 0000</span><div class="toplinks"><a href="index.php#contact">Contact us</a><a href="login.php">My account</a></div></div>
<header class="top">
 <div class="brand">
 <a class="logo" href="index.php"><img src="assets/image/logo.jpg" alt="Annroe's Flower Shop"></a>
  <p class="tagline">Hand-arranged flowers,<br>made with love.</p>
 </div>
 <div class="acct"><a class="cta" href="index.php#contact">Order now</a><a href="login.php">Login / Register</a></div>
</header>
<nav><a href="index.php">HOME</a><a href="index.php#about">ABOUT</a><a href="index.php#contact">OCCASIONS</a><a href="products.php">FLOWERS</a><a href="index.php#best">BEST SELLERS</a><a href="index.php#contact">CONTACT</a><div class="nsearch" id="nsearch"><button type="button" class="ns-btn" aria-label="Open search" aria-expanded="false" aria-controls="nsq"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button><form class="ns-form" role="search" action="products.php" method="get"><input id="nsq" name="q" type="search" placeholder="Search flowers..." autocomplete="off" aria-label="Search flowers" tabindex="-1"><kbd>Ctrl K</kbd><button type="button" class="ns-x" aria-label="Close search" tabindex="-1">&times;</button></form></div></nav>

<div class="pbanner">
  <h1>All our flowers</h1>
  <p>Choose a category, filter by color or price, and tell us which bouquet you would like.</p>
  <p class="pcrumb"><a href="index.php">Home</a> &nbsp;/&nbsp; All flowers</p>
</div>

<main class="cat">
  <!-- category navigator -->
  <div class="cat-tabs" id="cTabs" role="group" aria-label="Flower categories"></div>

  <div class="cat-layout">
    <!-- filters -->
    <aside class="cat-side" id="cSide" aria-label="Filters">
      <div class="side-head"><b>Filters</b><button type="button" class="alink" id="cReset" hidden>Reset</button></div>
      <div class="fgroup"><h3>Color</h3><div class="fopts" id="cColors"></div></div>
      <div class="fgroup"><h3>Starting price</h3><div class="fopts" id="cPrice"></div></div>
    </aside>

    <!-- results -->
    <div class="cat-main" id="best">
      <div class="cat-bar">
        <label class="csearch"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="cSearch" type="search" placeholder="Search flowers" autocomplete="off" aria-label="Search flowers"></label>
        <button type="button" class="cfilter" id="cFilterBtn" aria-expanded="false" aria-controls="cSide">Filters</button>
        <label class="csort"><span>Sort by</span>
          <select id="cSort" aria-label="Sort flowers">
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
      </div>
      <p class="ccount" id="cCount" aria-live="polite"></p>
      <div class="cactive" id="cActive"></div>

      <div class="cat-grid" id="catalog"></div>

      <div class="cat-empty" id="cEmpty" hidden>
        <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <h3>No flowers match your filters</h3>
        <p>Try another category, color or price, or clear your filters.</p>
        <button type="button" class="pc-btn" id="cEmptyReset">Clear filters</button>
      </div>
    </div>
  </div>

  <div class="cat-help">
    <b>Can't find what you are looking for?</b>
    <span>Tell us the occasion and your budget and our florists will suggest a bouquet.</span>
    <a class="pc-btn" href="index.php#contact">Contact us</a>
  </div>
</main>

<footer class="foot">Annroe's Flower Shop · Always passionate since 1992</footer>
<script>window.PRODUCTS = <?= json_encode($products, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="assets/js/script.js"></script>
<script src="assets/js/catalog.js"></script>
</body></html>
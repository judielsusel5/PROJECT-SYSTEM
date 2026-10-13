<?php
require_once __DIR__ . '/config/database.php';

$dbStatus = db_status($conn);          // runs SELECT DATABASE(), VERSION(), NOW()
$products = get_products($conn);       // rows from the `products` table ([] if DB is down)

function e($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Annroe's Flower Shop</title>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= @filemtime(__DIR__ . '/assets/css/style.css') ?: 1 ?>">
</head><body>
<div class="topbar" id="top"><span>&#9742; Our phone number: (+63) 000 000 0000</span><div class="toplinks"><a href="#contact">Contact us</a><a href="login.php">My account</a></div></div>
<header class="top">
 <div class="brand">
  <a class="logo" href="#top"><img src="assets/image/logo.jpg" alt="Annroe's Flower Shop"></a>
  <p class="tagline">Hand-arranged flowers,<br>made with love.</p>
 </div>
 <div class="acct"><a class="cta" href="products.php" data-loading="Opening all flowers…">Order now</a><button type="button" class="cartbtn" id="cartBtn" aria-label="Open cart"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg><span class="cartn" hidden>0</span></button><a href="login.php">Login / Register</a></div>
</header>
<nav><a href="#top">HOME</a><a href="#about">ABOUT</a><div class="dd"><a href="#contact" aria-haspopup="true" aria-expanded="false">OCCASIONS<i class="chev"></i></a><ul><li><a href="products.php?occasion=valentines">Valentines Flowers</a></li><li><a href="products.php?occasion=anniversary">Anniversary Flowers</a></li><li><a href="products.php?occasion=mothers-day">Mother's Day Flowers</a></li><li><a href="products.php?occasion=fathers-day">Father's Day Gifts</a></li><li><a href="products.php?occasion=birthday">Birthday Flowers</a></li><li><a href="products.php?occasion=funeral">Funeral Flowers</a></li><li><a href="products.php?occasion=inaugural">Inaugural Flowers</a></li><li><a href="products.php?occasion=get-well-soon">Get Well Soon Flowers</a></li><li><a href="products.php?occasion=memorial">Memorial / All Soul's Day / All Saint's Day Flowers</a></li><li><a href="products.php?occasion=congratulations">Congratulations Flowers</a></li></ul></div><div class="dd"><a href="products.php" aria-haspopup="true" aria-expanded="false">FLOWERS<i class="chev"></i></a><ul><li><a href="products.php">All Flowers</a></li><li><a href="products.php?cat=roses">Roses Bouquet</a></li><li><a href="products.php?cat=carnations">Carnation Bouquet</a></li><li><a href="products.php?cat=tulips">Tulips Bouquet</a></li><li><a href="products.php?cat=lisianthus">Lisianthus Bouquet</a></li><li><a href="products.php?cat=gerbera">Gerbera Bouquet</a></li><li><a href="products.php?customize=1">Customize a Bouquet</a></li><li><a href="products.php?customize=money">Money Bouquet</a></li></ul></div><a href="#best">BEST SELLERS</a><a href="#contact">CONTACT</a><div class="nsearch" id="nsearch"><button type="button" class="ns-btn" aria-label="Open search" aria-expanded="false" aria-controls="nsq"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button><form class="ns-form" role="search" action="products.php" method="get"><input id="nsq" name="q" type="search" placeholder="Search flowers..." autocomplete="off" aria-label="Search flowers" tabindex="-1"><kbd>Ctrl K</kbd><button type="button" class="ns-x" aria-label="Close search" tabindex="-1">&times;</button></form></div></nav>

<div class="hero"><div class="card">
  <span class="eyebrow">Annroe's Flower Shop</span>
  <h1>Passionate about flowers since 1992</h1>
  <p>Every arrangement is made by hand by our experienced florists, with fresh blooms picked for your occasion.</p>
  <div class="actions"><a class="btn solid" href="#best">See our best sellers</a><a class="btn" href="#contact">Contact us</a></div>
</div></div>

<div class="band"><section id="featured">
  <div class="aslider" id="aslider" role="region" aria-roledescription="carousel" aria-label="Our flowers">
    <div class="aslides" id="aslides" aria-live="off">
      <!-- one slide per available flower is added here by script.js from the products table -->
    </div>
    <div class="adots" id="adots" role="tablist" aria-label="Choose slide"></div>
  </div>
</section></div>

<div class="band alt"><section class="duo-sec" id="story-best">
 <div class="duo">

  <!-- LEFT: Our story -->
  <div class="pane story" id="about">
    <div class="story-head">
      <div class="story-pic">
        <img src="assets/image/logo.jpg" alt="Annroe's Flower Shop logo" width="150" height="150">
      </div>
      <div class="story-title">
        <span class="eyebrow dark">Our story</span>
        <h2 class="left">Flowers arranged with care</h2>
      </div>
    </div>
    <div class="story-text">
      <p>Annroe's Flower Shop has been arranging flowers since 1992. Every bouquet is made by hand by our experienced florists, using fresh blooms picked for your occasion.</p>
      <p>From birthdays and anniversaries to get-well wishes and remembrances, we help you say it with flowers.</p>
    </div>
    <div class="badges">
      <div class="badge"><b>1992</b><span>Since</span></div>
      <div class="badge"><b>100%</b><span>Made by hand</span></div>
      <div class="badge"><b>Fresh</b><span>Blooms picked for you</span></div>
    </div>
  </div>

  <!-- RIGHT: Best sellers -->
  <div class="pane bestpane" id="best">
    <span class="eyebrow dark reveal">Customer favorites</span>
    <h2 class="left reveal">Our best sellers</h2>
    <p class="sub reveal">Hand-arranged bouquets our customers love</p>
    <div class="grid" id="grid"></div>
    <div class="more reveal"><a class="btn" href="products.php" data-loading="Opening all flowers…">Shop now</a></div>
  </div>

 </div>
</section></div>

<div class="band alt"><section id="how">
  <h2>How to order</h2><p class="sub">Simple, personal, and made just for you</p>
  <div class="steps">
    <div class="step"><span class="n">1</span><h3>Choose your flowers</h3><p>Pick a bouquet from our best sellers, or tell us the occasion and we will suggest one.</p></div>
    <div class="step"><span class="n">2</span><h3>Message or call us</h3><p>Share the date, your budget and any special message you would like with the flowers.</p></div>
    <div class="step"><span class="n">3</span><h3>We arrange it fresh</h3><p>Our florists make your arrangement by hand, ready when you need it.</p></div>
  </div>
</section></div>

<div class="band peach"><section id="contact" class="contact">
  <h2>Let's make something beautiful</h2><p class="sub">Reach out to Annroe's Flower Shop to place an order or ask a question</p>
  <div class="cards">
    <div class="cc"><b>&#9742; Call us</b><span>(+63) 000 000 0000</span></div>
    <div class="cc"><b>&#9906; Visit us</b><span>Your shop address here</span></div>
    <div class="cc"><b>&#9719; Opening hours</b><span>Your opening hours here</span></div>
  </div>
</section></div>

<footer class="foot">Annroe's Flower Shop · Always passionate since 1992<br>
<?php if ($dbStatus['connected']): ?>
  <small class="db-status ok" title="MySQL <?= e($dbStatus['version']) ?> · <?= e($dbStatus['time']) ?>">● Database connected (<?= e($dbStatus['database']) ?>)</small>
<?php else: ?>
  <small class="db-status fail">● Database not connected — showing sample products</small>
<?php endif; ?>
</footer>
<script>window.PRODUCTS = <?= json_encode($products, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="assets/js/script.js?v=<?= @filemtime(__DIR__ . '/assets/js/script.js') ?: 1 ?>"></script>
<script src="assets/js/shop.js?v=<?= @filemtime(__DIR__ . '/assets/js/shop.js') ?: 1 ?>"></script>
<script src="assets/js/customize.js?v=<?= @filemtime(__DIR__ . '/assets/js/customize.js') ?: 1 ?>"></script>
<script src="assets/js/catalog.js?v=<?= @filemtime(__DIR__ . '/assets/js/catalog.js') ?: 1 ?>"></script>
</body></html>
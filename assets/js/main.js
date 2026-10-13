document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));button.classList.add('active');const category=button.dataset.filter;document.querySelectorAll('[data-category]').forEach(card=>{card.hidden=category!=='All'&&card.dataset.category!==category;});}));
document.querySelectorAll('[data-confirm]').forEach(button=>button.addEventListener('click',event=>{if(!confirm(button.dataset.confirm||'Are you sure?'))event.preventDefault();}));

// Keep navigation visible across pages, and subtly change its appearance on scroll.
(() => {
  const header = document.querySelector('.site-header');
  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 16);
    updateHeader();
    window.addEventListener('scroll', updateHeader, {passive:true});
  }

  // Reveal content naturally as it enters the viewport. Leave content visible when
  // JavaScript observers or motion effects are unsupported or turned off.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const selectors = '.section-head, .section-title, .lead-copy, .sub-copy, .work-card, .gallery-item, .service-card, .service-row, .feature-copy, .feature-img, .info-box, .form-shell, .cta-content, .inner-hero .container, .about-image, .quote';
    const items = Array.from(document.querySelectorAll(selectors))
      .filter(item => !item.closest('.hero') && !item.closest('.site-header') && !item.closest('.admin-nav'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.08,rootMargin:'0px 0px -25px 0px'});
    items.forEach((item, index) => {
      item.classList.add('reveal-item');
      item.style.setProperty('--reveal-delay', `${(index % 3) * 70}ms`);
      observer.observe(item);
    });
    document.documentElement.classList.add('motion-ready');
  }

  // Close expanded mobile navigation after following a menu link.
  const nav = document.getElementById('mainNav');
  if (nav && window.bootstrap?.Collapse) {
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      if (nav.classList.contains('show')) window.bootstrap.Collapse.getOrCreateInstance(nav, {toggle:false}).hide();
    }));
  }
})();

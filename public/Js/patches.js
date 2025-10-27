
/* =========================
   PATCH JS (2025-10-09)
   - Back to top suave
   - Recalcular --nav-h tras abrir/cerrar collapses (Bootstrap)
   ========================= */

// Back to top
document.querySelectorAll('a.back-to-top').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Recalcular --nav-h cuando cambie la navbar (por collapses/menus)
['shown.bs.collapse','hidden.bs.collapse'].forEach(evt=>{
  document.addEventListener(evt, ()=>{
    requestAnimationFrame(()=>{
      const nav = document.querySelector('.navbar');
      if(nav) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    });
  });
});

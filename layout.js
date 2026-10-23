/**
 * AFOCH - Cabecera, pie y banner de título compartidos por todas las páginas internas.
 * Para cambiar el menú o el pie del sitio se edita SOLO este archivo.
 */
const LOGO = 'https://leogalazzo06.github.io/flyersliga/afoch-logo.png'; // ← para usar el archivo local: 'afoch-logo.png'
document.head.insertAdjacentHTML('beforeend', `<link rel="icon" type="image/png" href="${LOGO}">`);
const REDES = { instagram: '#', facebook: '#', x: '#' }; // ← poné acá las URLs reales de las redes de la liga

const ICONOS = {
    instagram: `<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    facebook: `<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    x: `<svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>`
};

const NAV = [
    ['index.html', 'Inicio', 'inicio'],
    ['torneos.html', 'Torneos', 'torneos'],
    ['noticias.html', 'Noticias', 'noticias'],
    ['clubes.html', 'Clubes', 'clubes'],
    ['comunicados.html', 'Comunicados', 'comunicados']
];
const actual = document.body.dataset.pagina;

const enlacesEscritorio = NAV.map(([href, texto, id]) => id === actual
    ? `<a href="${href}" class="text-afochAzul border-b-2 border-afochCeleste py-5" aria-current="page">${texto}</a>`
    : `<a href="${href}" class="hover:text-afochMedio py-5">${texto}</a>`).join('');
const enlacesMovil = NAV.map(([href, texto, id]) =>
    `<a href="${href}" class="${id === actual ? 'text-afochAzul border-b-2 border-afochCeleste' : 'border-b-2 border-transparent'} py-3">${texto}</a>`).join('');

const cabecera = document.getElementById('site-header');
if (cabecera) cabecera.innerHTML = `
<header class="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div class="container mx-auto px-6 h-14 md:h-16 flex items-center justify-between">
        <a href="index.html" class="flex items-center gap-3">
            <img src="${LOGO}" alt="Escudo de AFOCH" class="h-10 w-auto object-contain">
            <span class="leading-tight">
                <span class="block font-sports text-xl text-afochAzul tracking-wide">AFOCH</span>
                <span class="hidden sm:block text-[11px] text-slate-500">Asociación de Fútbol del Oeste Chaqueño</span>
            </span>
        </a>
        <nav class="hidden md:flex gap-8 text-sm font-semibold text-slate-600" aria-label="Principal">${enlacesEscritorio}</nav>
    </div>
    <nav class="md:hidden border-t border-slate-100" aria-label="Principal móvil">
        <div class="grid grid-cols-5 text-center text-[12px] tracking-tight font-semibold text-slate-600">${enlacesMovil}</div>
    </nav>
</header>`;

const banner = document.getElementById('page-banner');
if (banner) banner.innerHTML = `
<section class="bg-white border-b border-slate-200">
    <div class="container mx-auto px-6 py-8 md:py-10">
        <p class="text-xs text-slate-500 mb-3"><a href="index.html" class="hover:text-afochMedio">Inicio</a> / <span>${banner.dataset.migas || banner.dataset.titulo}</span></p>
        <div class="flex items-center gap-3 mb-3"><span class="w-10 h-1 bg-afochCeleste"></span></div>
        <h1 class="font-sports uppercase text-3xl md:text-5xl text-afochAzul leading-tight">${banner.dataset.titulo}</h1>
        ${banner.dataset.bajada ? `<p class="mt-3 text-slate-600 max-w-2xl">${banner.dataset.bajada}</p>` : ''}
    </div>
</section>`;

const pie = document.getElementById('site-footer');
if (pie) pie.innerHTML = `
<footer class="bg-afochAzul text-white mt-10">
    <div class="container mx-auto px-6 py-10 md:py-12 grid md:grid-cols-3 gap-10">
        <div>
            <div class="flex items-center gap-3 mb-4">
                <span class="w-12 h-12 bg-white p-1 flex items-center justify-center shrink-0"><img src="${LOGO}" alt="Escudo de AFOCH" class="max-w-full max-h-full object-contain"></span>
                <span class="font-sports text-xl tracking-wide">AFOCH</span>
            </div>
            <p class="text-sm text-white/70 max-w-xs">Asociación de Fútbol del Oeste Chaqueño. Villa Ángela, Chaco, Argentina.</p>
        </div>
        <div>
            <h3 class="font-sports uppercase tracking-wide mb-4">Secciones</h3>
            <ul class="space-y-3 text-sm text-white/70">
                <li><a href="torneos.html" class="hover:text-white">Torneos</a></li>
                <li><a href="noticias.html" class="hover:text-white">Noticias</a></li>
                <li><a href="clubes.html" class="hover:text-white">Clubes</a></li>
                <li><a href="comunicados.html" class="hover:text-white">Comunicados</a></li>
            </ul>
        </div>
        <div>
            <h3 class="font-sports uppercase tracking-wide mb-4">Seguinos</h3>
            <div class="flex gap-5 text-white/70">
                <a href="${REDES.instagram}" aria-label="Instagram" class="hover:text-white">${ICONOS.instagram}</a>
                <a href="${REDES.facebook}" aria-label="Facebook" class="hover:text-white">${ICONOS.facebook}</a>
                <a href="${REDES.x}" aria-label="X" class="hover:text-white">${ICONOS.x}</a>
            </div>
        </div>
    </div>
    <div class="border-t border-white/10">
        <div class="container mx-auto px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/50">
            <p>© 2026 Asociación de Fútbol del Oeste Chaqueño. Todos los derechos reservados.</p>
            <a href="login.html" class="hover:text-white">Acceso administrativo</a>
        </div>
    </div>
</footer>`;
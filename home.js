/**
 * AFOCH - Lógica del Home (versión clara / institucional)
 * Mismos IDs y fuentes de datos que la versión anterior; cambia solo el aspecto de las tarjetas.
 */
import { proximosPartidos, listarNoticias, listarComunicados, listarClubes, listarGaleria, obtenerConfigHome, obtenerProgramacion } from './firebase.js';
import { parsearProgramacion, proximos, tarjetaPartido, crearBuscadorEscudos } from './programacion.js';
import { optimizar } from './cloudinary.js';
import { cargando, sinDatos, errorCarga } from './ui.js';

const TZ = 'America/Argentina/Buenos_Aires';
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vacio = msg => `<p class="text-slate-500 text-sm">${msg}</p>`;

/** Próximos 3 partidos programados */
async function cargarPartidos() {
    const cont = document.getElementById('contenedor-partidos');
    if (!cont) return;
    let partidos = [];
    cont.innerHTML = cargando('partidos', 3);

    // 1) Programación en texto (la del panel): solo los próximos 3 y un enlace a la completa.
    try {
        const cfg = await obtenerProgramacion();
        const lista = cfg?.texto ? proximos(parsearProgramacion(cfg.texto), 3) : [];
        if (lista.length) {
            let escudoDe = () => '';
            try { const b = crearBuscadorEscudos(await listarClubes()); escudoDe = n => { const u = b(n); return u ? optimizar(u, 80) : ''; }; }
            catch (e) { console.warn('Sin escudos', e); }
            cont.innerHTML = lista.map(f => tarjetaPartido(f, escudoDe)).join('') +
                '<a href="torneos.html" class="block text-center text-sm font-semibold text-afochMedio border border-slate-200 py-3 hover:border-afochMedio hover:bg-afochClaro transition">Ver toda la programación →</a>';
            return;
        }
    } catch (e) { console.error('No se pudo leer la programación', e); }

    // 2) Si no hay programación publicada, los partidos cargados a mano.
    try {
        partidos = await proximosPartidos(3);
    } catch (e) {
        console.error('No se pudieron cargar los partidos', e);
        cont.innerHTML = errorCarga('los próximos encuentros', true);
        return;
    }
    if (!partidos.length) { cont.innerHTML = sinDatos('partidos', true); return; }

    const escudo = url => url ? `<img src="${escHtml(optimizar(url, 80))}" class="w-10 h-10 sm:w-8 sm:h-8 object-contain shrink-0" alt="">` : '';
    cont.innerHTML = partidos.map(p => {
        const hora = p.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
        const dia = p.fecha.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ }).replace(',', '');
        return `
        <div class="border border-slate-200 p-3 sm:p-4">
            <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 min-w-0 text-center sm:text-left font-sports uppercase text-sm sm:text-lg text-afochAzul leading-tight">${escudo(p.localEscudo)}<span class="min-w-0 break-words">${escHtml(p.localNombre)}</span></div>
                <div class="text-center shrink-0">
                    <div class="text-[11px] text-slate-500 uppercase mb-1">${escHtml(dia)}</div>
                    <div class="bg-afochAzul text-white font-sports px-2 sm:px-3 py-1 text-base sm:text-lg">${hora}</div>
                </div>
                <div class="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-1 sm:gap-2 min-w-0 text-center sm:text-right font-sports uppercase text-sm sm:text-lg text-afochAzul leading-tight"><span class="min-w-0 break-words">${escHtml(p.visitanteNombre)}</span>${escudo(p.visitanteEscudo)}</div>
            </div>
            <div class="mt-3 text-xs text-slate-500">${escHtml([p.estadio, p.torneo].filter(Boolean).join(' · '))}</div>
        </div>`;
    }).join('');
}

/** Últimos 4 comunicados: llevan al visor de comunicados.html */
async function cargarComunicados() {
    const cont = document.getElementById('contenedor-comunicados-home');
    if (!cont) return;
    let lista = [];
    cont.innerHTML = cargando('comunicados', 4);
    try {
        lista = await listarComunicados(4);
    } catch (e) {
        console.error('No se pudieron cargar los comunicados', e);
        cont.innerHTML = errorCarga('los comunicados', true);
        return;
    }
    if (!lista.length) { cont.innerHTML = sinDatos('comunicados', true); return; }

    cont.innerHTML = lista.map(c => {
        const fecha = c.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }).replace(/\./g, '');
        const conPdf = Boolean(c.driveId);
        const href = conPdf ? `comunicados.html?id=${encodeURIComponent(c.id)}` : 'comunicados.html';
        return `
        <a href="${escHtml(href)}" class="group block py-4 first:pt-0 last:pb-0">
            <div class="flex justify-between text-[11px] font-semibold tracking-wide uppercase mb-1">
                <span class="text-afochMedio">${escHtml(c.categoria)} · N° ${escHtml(c.numero)}</span>
                <span class="text-slate-500 normal-case font-normal">${escHtml(fecha)}</span>
            </div>
            <h3 class="font-sports uppercase text-lg leading-snug text-afochAzul group-hover:text-afochMedio transition">${escHtml(c.titulo)}</h3>
            ${conPdf ? '<span class="text-xs text-slate-500 group-hover:text-afochMedio">Ver PDF →</span>' : ''}
        </a>`;
    }).join('');
}

/** Últimas 3 noticias. La sección completa queda oculta si no hay ninguna (o si falla la carga). */
async function cargarNoticias() {
    const seccion = document.getElementById('seccion-noticias');
    const cont = document.getElementById('contenedor-noticias');
    if (!seccion || !cont) return;
    let noticias = [];
    cont.innerHTML = cargando('noticias', 3);
    seccion.classList.remove('hidden');
    try {
        noticias = await listarNoticias(3);
    } catch (e) {
        console.error('No se pudieron cargar las noticias', e);
        seccion.classList.add('hidden');
        return;
    }
    if (!noticias.length) { seccion.classList.add('hidden'); return; }

    cont.innerHTML = noticias.map(n => {
        const fecha = n.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }).replace(/\./g, '');
        const img = n.imagenUrl
            ? `<img src="${escHtml(optimizar(n.imagenUrl, 800))}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="">`
            : '<div class="w-full h-full bg-afochAzul/10"></div>';
        return `
        <a href="noticias.html?id=${encodeURIComponent(n.id)}" class="group block bg-white border border-slate-200 overflow-hidden hover:shadow-md transition">
            <div class="h-48 overflow-hidden bg-slate-100">${img}</div>
            <div class="p-5">
                <div class="flex justify-between text-[11px] font-semibold tracking-wide uppercase mb-2">
                    <span class="text-afochMedio">${escHtml(n.categoria)}</span>
                    <span class="text-slate-500 normal-case font-normal">${escHtml(fecha)}</span>
                </div>
                <h3 class="font-sports uppercase text-xl leading-snug text-afochAzul group-hover:text-afochMedio transition">${escHtml(n.titulo)}</h3>
            </div>
        </a>`;
    }).join('');
    seccion.classList.remove('hidden');
}

/** Clubes afiliados con escudo y nombre siempre visible */
async function cargarClubes() {
    const grid = document.getElementById('grid-clubes-footer');
    if (!grid) return;
    grid.innerHTML = cargando('clubesMini', 12);
    try {
        const clubes = (await listarClubes()).filter(c => c.activo !== false);
        if (!clubes.length) { grid.className = ''; grid.innerHTML = sinDatos('clubes', true); return; }
        grid.innerHTML = clubes.map(c => {
            const nombre = c.nombreCorto || c.nombre;
            const contenido = c.escudoUrl
                ? `<img src="${escHtml(optimizar(c.escudoUrl, 120))}" class="w-full h-full object-contain p-2" alt="Escudo de ${escHtml(nombre)}">`
                : `<span class="text-xs font-bold text-slate-400">${escHtml(nombre.substring(0, 3).toUpperCase())}</span>`;
            return `
            <a href="clubes.html" class="group flex flex-col items-center text-center gap-2">
                <div class="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden group-hover:border-afochMedio transition">${contenido}</div>
                <span class="text-[11px] font-semibold uppercase leading-tight text-slate-600">${escHtml(nombre)}</span>
            </a>`;
        }).join('');
    } catch (e) {
        console.error('No se pudieron cargar los clubes', e);
        grid.className = '';
        grid.innerHTML = errorCarga('los clubes', true);
    }
}

/** Galería: fotos subidas desde el panel. La sección se oculta si no hay ninguna. */
async function cargarGaleria() {
    const cont = document.getElementById('contenedor-galeria');
    const seccion = document.getElementById('seccion-galeria');
    if (!cont) return;
    cont.innerHTML = cargando('galeria', 8);
    let fotos = [];
    try {
        fotos = await listarGaleria(8);
    } catch (e) {
        console.error('No se pudo cargar la galería', e);
        seccion?.classList.add('hidden');
        return;
    }
    if (!fotos.length) { seccion?.classList.add('hidden'); return; }
    cont.innerHTML = fotos.map((f, i) => `
        <button type="button" data-foto="${i}" class="${i === 0 || i === 5 ? 'md:col-span-2' : ''} block h-36 sm:h-56 overflow-hidden bg-slate-200" aria-label="Ver foto ampliada">
            <img src="${escHtml(optimizar(f.imagenUrl, 800))}" class="w-full h-full object-cover hover:scale-105 transition duration-500" alt="${escHtml(f.descripcion || 'Galería AFOCH')}" loading="lazy">
        </button>`).join('');
    cont.addEventListener('click', e => {
        const b = e.target.closest('[data-foto]');
        if (b) verFoto(fotos[b.dataset.foto]);
    });
}

/** Foto ampliada en un diálogo; se cierra tocando afuera o con la X. */
function verFoto(f) {
    let d = document.getElementById('visor-foto');
    if (!d) {
        d = document.createElement('dialog');
        d.id = 'visor-foto';
        d.className = 'bg-transparent p-0 max-w-[95vw] max-h-[92vh] backdrop:bg-black/80';
        d.innerHTML = '<div class="relative"><img id="visor-foto-img" class="max-w-[95vw] max-h-[82vh] object-contain mx-auto" alt=""><p id="visor-foto-desc" class="text-white text-sm text-center mt-3"></p><button type="button" id="visor-foto-cerrar" class="absolute top-2 right-2 bg-black/60 text-white w-10 h-10 text-lg" aria-label="Cerrar">✕</button></div>';
        document.body.appendChild(d);
        d.addEventListener('click', e => { if (e.target === d || e.target.id === 'visor-foto-cerrar') d.close(); });
    }
    d.querySelector('#visor-foto-img').src = optimizar(f.imagenUrl, 1600);
    d.querySelector('#visor-foto-img').alt = f.descripcion || 'Galería AFOCH';
    d.querySelector('#visor-foto-desc').textContent = f.descripcion || '';
    d.showModal();
}

/** Banner principal: imagen elegida en el panel (o la de por defecto). Aparece con un fundido cuando termina de cargar. */
const BANNER_DEFAULT = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200';
async function cargarBanner() {
    const img = document.getElementById('banner-principal');
    if (!img) return;
    let url = BANNER_DEFAULT;
    try {
        const c = await obtenerConfigHome();
        if (c?.bannerUrl) url = optimizar(c.bannerUrl, 1400);
    } catch (e) { console.error('No se pudo leer el banner', e); }
    img.onload = () => img.classList.remove('opacity-0');
    img.onerror = () => { if (img.src !== BANNER_DEFAULT) img.src = BANNER_DEFAULT; };
    img.src = url;
}

document.addEventListener('DOMContentLoaded', () => {
    cargarBanner();
    cargarPartidos();
    cargarComunicados();
    cargarNoticias();
    cargarClubes();
    cargarGaleria();
});
/**
 * AFOCH - Lógica del Home (versión clara / institucional)
 * Todo se actualiza en vivo: cuando algo cambia en el panel, el inicio se redibuja solo (sin recargar).
 */
import { escucharNoticias, escucharComunicados, escucharClubes, escucharGaleria, escucharPosiciones, escucharConfigHome, escucharProgramacion } from './firebase.js';
import { parsearProgramacion, proximos, tarjetaPartido, crearBuscadorEscudos } from './programacion.js';
import { montarPosiciones } from './posiciones.js';
import { optimizar } from './cloudinary.js';
import { cargando, sinDatos, errorCarga } from './ui.js';

const TZ = 'America/Argentina/Buenos_Aires';
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);

/* ---------- Clubes: escudos compartidos por partidos, posiciones y la grilla del pie ---------- */
let clubes = null;                 // null = todavía no llegó la primera respuesta
let errorClubes = false;
let buscador = () => '';
const escudoDe = n => { const u = buscador(n); return u ? optimizar(u, 80) : ''; };
const dependientesDeClubes = [];   // se vuelven a dibujar cuando cambian los clubes

/* ---------- Próximos 3 partidos (de la programación en texto del panel) ---------- */
let programacion;                  // undefined = no llegó · null = no hay programación publicada
function pintarPartidos() {
    const cont = $('contenedor-partidos');
    if (!cont || programacion === undefined || clubes === null) return;
    const lista = programacion?.texto ? proximos(parsearProgramacion(programacion.texto), 3) : [];
    if (!lista.length) { cont.innerHTML = sinDatos('partidos', true); return; }
    cont.innerHTML = lista.map(f => tarjetaPartido(f, escudoDe)).join('') +
        '<a href="torneos.html" class="block text-center text-sm font-semibold text-afochMedio border border-slate-200 py-3 hover:border-afochMedio hover:bg-afochClaro transition">Ver toda la programación →</a>';
}

/* ---------- Tablas de posiciones (versión compacta). La sección se oculta si no hay ninguna o si falla la carga ---------- */
let posiciones;
function pintarPosiciones() {
    const seccion = $('seccion-posiciones'), cont = $('contenedor-posiciones');
    if (!seccion || !cont || posiciones === undefined || clubes === null) return;
    if (!posiciones.length) { seccion.classList.add('hidden'); return; }
    seccion.classList.remove('hidden');
    montarPosiciones(cont, posiciones, { escudoDe, compacto: true });
}

/* ---------- Últimos 4 comunicados: llevan al visor de comunicados.html ---------- */
function pintarComunicados(lista) {
    const cont = $('contenedor-comunicados-home');
    if (!cont) return;
    if (!lista.length) { cont.innerHTML = sinDatos('comunicados', true); return; }
    cont.innerHTML = lista.map(c => {
        const fecha = c.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }).replace(/\./g, '');
        const conPdf = Boolean(c.driveId);
        const href = conPdf ? `comunicados.html?id=${encodeURIComponent(c.id)}` : 'comunicados.html';
        return `
        <a href="${escHtml(href)}" class="group block min-w-0 py-4 first:pt-0 last:pb-0">
            <div class="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4 text-[11px] font-semibold tracking-wide uppercase mb-1">
                <span class="text-afochMedio break-words">${escHtml(c.categoria)} · N° ${escHtml(c.numero)}</span>
                <span class="text-slate-500 normal-case font-normal shrink-0">${escHtml(fecha)}</span>
            </div>
            <h3 class="font-sports uppercase text-base sm:text-lg leading-snug text-afochAzul break-words group-hover:text-afochMedio transition">${escHtml(c.titulo)}</h3>
            ${conPdf ? '<span class="text-xs text-slate-500 group-hover:text-afochMedio">Ver PDF →</span>' : ''}
        </a>`;
    }).join('');
}

/* ---------- Últimas 3 noticias. La sección completa queda oculta si no hay ninguna (o si falla la carga) ---------- */
function pintarNoticias(noticias) {
    const seccion = $('seccion-noticias'), cont = $('contenedor-noticias');
    if (!seccion || !cont) return;
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

/* ---------- Clubes afiliados con escudo y nombre siempre visible ---------- */
function pintarClubes() {
    const grid = $('grid-clubes-footer');
    if (!grid) return;
    if (clubes === null) return;
    if (errorClubes && !clubes.length) { grid.className = ''; grid.innerHTML = errorCarga('los clubes', true); return; }
    const activos = clubes.filter(c => c.activo !== false);
    if (!activos.length) { grid.className = ''; grid.innerHTML = sinDatos('clubes', true); return; }
    grid.innerHTML = activos.map(c => {
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
}

/* ---------- Galería: fotos subidas desde el panel. La sección se oculta si no hay ninguna ---------- */
let fotosActuales = [];
function pintarGaleria(fotos) {
    const cont = $('contenedor-galeria'), seccion = $('seccion-galeria');
    if (!cont) return;
    fotosActuales = fotos;
    if (!fotos.length) { seccion?.classList.add('hidden'); return; }
    seccion?.classList.remove('hidden');
    cont.innerHTML = fotos.map((f, i) => `
        <button type="button" data-foto="${i}" class="${i === 0 || i === 5 ? 'md:col-span-2' : ''} block h-36 sm:h-56 overflow-hidden bg-slate-200" aria-label="Ver foto ampliada">
            <img src="${escHtml(optimizar(f.imagenUrl, 800))}" class="w-full h-full object-cover hover:scale-105 transition duration-500" alt="${escHtml(f.descripcion || 'Galería AFOCH')}" loading="lazy">
        </button>`).join('');
}

/** Foto ampliada en un diálogo; se cierra tocando afuera o con la X. */
function verFoto(f) {
    let d = $('visor-foto');
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

/* ---------- Fondo del hero: el diseño es 100% código. Si en el panel se eligió una imagen, se suma como textura sutil ---------- */
function pintarBanner(config) {
    const img = $('banner-principal');
    if (!img) return;
    if (!config?.bannerUrl) { img.classList.replace('opacity-30', 'opacity-0'); img.removeAttribute('src'); return; }
    const url = optimizar(config.bannerUrl, 1600);
    if (img.getAttribute('src') === url) return;
    img.onload = () => img.classList.replace('opacity-0', 'opacity-30');
    img.src = url;
}

/* ---------- Arranque: esqueletos y escuchas en vivo ---------- */
document.addEventListener('DOMContentLoaded', () => {
    if ($('contenedor-partidos')) $('contenedor-partidos').innerHTML = cargando('partidos', 3);
    if ($('contenedor-comunicados-home')) $('contenedor-comunicados-home').innerHTML = cargando('comunicados', 4);
    if ($('contenedor-noticias')) { $('contenedor-noticias').innerHTML = cargando('noticias', 3); $('seccion-noticias')?.classList.remove('hidden'); }
    if ($('grid-clubes-footer')) $('grid-clubes-footer').innerHTML = cargando('clubesMini', 12);
    if ($('contenedor-galeria')) $('contenedor-galeria').innerHTML = cargando('galeria', 8);
    if ($('contenedor-posiciones')) { $('contenedor-posiciones').innerHTML = cargando('tabla', 2); $('seccion-posiciones')?.classList.remove('hidden'); }

    // un solo manejador para la galería (las fotos cambian en vivo)
    $('contenedor-galeria')?.addEventListener('click', e => {
        const b = e.target.closest('[data-foto]');
        if (b && fotosActuales[b.dataset.foto]) verFoto(fotosActuales[b.dataset.foto]);
    });

    dependientesDeClubes.push(pintarPartidos, pintarPosiciones, pintarClubes);
    escucharClubes(lista => {
        clubes = lista; errorClubes = false;
        buscador = crearBuscadorEscudos(lista);
        dependientesDeClubes.forEach(f => f());
    }, e => {
        // sin clubes igual se muestra todo, solo que sin escudos
        console.warn('Sin escudos', e);
        errorClubes = true;
        if (clubes === null) clubes = [];
        dependientesDeClubes.forEach(f => f());
    });

    escucharProgramacion(cfg => { programacion = cfg; pintarPartidos(); }, () => { programacion = null; pintarPartidos(); });
    escucharPosiciones(lista => { posiciones = lista; pintarPosiciones(); }, e => { console.error('No se pudieron cargar las posiciones', e); $('seccion-posiciones')?.classList.add('hidden'); });
    escucharComunicados(4, pintarComunicados, () => { const c = $('contenedor-comunicados-home'); if (c) c.innerHTML = errorCarga('los comunicados', true); });
    escucharNoticias(3, pintarNoticias, () => $('seccion-noticias')?.classList.add('hidden'));
    escucharGaleria(8, pintarGaleria, () => $('seccion-galeria')?.classList.add('hidden'));
    escucharConfigHome(pintarBanner, e => console.error('No se pudo leer el banner', e));

    // "los próximos partidos" dependen de la hora: se refrescan solos cuando pasa un partido
    setInterval(pintarPartidos, 60000);
});

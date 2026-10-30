/**
 * AFOCH - Tablas de posiciones (orden y dibujo).
 * Lo usan el inicio (versión compacta) y posiciones.html (versión completa).
 *
 *   calcular(club)                -> club con pj, pts, dif y prom ya calculados
 *   ordenar(clubes, criterio)     -> 'puntos' (pts, dif, gf) | 'promedio' (pts ÷ pj, pts, dif, gf)
 *   tablaHtml(doc, opciones)      -> una tabla de zona
 *   promediosHtml(doc, opciones)  -> la tabla de promedios (descenso)
 *   montarPosiciones(el, docs, { escudoDe, compacto, sincronizarUrl })
 *                                 -> selector de categoría + tablas dentro de `el`
 *
 * En la base se guardan solo G, E, P, GF, GC y un ajuste de puntos (sanciones); el resto se calcula acá,
 * así los números nunca quedan desfasados entre sí.
 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9+]+/g, '-').replace(/^-+|-+$/g, '');
const TZ = 'America/Argentina/Buenos_Aires';

export const GRUPOS = [
    { id: 'primera', nombre: 'Primera División' },
    { id: 'sub20', nombre: 'Sub 20' },
    { id: 'juveniles', nombre: 'Juveniles' },
    { id: 'infantiles', nombre: 'Infantiles' },
    { id: 'veteranos', nombre: 'Veteranos' },
    { id: 'femenino', nombre: 'Femenino' },
    { id: 'promedios', nombre: 'Promedios' }
];

/* ---------- Cálculo y orden ---------- */
export function calcular(c) {
    const g = +c.g || 0, e = +c.e || 0, p = +c.p || 0, gf = +c.gf || 0, gc = +c.gc || 0;
    const pj = g + e + p, pts = g * 3 + e + (+c.ajuste || 0);
    return { ...c, g, e, p, gf, gc, pj, pts, dif: gf - gc, prom: pj > 0 ? pts / pj : null };
}

export function ordenar(clubes, criterio = 'puntos') {
    const porNombre = (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es');
    const lista = (clubes || []).map(calcular);
    return lista.sort(criterio === 'promedio'
        ? (a, b) => (b.prom ?? -1) - (a.prom ?? -1) || b.pts - a.pts || b.dif - a.dif || b.gf - a.gf || porNombre(a, b)
        : (a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf || porNombre(a, b));
}

/* ---------- Piezas ---------- */
const fmtDif = d => d > 0 ? `+${d}` : d < 0 ? `\u2212${Math.abs(d)}` : '0';
const clsDif = d => d > 0 ? 'text-emerald-700' : d < 0 ? 'text-rose-600' : 'text-slate-500';
const fmtProm = p => p == null ? '\u2013' : p.toFixed(2).replace('.', ',');
const fmtFecha = d => d ? d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: TZ }) : '';

const iniciales = n => (String(n ?? '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 || /\d/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase()) || '?';

function clubCelda(c, escudoDe, tam = 'w-7 h-7', fuente = 'text-[10px]') {
    const url = escudoDe ? escudoDe(c.nombre) : '';
    const escudo = url
        ? `<img src="${esc(url)}" alt="" loading="lazy" class="${tam} object-contain shrink-0">`
        : `<span class="${tam} rounded-full bg-slate-100 text-slate-400 ${fuente} font-bold flex items-center justify-center shrink-0" aria-hidden="true">${esc(iniciales(c.nombre))}</span>`;
    const marca = c.marca ? `<sup class="text-afochMedio ml-0.5 font-bold" title="Ver la nota al pie">${esc(c.marca)}</sup>` : '';
    return `<div class="flex items-center gap-2 min-w-0">${escudo}<span class="min-w-0 break-words font-semibold text-afochAzul leading-tight">${esc(c.nombre) || '<span class="text-slate-400">Sin nombre</span>'}${marca}</span></div>`;
}

const TH = {
    pj: ['PJ', 'Partidos jugados'], g: ['G', 'Ganados'], e: ['E', 'Empatados'], p: ['P', 'Perdidos'],
    gf: ['GF', 'Goles a favor'], gc: ['GC', 'Goles en contra'], dif: ['DG', 'Diferencia de gol'],
    pts: ['PTS', 'Puntos'], prom: ['Prom.', 'Promedio: puntos por partido jugado']
};
const th = (k, extra = '', oculta = '') => `<th scope="col" class="${oculta} px-1.5 py-2 text-center font-semibold ${extra}"><abbr title="${TH[k][1]}" class="no-underline">${TH[k][0]}</abbr></th>`;
const td = (v, extra = '', oculta = '') => `<td class="${oculta} px-1.5 py-2 text-center tabular-nums ${extra}">${v}</td>`;

function pie({ clasificados, nota, criterio, marca }) {
    const partes = [];
    if (clasificados) partes.push('<span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-afochCeleste" aria-hidden="true"></span>Clasificado</span>');
    if (marca && nota) partes.push(`<span><sup class="text-afochMedio font-bold">${esc(marca)}</sup> ${esc(nota)}</span>`);
    else if (nota) partes.push(`<span>${esc(nota)}</span>`);
    partes.push(criterio === 'promedio'
        ? '<span>Ordenada por promedio (puntos \u00F7 partidos jugados), luego diferencia de gol.</span>'
        : '<span>Orden: puntos, diferencia de gol y goles a favor.</span>');
    return `<footer class="px-4 py-3 border-t border-slate-100 text-[11px] leading-relaxed text-slate-500 flex flex-wrap gap-x-5 gap-y-1">${partes.join('')}</footer>`;
}

/* ---------- Tabla de una zona ---------- */
export function tablaHtml(t, { escudoDe, compacto = false, subtitulo = '' } = {}) {
    const criterio = t.criterio === 'promedio' ? 'promedio' : 'puntos';
    const lista = ordenar(t.clubes, criterio);
    const extra = compacto ? 'hidden' : 'hidden sm:table-cell';
    const titulo = !t.zona || /^[uú]nica$/i.test(t.zona) ? t.categoria : t.zona;
    const marcaNota = (t.clubes || []).find(c => c.marca)?.marca || '';
    const filas = lista.map((c, i) => {
        const clas = c.clasificado ? 'shadow-[inset_3px_0_0_#00D1FF]' : '';
        const pos = i === 0
            ? `<span class="inline-flex w-6 h-6 items-center justify-center rounded-full bg-afochAzul text-white font-sports text-sm">${i + 1}</span>`
            : `<span class="font-sports text-base text-slate-500">${i + 1}</span>`;
        return `<tr class="border-t border-slate-100 ${i === 0 ? 'bg-afochCeleste/5' : ''}">
            <td class="${clas} w-10 pl-3 pr-1 py-2 text-center">${pos}</td>
            <td class="px-2 py-2 min-w-[8.5rem]">${clubCelda(c, escudoDe)}</td>
            ${td(c.pj, 'text-slate-600')}${td(c.g, 'text-slate-600', extra)}${td(c.e, 'text-slate-600', extra)}${td(c.p, 'text-slate-600', extra)}${td(c.gf, 'text-slate-600', extra)}${td(c.gc, 'text-slate-600', extra)}
            ${td(fmtDif(c.dif), 'font-semibold ' + clsDif(c.dif))}
            ${criterio === 'promedio'
                ? td(c.pts, 'text-slate-700') + td(fmtProm(c.prom), 'pr-3 font-sports text-base text-afochAzul')
                : td(c.pts, 'pr-3 font-sports text-base text-afochAzul')}
        </tr>`;
    }).join('');
    return `
    <article class="bg-white border border-slate-200 min-w-0 w-full self-start">
        <header class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 pt-4 pb-3">
            <h3 class="font-sports uppercase text-lg text-afochAzul leading-tight">${esc(titulo)}</h3>
            ${subtitulo ? `<span class="text-xs text-slate-500">${esc(subtitulo)}</span>` : ''}
        </header>
        <div class="overflow-x-auto">
            <table class="w-full text-[13px] sm:text-sm">
                <caption class="sr-only">Posiciones: ${esc(t.categoria)}${t.zona ? ', ' + esc(t.zona) : ''}</caption>
                <thead class="bg-afochClaro text-[11px] text-slate-500">
                    <tr><th scope="col" class="w-10 pl-3 pr-1 py-2 text-center font-semibold"><abbr title="Posición" class="no-underline">#</abbr></th><th scope="col" class="px-2 py-2 text-left font-semibold">Club</th>
                    ${th('pj')}${th('g', '', extra)}${th('e', '', extra)}${th('p', '', extra)}${th('gf', '', extra)}${th('gc', '', extra)}${th('dif')}
                    ${criterio === 'promedio' ? th('pts') + th('prom', 'pr-3 text-afochAzul') : th('pts', 'pr-3 text-afochAzul')}</tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
        ${pie({ clasificados: lista.some(c => c.clasificado), nota: t.nota, criterio, marca: marcaNota })}
    </article>`;
}

/* ---------- Promedios (descenso) ---------- */
function porAnio(t, club) {
    const anios = new Map();
    (t.periodos || []).forEach((et, i) => {
        const y = 2000 + Number((String(et).match(/(\d{2})$/) || [])[1] || 0);
        const a = anios.get(y) || { pj: 0, pts: 0 };
        a.pj += club.periodos?.[i]?.pj || 0; a.pts += club.periodos?.[i]?.pts || 0;
        anios.set(y, a);
    });
    return anios;
}

function listaPromedios(t) {
    return (t.clubes || []).map(c => {
        const a = porAnio(t, c);
        const pj = [...a.values()].reduce((s, x) => s + x.pj, 0), pts = [...a.values()].reduce((s, x) => s + x.pts, 0);
        return { ...c, a, pj, pts, prom: pj > 0 ? pts / pj : null };
    }).sort((x, y) => (y.prom ?? -1) - (x.prom ?? -1) || y.pts - x.pts || String(x.nombre).localeCompare(String(y.nombre), 'es'));
}

export function promediosHtml(t, { escudoDe, compacto = false } = {}) {
    const anios = [...new Set((t.periodos || []).map(et => 2000 + Number((String(et).match(/(\d{2})$/) || [])[1] || 0)))].sort();
    const lista = listaPromedios(t);
    const extra = compacto ? 'hidden' : 'hidden md:table-cell';
    const filas = lista.map((c, i) => `
        <tr class="border-t border-slate-100 ${i === 0 ? 'bg-afochCeleste/5' : ''}">
            <td class="w-10 pl-3 pr-1 py-2 text-center"><span class="font-sports text-base text-slate-500">${i + 1}</span></td>
            <td class="px-2 py-2 min-w-[8.5rem]">${clubCelda(c, escudoDe)}</td>
            ${anios.map(y => td(c.a.get(y)?.pj ? c.a.get(y).pts : '\u2013', 'text-slate-600', extra)).join('')}
            ${td(c.pj, 'text-slate-600')}${td(c.pts, 'text-slate-700')}${td(fmtProm(c.prom), 'pr-3 font-sports text-base text-afochAzul')}
        </tr>`).join('');
    return `
    <article class="bg-white border border-slate-200 min-w-0 w-full self-start">
        <header class="px-4 pt-4 pb-3"><h3 class="font-sports uppercase text-lg text-afochAzul leading-tight">${esc(t.categoria)}</h3></header>
        <div class="overflow-x-auto">
            <table class="w-full text-[13px] sm:text-sm">
                <caption class="sr-only">Tabla de promedios: ${esc(t.categoria)}</caption>
                <thead class="bg-afochClaro text-[11px] text-slate-500"><tr>
                    <th scope="col" class="w-10 pl-3 pr-1 py-2 text-center font-semibold">#</th><th scope="col" class="px-2 py-2 text-left font-semibold">Club</th>
                    ${anios.map(y => `<th scope="col" class="${extra} px-1.5 py-2 text-center font-semibold"><abbr title="Puntos en ${y}" class="no-underline">${y}</abbr></th>`).join('')}
                    ${th('pj')}${th('pts')}${th('prom', 'pr-3 text-afochAzul')}
                </tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
        <footer class="px-4 py-3 border-t border-slate-100 text-[11px] leading-relaxed text-slate-500">Promedio = puntos \u00F7 partidos jugados en los torneos de ${anios[0] ?? ''} a ${anios[anios.length - 1] ?? ''}. Las columnas por año muestran los puntos de cada temporada.</footer>
    </article>`;
}

/* ---------- Vista completa: selector + tablas ---------- */
const chipBase = 'shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wide px-3 py-2 border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-afochMedio';
const chipOn = 'bg-afochAzul text-white border-afochAzul';
const chipOff = 'bg-white text-afochAzul border-slate-300 hover:border-afochMedio';

export function montarPosiciones(el, docs, { escudoDe, compacto = false, sincronizarUrl = false } = {}) {
    // Si ya estaba montado, solo se actualizan los datos (conserva la categoría elegida y no duplica eventos).
    if (el.__posiciones) return el.__posiciones.actualizar(docs, escudoDe);

    let datos = docs || [], escudos = escudoDe;
    const url = sincronizarUrl ? new URLSearchParams(location.search) : new URLSearchParams();
    const est = { g: url.get('g') || '', c: url.get('c') || '' };

    const armarGrupos = () => {
        const visibles = datos.filter(d => d.publicada !== false);
        const conocidos = GRUPOS.filter(g => visibles.some(d => d.grupo === g.id));
        const otros = [...new Set(visibles.map(d => d.grupo).filter(id => !GRUPOS.some(g => g.id === id)))]
            .map(id => ({ id, nombre: id.charAt(0).toUpperCase() + id.slice(1) }));
        return [...conocidos, ...otros].map(g => ({ ...g, docs: visibles.filter(d => d.grupo === g.id) }));
    };

    const pintar = () => {
        const grupos = armarGrupos();
        if (!grupos.length) { el.innerHTML = ''; return false; }
        const g = grupos.find(x => x.id === est.g) || grupos[0];
        est.g = g.id;
        const cats = [...new Set(g.docs.map(d => d.categoria))];
        if (!cats.some(c => slug(c) === est.c)) est.c = slug(cats[0]);
        const cat = cats.find(c => slug(c) === est.c);
        const docsCat = g.docs.filter(d => d.categoria === cat);
        const claves = new Set(docsCat.map(d => [d.torneo, d.copa].filter(Boolean).join(' \u00B7 ')));
        const unica = claves.size <= 1;
        const encabezadoTorneo = unica ? [...claves][0] : '';
        const fecha = docsCat.map(d => d.fecha).filter(Boolean).sort((a, b) => b - a)[0];

        const chipsGrupo = grupos.length > 1 ? `
            <div role="tablist" aria-label="Categorías" class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                ${grupos.map(x => `<button type="button" role="tab" data-g="${esc(x.id)}" aria-selected="${x.id === g.id}" class="${chipBase} ${x.id === g.id ? chipOn : chipOff}">${esc(x.nombre)}</button>`).join('')}
            </div>` : '';
        const chipsCat = cats.length > 1 ? `
            <div role="group" aria-label="Divisiones de ${esc(g.nombre)}" class="flex gap-2 overflow-x-auto pb-1 mt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                ${cats.map(c => `<button type="button" data-c="${esc(slug(c))}" aria-pressed="${c === cat}" class="shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1.5 border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-afochMedio ${c === cat ? 'bg-afochMedio text-white border-afochMedio' : 'bg-white text-slate-600 border-slate-300 hover:border-afochMedio'}">${esc(c)}</button>`).join('')}
            </div>` : '';
        const meta = (encabezadoTorneo || fecha) ? `
            <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mt-5 mb-4">
                <p class="text-sm font-semibold text-slate-700">${esc(encabezadoTorneo)}</p>
                ${fecha ? `<p class="text-xs text-slate-500">Actualizado el ${esc(fmtFecha(fecha))}</p>` : ''}
            </div>` : '<div class="mt-5"></div>';

        const tablas = docsCat.map(d => d.tipo === 'promedios'
            ? promediosHtml(d, { escudoDe: escudos, compacto })
            : tablaHtml(d, { escudoDe: escudos, compacto, subtitulo: unica ? '' : [d.torneo, d.copa].filter(Boolean).join(' \u00B7 ') })).join('');
        const ancho = docsCat.length === 1 ? (docsCat[0].tipo === 'promedios' ? 'max-w-5xl' : 'max-w-3xl') : (compacto ? 'lg:grid-cols-2' : 'xl:grid-cols-2');

        el.innerHTML = `${chipsGrupo}${chipsCat}${meta}<div class="grid gap-5 ${ancho}">${tablas}</div>`;
        return true;
    };

    el.addEventListener('click', e => {
        const bg = e.target.closest('[data-g]'), bc = e.target.closest('[data-c]');
        if (!bg && !bc) return;
        if (bg) { est.g = bg.dataset.g; est.c = ''; }
        if (bc) est.c = bc.dataset.c;
        pintar();
        if (sincronizarUrl) {
            const q = new URLSearchParams({ g: est.g, c: est.c });
            history.replaceState(null, '', `${location.pathname}?${q}`);
        }
        el.querySelector(bg ? `[data-g="${CSS.escape(est.g)}"]` : `[data-c="${CSS.escape(est.c)}"]`)?.focus({ preventScroll: true });
    });
    el.__posiciones = {
        actualizar(nuevos, nuevosEscudos) {
            const foco = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset : null;
            datos = nuevos || []; if (nuevosEscudos) escudos = nuevosEscudos;
            const ok = pintar();
            if (foco) el.querySelector(foco.g ? `[data-g="${CSS.escape(foco.g)}"]` : foco.c ? `[data-c="${CSS.escape(foco.c)}"]` : 'x')?.focus({ preventScroll: true });
            return ok;
        }
    };
    return pintar();
}

/* ---------- Versión mini y carrusel (columna lateral de torneos.html) ---------- */
function miniTablaHtml(t, { escudoDe } = {}) {
    const promedios = t.tipo === 'promedios';
    const porProm = promedios || t.criterio === 'promedio';
    const lista = promedios ? listaPromedios(t) : ordenar(t.clubes, t.criterio);
    const cab = (k, extra = '') => `<th scope="col" class="px-1 py-1.5 text-center font-semibold ${extra}"><abbr title="${TH[k][1]}" class="no-underline">${TH[k][0]}</abbr></th>`;
    const filas = lista.map((c, i) => `
        <tr class="border-t border-slate-100 ${i === 0 ? 'bg-afochCeleste/5' : ''}">
            <td class="${c.clasificado ? 'shadow-[inset_3px_0_0_#00D1FF]' : ''} w-8 pl-2 pr-0.5 py-1.5 text-center"><span class="font-sports text-sm ${i === 0 ? 'text-afochAzul' : 'text-slate-500'}">${i + 1}</span></td>
            <td class="px-1 py-1.5">${clubCelda(c, escudoDe, 'w-5 h-5', 'text-[8px]')}</td>
            ${td(c.pj, 'text-slate-600 px-1')}
            ${porProm
                ? td(c.pts, 'text-slate-700 px-1') + td(fmtProm(c.prom), 'pr-2 font-sports text-sm text-afochAzul')
                : td(fmtDif(c.dif), 'px-1 font-semibold ' + clsDif(c.dif)) + td(c.pts, 'pr-2 font-sports text-sm text-afochAzul')}
        </tr>`).join('');
    const notas = [];
    if (lista.some(c => c.clasificado)) notas.push('<span class="inline-flex items-center gap-1"><span class="w-2 h-2 bg-afochCeleste" aria-hidden="true"></span>Clasificado</span>');
    if (porProm) notas.push('<span>Orden por promedio (pts \u00F7 PJ)</span>');
    return `
    <div class="border border-slate-200 overflow-hidden">
        <table class="w-full text-[12.5px]">
            <caption class="sr-only">Posiciones: ${esc(t.categoria)}${t.zona ? ', ' + esc(t.zona) : ''}</caption>
            <thead class="bg-afochClaro text-[10px] text-slate-500"><tr>
                <th scope="col" class="w-8 pl-2 pr-0.5 py-1.5 text-center font-semibold">#</th><th scope="col" class="px-1 py-1.5 text-left font-semibold">Club</th>
                ${cab('pj')}${porProm ? cab('pts') + cab('prom', 'pr-2 text-afochAzul') : cab('dif') + cab('pts', 'pr-2 text-afochAzul')}
            </tr></thead>
            <tbody>${filas}</tbody>
        </table>
    </div>
    ${notas.length ? `<p class="mt-2 text-[10px] leading-relaxed text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">${notas.join('')}</p>` : ''}`;
}

const FLECHA = d => `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const btnNav = 'w-9 h-9 border border-slate-300 bg-white text-afochAzul flex items-center justify-center hover:border-afochMedio hover:text-afochMedio transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-afochMedio';

/**
 * Carrusel con una diapositiva por tabla. Avanza solo cada `intervalo` ms (se pausa con el mouse, el foco o el dedo,
 * y no avanza si el visitante pidió menos movimiento). Se desliza con el dedo o con las flechas.
 */
export function montarCarrusel(el, docs, { escudoDe, enlace = 'posiciones.html', intervalo = 6500 } = {}) {
    // Si ya estaba montado, solo se actualizan las diapositivas (se queda en la que estaba viendo).
    if (el.__carrusel) return el.__carrusel.actualizar(docs, escudoDe);

    let lista = [], escudos = escudoDe, pista = null, contador = null;
    const nombreGrupo = id => (GRUPOS.find(g => g.id === id) || { nombre: id }).nombre;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const actual = () => Math.round(pista.scrollLeft / (pista.clientWidth || 1));
    const ir = (i, suave = true) => {
        const n = lista.length, k = (i + n) % n;
        pista.scrollTo({ left: k * pista.clientWidth, behavior: suave && !reducido ? 'smooth' : 'auto' });
    };
    // la altura sigue a la diapositiva visible, así no queda espacio vacío bajo las tablas cortas
    const ajustar = () => { const s = pista?.children[Math.min(actual(), lista.length - 1)]; if (s) pista.style.height = s.offsetHeight + 'px'; };

    const construir = () => {
        const diapositivas = lista.map((d, i) => {
            const unica = !d.zona || /^[uú]nica$/i.test(d.zona);
            const titulo = unica ? d.categoria : `${d.categoria} \u00B7 ${d.zona}`;
            const href = `${enlace}?g=${encodeURIComponent(d.grupo)}&c=${encodeURIComponent(slug(d.categoria))}`;
            return `
            <section class="w-full shrink-0 snap-center min-w-0" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${lista.length}">
                <a href="${href}" class="group block mb-3">
                    <span class="block text-[11px] font-semibold uppercase tracking-wide text-afochMedio">${esc(d.torneo || nombreGrupo(d.grupo))}</span>
                    <span class="block font-sports uppercase text-base text-afochAzul leading-tight group-hover:text-afochMedio transition">${esc(titulo)}</span>
                </a>
                ${miniTablaHtml(d, { escudoDe: escudos })}
            </section>`;
        }).join('');

        el.innerHTML = `
            <div role="region" aria-roledescription="carrusel" aria-label="Tablas de posiciones">
                <div data-pista class="flex items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory transition-[height] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">${diapositivas}</div>
                ${lista.length > 1 ? `
                <div class="mt-4 flex items-center justify-between gap-2">
                    <button type="button" data-ant class="${btnNav}" aria-label="Tabla anterior">${FLECHA('M15 18l-6-6 6-6')}</button>
                    <span class="text-xs font-semibold text-slate-500 tabular-nums" data-contador aria-live="off">1 / ${lista.length}</span>
                    <button type="button" data-sig class="${btnNav}" aria-label="Tabla siguiente">${FLECHA('M9 18l6-6-6-6')}</button>
                </div>` : ''}
                <a href="${enlace}" class="mt-4 block text-center text-sm font-semibold text-afochMedio border border-slate-200 py-3 hover:border-afochMedio hover:bg-afochClaro transition">Ver todas las posiciones \u2192</a>
            </div>`;
        pista = el.querySelector('[data-pista]'); contador = el.querySelector('[data-contador]');
        pista.addEventListener('scroll', () => { if (contador) contador.textContent = `${Math.min(actual(), lista.length - 1) + 1} / ${lista.length}`; ajustar(); }, { passive: true });
        el.querySelector('[data-ant]')?.addEventListener('click', () => ir(actual() - 1));
        el.querySelector('[data-sig]')?.addEventListener('click', () => ir(actual() + 1));
        ajustar();
    };

    const reiniciar = () => { parar(); arrancar(); };
    // avance automático
    let timer = null, visible = true;
    const parar = () => { clearInterval(timer); timer = null; };
    const arrancar = () => { if (reducido || lista.length < 2 || timer || !visible || document.hidden) return; timer = setInterval(() => ir(actual() + 1, actual() + 1 < lista.length), intervalo); };
    el.addEventListener('mouseenter', parar); el.addEventListener('mouseleave', arrancar);
    el.addEventListener('focusin', parar); el.addEventListener('focusout', arrancar);
    el.addEventListener('touchstart', parar, { passive: true }); el.addEventListener('touchend', () => setTimeout(arrancar, 4000), { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? parar() : arrancar());
    window.addEventListener('resize', () => { if (pista) { ir(actual(), false); ajustar(); } });
    if (window.IntersectionObserver) new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? arrancar() : parar(); }).observe(el);

    el.__carrusel = {
        actualizar(nuevos, nuevosEscudos) {
            lista = (nuevos || []).filter(d => d.publicada !== false);
            if (nuevosEscudos) escudos = nuevosEscudos;
            if (!lista.length) { parar(); el.innerHTML = ''; pista = null; return false; }
            const idx = pista ? actual() : 0;
            construir();
            ir(Math.min(idx, lista.length - 1), false);
            ajustar();
            reiniciar();
            return true;
        }
    };
    return el.__carrusel.actualizar(docs, escudoDe);
}
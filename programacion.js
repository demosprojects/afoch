/**
 * AFOCH - Programación semanal como texto (sin imágenes).
 * Lee el MISMO texto que se pega en el generador de flyers y lo muestra en la web
 * ordenado por día, con filtro por categoría y escudos de los clubes.
 *
 *   parsearProgramacion(texto) -> lista plana de partidos
 *   resumir(partidos)          -> datos para la vista previa del panel
 *   montarProgramacion(el, partidos, { escudoDe }) -> dibuja la programación en `el`
 *   crearBuscadorEscudos(clubes) -> nombre => url del escudo ('' si no hay uno claro)
 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinAcentos = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* ---------- 1) PARSER (misma lógica que el generador de flyers) ---------- */
const DIAS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
const RE_DIA_FECHA = /[\s\-–—]*(?:\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b)?[\s\-–—]*(?:(\d{1,2})\s*\/\s*(\d{1,2}))?[\s\-–—]*$/i;
const RE_HORA_FIN = /[\s\-–—]*\b(\d{1,2})(?:\s*:\s*(\d{2})\s*(?:hs?\b\.?)?|\s*hs?\b\.?)\s*$/i;
const RE_ESTADO_FIN = /[\s\-–—]*\b(pendiente|pend|pen|a\s+confirmar|a\s+conf|a\s+definir|suspendido|susp|postergado|post)\b\.?\s*$/i;
const horaDe = (h, m) => `${String(h).padStart(2, '0')}:${m || '00'}`;
function etiquetaEstado(p) {
    p = p.toLowerCase().replace(/\s+/g, ' ');
    if (p.startsWith('pen')) return 'Pendiente';
    if (p.startsWith('a conf')) return 'A confirmar';
    if (p.startsWith('a def')) return 'A definir';
    if (p.startsWith('susp')) return 'Suspendido';
    return 'Postergado';
}

function parsearFila(linea) {
    let t = linea.replace(/\t/g, ' ').replace(/^[*\-•·▪►>]+\s*/, '').replace(/\s+/g, ' ').trim();
    let hora = '', diaN = '', fecha = '', etiqueta = '', nota = '', pend = '';

    const mh = t.match(/^(\d{1,2})\s*[:.hH]\s*(\d{2})\s*(?:hs?\b\.?)?\s*[-–—]\s*(.*)$/i);
    if (mh) { hora = horaDe(mh[1], mh[2]); t = mh[3].trim(); }

    const mn = t.match(/\s*\(([^)]{1,30})\)\s*$/);
    if (mn) { nota = mn[1].replace(/^(cancha|sede|en|local)\s*[:\-]?\s+/i, '').trim(); t = t.slice(0, mn.index).trim(); }

    const me = t.match(RE_ESTADO_FIN);
    if (me && me.index > 0) { pend = etiquetaEstado(me[1]); t = t.slice(0, me.index).trim(); }

    if (!hora) {
        const mt = t.match(RE_HORA_FIN);
        if (mt) { hora = horaDe(mt[1], mt[2]); t = t.slice(0, mt.index).trim(); }
    }
    const md = t.match(RE_DIA_FECHA);
    if (md && (md[1] || md[2])) {
        diaN = md[1] ? sinAcentos(md[1]) : '';
        fecha = md[2] ? `${md[2].padStart(2, '0')}/${md[3].padStart(2, '0')}` : '';
        t = t.slice(0, md.index).trim();
    }
    t = t.replace(/[\s\-–—.]+$/, '').trim();

    const ml = t.match(/^([^:]{1,40}?)\s*:\s*(.+)$/);
    if (ml && !/\bvs\b/i.test(ml[1])) { etiqueta = ml[1].trim(); t = ml[2].trim(); }

    const base = { hora: pend ? '' : hora, estado: pend, diaN, fecha, etiqueta, nota };
    const partes = t.split(/\s+VS\.?\s+/i);
    if (partes.length === 2 && partes[0].trim() && partes[1].trim()) return { ...base, l: partes[0].trim(), v: partes[1].trim() };
    return { ...base, texto: t };
}

export function parsearProgramacion(texto) {
    const partidos = [];
    let cat = '', sede = '', zona = '';

    const titulo = txt => {
        txt = txt.replace(/\s+/g, ' ').replace(/\s*:$/, '').trim();
        if (/^PROGRAMACI[OÓ]N/i.test(txt) && !partidos.length && !cat) return;
        if (/^ZONA\b/i.test(txt)) { zona = txt; return; }
        const partes = txt.split(/\s+[–—]\s+/);
        let c = partes[0], extra = partes.slice(1).join(' · ');
        const ms = c.match(/^(.*?)\s*[-–—]\s*sede\s*:?\s*(.+)$/i);   // "Infantiles - Sede: Avenida FC"
        sede = ms ? ms[2].trim() : '';
        if (ms) c = ms[1].trim();
        const ml = c.match(/^(.*?)\s+(LOCAL\b.*)$/i);               // "Veteranos +50 Local X Fecha 5"
        if (ml) { c = ml[1]; extra = [ml[2], extra].filter(Boolean).join(' · '); }
        cat = c; zona = extra;
    };

    String(texto || '').split(/\r?\n/).forEach(crudo => {
        const t = crudo.replace(/\t/g, ' ').trim();
        if (!t || /^[-=_]{3,}$/.test(t)) return;
        const h = t.match(/^\*+\s*([^*].*?)\s*\*+$/);
        if (h) { titulo(h[1].trim()); return; }
        const conVineta = /^[*\-•·▪►>]/.test(t);
        if (!conVineta && !/\sVS\.?\s/i.test(t)) { titulo(t); return; }

        const f = parsearFila(t);
        if (!f.texto && !f.l) return;
        let z = zona;
        if (f.etiqueta) z = /^ZONA\b/i.test(f.etiqueta) || !zona ? f.etiqueta : `${zona} · ${f.etiqueta}`;
        partidos.push({ ...f, cat, zona: z, sede });
    });

    // "Sábado – A confirmar" no trae fecha: se completa con la de otro partido del mismo día
    const fechaDeDia = {};
    partidos.forEach(p => { if (p.diaN && p.fecha) fechaDeDia[p.diaN] = p.fecha; });
    partidos.forEach(p => { if (!p.fecha && p.diaN) p.fecha = fechaDeDia[p.diaN] || ''; });
    return partidos;
}

/* ---------- 2) Agrupado por día / categoría ---------- */
function fechaCompleta(fecha, ref = new Date()) {
    const [d, m] = fecha.split('/').map(Number);
    let date = new Date(ref.getFullYear(), m - 1, d);
    if (ref - date > 180 * 864e5) date = new Date(ref.getFullYear() + 1, m - 1, d);   // programación de enero cargada en diciembre
    return date;
}
const etiquetaDia = p => p.fecha
    ? fechaCompleta(p.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : (DIAS[p.diaN] || 'Fecha a confirmar');
const claveHora = p => p.hora || '99:99';

export function agruparPorDia(partidos) {
    const dias = new Map();
    partidos.forEach(p => {
        const k = p.fecha || p.diaN || 'sin';
        if (!dias.has(k)) dias.set(k, { k, etiqueta: etiquetaDia(p), orden: p.fecha ? fechaCompleta(p.fecha).getTime() : Infinity, grupos: new Map() });
        const d = dias.get(k), gk = `${p.cat}|${p.zona}`;
        if (!d.grupos.has(gk)) d.grupos.set(gk, { cat: p.cat, zona: p.zona, filas: [] });
        d.grupos.get(gk).filas.push(p);
    });
    return [...dias.values()].sort((a, b) => a.orden - b.orden).map(d => ({
        ...d,
        grupos: [...d.grupos.values()].map(g => ({ ...g, filas: g.filas.map((f, i) => [f, i]).sort((a, b) => claveHora(a[0]).localeCompare(claveHora(b[0])) || a[1] - b[1]).map(x => x[0]) }))
    }));
}

/** Resumen para la vista previa del panel */
export function resumir(partidos) {
    const dias = agruparPorDia(partidos).map(d => ({ etiqueta: d.etiqueta, n: [...d.grupos].reduce((a, g) => a + g.filas.length, 0) }));
    return {
        total: partidos.length, dias,
        categorias: [...new Set(partidos.map(p => p.cat).filter(Boolean))],
        sinFecha: partidos.filter(p => !p.fecha).length,
        sinHora: partidos.filter(p => !p.hora && !p.estado).length
    };
}

/* ---------- 3) Escudos por nombre (misma lógica del generador) ---------- */
const VACIAS = new Set(['fc', 'cf', 'ca', 'club', 'de', 'del', 'la', 'el', 'los', 'las', 'y']);
function tokens(nombre) {
    const t = sinAcentos(nombre).split(/[^a-z0-9]+/).filter(x => x && !VACIAS.has(x));
    return { fuertes: t.filter(x => x.length > 1), iniciales: t.filter(x => x.length === 1), norm: t.join(' ') };
}
const tokIgual = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));
function puntaje(q, t) {
    if (q.norm && q.norm === t.norm) return 2;
    if (!q.fuertes.length || !t.fuertes.length) return 0;
    const [chico, grande] = q.fuertes.length <= t.fuertes.length ? [q, t] : [t, q];
    const usados = new Set();
    for (const p of chico.fuertes) {
        const k = grande.fuertes.findIndex((g, n) => !usados.has(n) && tokIgual(p, g));
        if (k < 0) return 0;
        usados.add(k);
    }
    const bono = (ini, fu) => ini.filter(x => fu.some(w => w[0] === x)).length * 0.05;
    return chico.fuertes.length / grande.fuertes.length + bono(q.iniciales, t.fuertes) + bono(t.iniciales, q.fuertes);
}
/** clubes: [{ nombre, nombreCorto, escudoUrl }]. Devuelve nombre => url del escudo ('' si no hay uno claro). */
export function crearBuscadorEscudos(clubes) {
    const prep = (clubes || []).filter(c => c.escudoUrl).map(c => ({ url: c.escudoUrl, nombres: [c.nombre, c.nombreCorto].map(tokens).filter(t => t.norm) }));
    const memo = new Map();
    return nombre => {
        const clave = sinAcentos(nombre).replace(/\s+/g, ' ').trim();
        if (memo.has(clave)) return memo.get(clave);
        const q = tokens(nombre);
        let mejor = null, pm = 0, empate = false;
        prep.forEach(p => {
            const pt = Math.max(0, ...p.nombres.map(n => puntaje(q, n)));
            if (pt <= 0) return;
            if (pt > pm + 1e-9) { mejor = p; pm = pt; empate = false; } else if (Math.abs(pt - pm) < 1e-9) empate = true;
        });
        const r = mejor && !empate && pm >= 0.5 ? mejor.url : '';
        memo.set(clave, r);
        return r;
    };
}

/* ---------- 4) Dibujo ---------- */
const chip = f => {
    const base = 'font-sports px-2 sm:px-3 py-1 text-sm sm:text-base shrink-0 text-center leading-tight';
    if (f.estado) return `<div class="${base} border-2 border-dashed border-afochMedio text-afochMedio text-xs sm:text-sm uppercase">${esc(f.estado)}</div>`;
    return `<div class="${base} bg-afochAzul text-white">${esc(f.hora || '--:--')}</div>`;
};
const sedeDe = f => f.nota ? `Cancha: ${f.nota}` : f.sede ? `Sede: ${f.sede}` : '';

function filaHtml(f, escudoDe, conDia = false) {
    const escudo = n => { const u = escudoDe ? escudoDe(n) : ''; return u ? `<img src="${esc(u)}" class="w-10 h-10 sm:w-8 sm:h-8 object-contain shrink-0" alt="" loading="lazy">` : ''; };
    const sede = sedeDe(f);
    const dia = conDia && f.fecha ? fechaCompleta(f.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(',', '') : '';
    const centro = dia ? `<div class="text-center shrink-0"><div class="text-[11px] text-slate-500 uppercase mb-1">${esc(dia)}</div>${chip(f)}</div>` : chip(f);
    const meta = sede ? `<div class="mt-2 text-xs text-slate-500">${esc(sede)}</div>` : '';
    if (!f.l) {
        return `<div class="border border-slate-200 bg-white p-3 sm:p-4"><div class="flex items-center gap-3">${chip(f)}<div class="font-sports uppercase text-sm sm:text-lg text-afochAzul leading-tight">${esc(f.texto)}</div></div>${meta}</div>`;
    }
    return `<div class="border border-slate-200 bg-white p-3 sm:p-4">
        <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 min-w-0 text-center sm:text-left font-sports uppercase text-sm sm:text-lg text-afochAzul leading-tight">${escudo(f.l)}<span class="min-w-0 break-words">${esc(f.l)}</span></div>
            ${centro}
            <div class="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-1 sm:gap-2 min-w-0 text-center sm:text-right font-sports uppercase text-sm sm:text-lg text-afochAzul leading-tight"><span class="min-w-0 break-words">${esc(f.v)}</span>${escudo(f.v)}</div>
        </div>${meta}</div>`;
}

/** Los próximos `n` partidos (con rivales) desde ahora; los "a confirmar" van al final de su día. */
export function proximos(partidos, n = 3, ahora = new Date()) {
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const cuando = p => {
        const d = fechaCompleta(p.fecha, ahora);
        const [h, m] = (p.hora || '23:59').split(':').map(Number);
        d.setHours(h, m);
        return d;
    };
    return partidos
        .filter(p => p.l && p.fecha && !/suspendido|postergado/i.test(p.estado))
        .filter(p => (p.hora ? cuando(p) >= ahora : fechaCompleta(p.fecha, ahora) >= inicioHoy))
        .map(p => [p, cuando(p)])
        .sort((a, b) => a[1] - b[1])
        .slice(0, n)
        .map(x => x[0]);
}

/** Tarjeta de un partido (con el día arriba de la hora), para el home. */
export const tarjetaPartido = (f, escudoDe) => filaHtml(f, escudoDe, true);

/** Dibuja filtros + días dentro de `el`. */
export function montarProgramacion(el, partidos, { escudoDe } = {}) {
    const cats = [...new Set(partidos.map(p => p.cat).filter(Boolean))];
    let filtro = el.dataset.filtroCat || '';           // se conserva si la programación se actualiza en vivo
    if (filtro && !cats.includes(filtro)) filtro = '';
    const pintar = () => {
        const lista = filtro ? partidos.filter(p => p.cat === filtro) : partidos;
        const filtros = cats.length > 1 ? `<div class="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filtrar por categoría">${['', ...cats].map(c =>
            `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === filtro}" class="text-xs font-semibold uppercase tracking-wide px-3 py-2 border transition ${c === filtro ? 'bg-afochAzul text-white border-afochAzul' : 'bg-white text-afochAzul border-slate-300 hover:border-afochMedio'}">${esc(c || 'Todas')}</button>`).join('')}</div>` : '';
        const dias = agruparPorDia(lista).map(d => `
            <section class="mb-10 last:mb-0">
                <h2 class="font-sports uppercase text-lg text-afochMedio mb-1 pb-2 border-b-2 border-afochCeleste capitalize">${esc(d.etiqueta)}</h2>
                ${d.grupos.map(g => `
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-5 mb-2">
                    ${g.cat ? `<span class="bg-afochAzul text-white text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5">${esc(g.cat)}</span>` : ''}
                    ${g.zona ? `<span class="text-xs font-semibold text-slate-600 uppercase">${esc(g.zona)}</span>` : ''}
                </div>
                <div class="space-y-3">${g.filas.map(f => filaHtml(f, escudoDe)).join('')}</div>`).join('')}
            </section>`).join('');
        el.innerHTML = filtros + dias;
    };
    el.onclick = e => {                                  // onclick (y no addEventListener): al volver a montar reemplaza al anterior
        const b = e.target.closest('[data-cat]');
        if (b) { filtro = b.dataset.cat; el.dataset.filtroCat = filtro; pintar(); }
    };
    pintar();
}

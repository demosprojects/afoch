/**
 * AFOCH - Lectura del Excel de posiciones (la usa solo el panel).
 *
 *   leerExcel(XLSX, arrayBuffer) -> { tablas, avisos, omitidas }
 *
 * Detecta solo cada tabla del libro (zonas y categorías), sin depender de la hoja ni de la fila exacta:
 *   - encabezado: una fila "ZONA ..." (o "CATEGORIA ..." si no hay zonas, como en Veteranos);
 *   - columnas de resumen: se ubican a partir de la columna "JUG" (JUG, FAV, CONT, DIF, GAN, EMP, PER, PTS, PROM);
 *   - resultados por fecha: pares GF/GC a la izquierda de "JUG", si existen, se usan para controlar los totales.
 * Las hojas ocultas se omiten.
 */
const limpiar = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
const sinAcentos = s => limpiar(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const slug = s => sinAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- Textos ---------- */
const MINUS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a']);
const SIEMPRE_MAYUS = new Set(['FC', 'CF', 'CD', 'CA', 'AFOCH', 'MT']);
const ACENTOS = { UNION: 'Unión', ATLETICO: 'Atlético', MARTIRES: 'Mártires', CORDOBA: 'Córdoba', HEROES: 'Héroes', MATIAS: 'Matías', CENTO: 'Centro', DEPORTVO: 'Deportivo', ANGELA: 'Ángela', DIVISION: 'División', PREPARACION: 'Preparación', CATEGORIA: 'Categoría', ANIVERSARIO: 'Aniversario' };

/** "UNION DE SAN BERNARDO" -> "Unión de San Bernardo"; respeta siglas (F.C., C. A.) y números. */
export function titulo(s) {
    return limpiar(s).split(' ').map((tok, i) => {
        const m = tok.match(/^([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]*)(.*?)([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.]*)$/);
        const [, pre, core, post] = m;
        if (!core) return tok;
        const up = core.toUpperCase();
        let out;
        if (/\d/.test(core)) out = core;
        else if (/^([A-ZÁÉÍÓÚÑ]\.)+$/i.test(core)) out = up;
        else if (SIEMPRE_MAYUS.has(up)) out = up;
        else if (ACENTOS[up]) out = ACENTOS[up];
        else if (i > 0 && MINUS.has(core.toLowerCase())) out = core.toLowerCase();
        else out = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
        return pre + out + post;
    }).join(' ');
}

function datosClub(texto) {
    const t = limpiar(texto);
    return {
        nombre: titulo(t.replace(/[©*]/g, '').replace(/\(c\)/gi, '')),
        clasificado: /©|\(c\)/i.test(t),
        marca: /\*\s*$/.test(t) ? '*' : ''
    };
}

function grupoDe(hoja, categoria) {
    const h = limpiar(hoja).toUpperCase(), c = limpiar(categoria).toUpperCase();
    if (/PRIMERA/.test(c) || /PRIMERA/.test(h)) return 'primera';
    if (/SUB\s*20/.test(c) || /SUB\s*20/.test(h)) return 'sub20';
    if (/VETERAN/.test(h)) return 'veteranos';
    if (/INFANTIL/.test(h)) return 'infantiles';
    if (/JUVENIL/.test(h)) return 'juveniles';
    if (/FEMENIN/.test(h)) return 'femenino';
    return slug(h) || 'otras';
}
const ORDEN_GRUPO = { primera: 1, sub20: 2, juveniles: 3, infantiles: 4, veteranos: 5, femenino: 6, promedios: 7 };

/* ---------- Hojas de tablas ---------- */
function bloquesDeHoja(filas, hoja) {
    const B = r => limpiar(filas[r]?.[1]);
    const esZona = t => /^ZONA\b/i.test(t);
    const esCategoria = t => /^(CATEGOR[IÍ]A|PRIMERA|SUB\s*\d+)/i.test(t);
    const heads = [];
    for (let r = 0; r < filas.length; r++) {
        const t = B(r);
        if (!t) continue;
        if (esZona(t)) heads.push(r);
        else if (/^CATEGOR[IÍ]A/i.test(t) && ![1, 2].some(d => esZona(B(r + d)))) heads.push(r);
    }
    const tablas = [], avisosHoja = [];
    let torneoPrev = '', copaPrev = '';
    for (const hr of heads) {
        const tHead = B(hr);
        const propia = !esZona(tHead);
        let categoria = '';
        if (propia) categoria = tHead;
        else for (let r = hr - 1; r >= 0; r--) { if (esCategoria(B(r))) { categoria = B(r); break; } }
        const zona = propia ? 'Única' : titulo(tHead);

        // columna JUG (inicio del resumen)
        let jug = -1;
        for (let r = Math.max(0, hr - 1); r <= hr + 3 && jug < 0; r++)
            (filas[r] || []).forEach((v, c) => { if (jug < 0 && limpiar(v).toUpperCase() === 'JUG') jug = c; });
        if (jug < 0) { avisosHoja.push(`${hoja}: no encontré las columnas de resumen en la fila ${hr + 1}; se omitió "${tHead}".`); continue; }
        let hayProm = false;
        for (let r = Math.max(0, hr - 1); r <= hr + 3; r++) if (limpiar(filas[r]?.[jug + 8]).toUpperCase() === 'PROM') hayProm = true;

        // torneo y copa
        let torneo = '', copa = '';
        for (let r = hr; r >= Math.max(0, hr - 3); r--)
            (filas[r] || []).forEach(v => {
                const t = limpiar(v);
                if (typeof v !== 'string' || t.length < 8) return;
                if (!torneo && /TORNEO/i.test(t)) torneo = t;
                else if (!copa && /COPA/i.test(t) && !/TORNEO/i.test(t)) copa = t;
            });
        if (torneo) { torneoPrev = torneo; copaPrev = copa; }
        else { torneo = torneoPrev; if (!copa) copa = copaPrev; }

        // clubes
        const clubes = [], avisos = [];
        let nota = '';
        for (let r = hr + 1; r < filas.length; r++) {
            const a = limpiar(filas[r]?.[0]), b = limpiar(filas[r]?.[1]);
            const jv = num(filas[r]?.[jug]);
            if (a === '*' && b) { nota = titulo(b); break; }
            if (!a && !b && jv === null) { if (!clubes.length && r - hr <= 3) continue; break; }
            if (/^CLUBES/i.test(b) && jv === null) continue;
            if ((esZona(b) || esCategoria(b)) && jv === null) break;
            if (!b && jv === null) break;

            const fechas = [];
            for (let c = 3; c + 1 < jug; c += 3) {
                const gf = num(filas[r]?.[c]), gc = num(filas[r]?.[c + 1]);
                if (gf !== null && gc !== null) fechas.push([gf, gc]);
            }
            const calc = {
                g: fechas.filter(f => f[0] > f[1]).length, e: fechas.filter(f => f[0] === f[1]).length, p: fechas.filter(f => f[0] < f[1]).length,
                gf: fechas.reduce((s, f) => s + f[0], 0), gc: fechas.reduce((s, f) => s + f[1], 0)
            };
            const hoja_ = { pj: jv, gf: num(filas[r]?.[jug + 1]), gc: num(filas[r]?.[jug + 2]), g: num(filas[r]?.[jug + 4]), e: num(filas[r]?.[jug + 5]), p: num(filas[r]?.[jug + 6]), pts: num(filas[r]?.[jug + 7]) };
            const club = datosClub(filas[r]?.[1]);
            const etiqueta = club.nombre || `Fila ${r + 1} (sin nombre)`;
            const pick = k => hoja_[k] ?? (fechas.length ? calc[k] : 0);
            const g = pick('g'), e = pick('e'), p = pick('p'), gf = pick('gf'), gc = pick('gc');
            if (!club.nombre) avisos.push(`Fila ${r + 1}: el club no tiene nombre en el Excel. Escribilo en el editor antes de publicar.`);
            if (hoja_.pj !== null && hoja_.pj !== g + e + p) avisos.push(`${etiqueta}: PJ (${hoja_.pj}) no coincide con G+E+P (${g + e + p}).`);
            if (fechas.length) {
                const dif = ['g', 'e', 'p', 'gf', 'gc'].filter(k => hoja_[k] !== null && hoja_[k] !== calc[k]);
                if (dif.length) avisos.push(`${etiqueta}: los resultados por fecha no coinciden con el total (${dif.map(k => k.toUpperCase()).join(', ')}).`);
            }
            let ajuste = 0;
            if (hoja_.pts !== null && hoja_.pts !== g * 3 + e) {
                ajuste = hoja_.pts - (g * 3 + e);
                avisos.push(`${etiqueta}: tiene ${hoja_.pts} pts y G/E dan ${g * 3 + e}; se cargó un ajuste de ${ajuste > 0 ? '+' : ''}${ajuste}.`);
            }
            clubes.push({ nombre: club.nombre, pj: g + e + p, g, e, p, gf, gc, ajuste, clasificado: club.clasificado, marca: club.marca });
        }
        const vistos = new Map();
        clubes.forEach(c => { const k = sinAcentos(c.nombre).toLowerCase(); if (!k) return; vistos.set(k, (vistos.get(k) || 0) + 1); });
        vistos.forEach((n, k) => { if (n > 1) avisos.push(`El club "${clubes.find(c => sinAcentos(c.nombre).toLowerCase() === k).nombre}" aparece ${n} veces en esta tabla.`); });
        if (!clubes.length) { avisosHoja.push(`${hoja}: "${tHead}" no tiene clubes.`); continue; }

        const anio = (torneo.match(/20\d\d/) || [])[0];
        const vieja = anio && Number(anio) < new Date().getFullYear();
        if (vieja) avisos.push(`El torneo dice ${anio}: parece de una temporada anterior, así que viene sin publicar.`);
        const mc = torneo.match(/^(.*?)\s*[-–]?\s*"?(COPA\s.+?)"?\s*$/i);
        const mq = torneo.match(/^(.*?)\s*"(.+?)"\s*$/);
        if (mc && mc[1]) { torneo = mc[1]; if (!copa) copa = mc[2]; }
        else if (mq && mq[1]) { torneo = mq[1]; if (!copa) copa = mq[2]; }
        const sinComillas = t => t.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
        torneo = sinComillas(torneo); copa = sinComillas(copa);
        const catLabel = titulo(categoria.replace(/^CATEGORIA\s*/i, 'Categoría '));
        tablas.push({
            tipo: 'tabla', grupo: grupoDe(hoja, categoria), categoria: catLabel || 'Sin categoría', zona,
            torneo: titulo(torneo), copa: titulo(copa), criterio: hayProm ? 'promedio' : 'puntos', nota,
            publicada: !vieja, clubes, avisos
        });
    }
    return { tablas, avisos: avisosHoja };
}

/* ---------- Hoja de promedios ---------- */
function promedios(filas) {
    const periodos = [];
    (filas[0] || []).forEach((v, c) => { const m = limpiar(v).toUpperCase().match(/^(TA|TC)\s*(\d{2})$/); if (m) periodos.push({ etiqueta: `${m[1]} ${m[2]}`, c }); });
    if (!periodos.length) return null;
    const clubes = [], avisos = [];
    for (let r = 2; r < filas.length; r++) {
        const b = limpiar(filas[r]?.[1]);
        if (!b) break;
        const per = periodos.map(p => ({ pj: num(filas[r][p.c]) ?? 0, pts: num(filas[r][p.c + 1]) ?? 0 }));
        const pj = per.reduce((s, x) => s + x.pj, 0), pts = per.reduce((s, x) => s + x.pts, 0);
        const totPts = num(filas[r][22]), totPj = num(filas[r][23]);
        if ((totPts !== null && totPts !== pts) || (totPj !== null && totPj !== pj)) avisos.push(`${titulo(b)}: el total del Excel (${totPts} pts / ${totPj} PJ) no coincide con la suma por torneo (${pts} / ${pj}).`);
        clubes.push({ nombre: datosClub(b).nombre, periodos: per });
    }
    if (!clubes.length) return null;
    return {
        tipo: 'promedios', grupo: 'promedios', categoria: titulo(limpiar(filas[0]?.[1]) || 'Primera División'), zona: '',
        torneo: 'Tabla de promedios', copa: '', criterio: 'promedio', nota: '', publicada: true,
        periodos: periodos.map(p => p.etiqueta), clubes, avisos
    };
}

/* ---------- Libro completo ---------- */
export function leerExcel(XLSX, buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ocultas = new Set((wb.Workbook?.Sheets || []).map((s, i) => s.Hidden ? wb.SheetNames[i] : null).filter(Boolean));
    const tablas = [], avisos = [], omitidas = [];
    wb.SheetNames.forEach(nombre => {
        if (ocultas.has(nombre)) { omitidas.push(`${limpiar(nombre)} (hoja oculta)`); return; }
        const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: null, blankrows: true });
        if (/PROMEDIO/i.test(nombre)) {
            const t = promedios(filas);
            if (t) tablas.push({ ...t, hoja: limpiar(nombre) }); else avisos.push(`${limpiar(nombre)}: no pude leer la tabla de promedios.`);
            return;
        }
        const r = bloquesDeHoja(filas, limpiar(nombre));
        r.tablas.forEach(t => tablas.push({ ...t, hoja: limpiar(nombre) }));
        avisos.push(...r.avisos);
    });
    const usados = new Map();
    tablas.forEach((t, i) => {
        let id = slug([t.grupo, t.categoria, t.zona].filter(Boolean).join(' '));
        const n = usados.get(id) || 0; usados.set(id, n + 1);
        t.id = n ? `${id}-${n + 1}` : id;
        t.orden = (ORDEN_GRUPO[t.grupo] || 9) * 1000 + i;
    });
    return { tablas, avisos, omitidas };
}
/**
 * AFOCH - Loaders y estados vacíos / error compartidos.
 * Uso: import { cargando, pelota, sinDatos, errorCarga } from './ui.js';
 */
const estilos = document.createElement('style');
estilos.textContent = `
@keyframes afoch-shimmer{100%{transform:translateX(100%)}}
@keyframes afoch-bounce{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-18px) rotate(180deg)}}
@keyframes afoch-shadow{0%,100%{transform:scaleX(1);opacity:.25}50%{transform:scaleX(.55);opacity:.1}}
@keyframes afoch-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.sk{position:relative;overflow:hidden;background:#E2E8F0}
.sk::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);animation:afoch-shimmer 1.4s infinite}
.afoch-ball{animation:afoch-bounce .9s cubic-bezier(.35,0,.65,1) infinite}
.afoch-shadow{animation:afoch-shadow .9s cubic-bezier(.35,0,.65,1) infinite}
.afoch-in{animation:afoch-in .4s ease both}
@media (prefers-reduced-motion:reduce){.sk::after,.afoch-ball,.afoch-shadow,.afoch-in{animation:none}}`;
document.head.appendChild(estilos);

/* ---------- Loaders ---------- */
const b = (c = '') => `<div class="sk ${c}"></div>`;
const SK = {
    partidos: () => `<div class="border border-slate-200 bg-white p-3 sm:p-4"><div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3"><div class="flex flex-col sm:flex-row items-center gap-2">${b('w-10 h-10 sm:w-8 sm:h-8 rounded-full')}${b('h-4 w-20 sm:w-28')}</div>${b('h-8 w-14 sm:w-16')}<div class="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2">${b('h-4 w-20 sm:w-28')}${b('w-10 h-10 sm:w-8 sm:h-8 rounded-full')}</div></div>${b('h-3 w-40 mt-4')}</div>`,
    comunicados: card => `<div class="${card ? 'bg-white border border-slate-200 border-l-4 border-l-afochCeleste p-6' : 'py-4'}"><div class="flex justify-between mb-3">${b('h-3 w-32')}${b('h-3 w-20')}</div>${b('h-6 w-3/4')}${card ? b('h-3 w-full mt-4') + b('h-3 w-2/3 mt-2') : ''}</div>`,
    noticias: () => `<div class="bg-white border border-slate-200 overflow-hidden">${b('h-48')}<div class="p-5"><div class="flex justify-between mb-3">${b('h-3 w-20')}${b('h-3 w-24')}</div>${b('h-6 w-full')}${b('h-6 w-2/3 mt-2')}</div></div>`,
    clubes: () => `<div class="bg-white border border-slate-200 p-4 sm:p-6 flex flex-col items-center">${b('w-20 h-20 sm:w-24 sm:h-24 rounded-full')}${b('h-5 w-3/4 mt-4')}</div>`,
    galeria: () => b('h-36 sm:h-56'),
    clubesMini: () => `<div class="flex flex-col items-center gap-2">${b('w-16 h-16 rounded-full')}${b('h-3 w-14')}</div>`
};

/** Skeletons con la forma del contenido real. tipo: partidos | comunicados | noticias | clubes | clubesMini */
export const cargando = (tipo, n = 3, opcion) =>
    `<span class="sr-only" role="status">Cargando…</span>` + Array.from({ length: n }, () => SK[tipo](opcion)).join('');

/** Pelota rebotando, para cargas de un solo elemento (detalle de noticia, visor de PDF). */
export const pelota = (texto = 'Cargando…') => `
<div role="status" class="flex flex-col items-center justify-center py-16 text-afochAzul">
    <svg class="afoch-ball w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"><circle cx="12" cy="12" r="9.5" fill="white"/><path d="M12 7.5l3.6 2.6-1.4 4.2H9.8L8.4 10.1z" fill="currentColor"/><path d="M12 7.5V2.6M15.6 10.1l4.6-1.5M14.2 14.3l2.8 3.9M9.8 14.3l-2.8 3.9M8.4 10.1L3.8 8.6"/></svg>
    <div class="afoch-shadow w-10 h-1.5 rounded-full bg-afochAzul mt-2"></div>
    <p class="mt-4 text-xs font-semibold tracking-widest uppercase text-slate-500">${texto}</p>
</div>`;

/* ---------- Estados vacíos ---------- */
const ICONOS = {
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    documento: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    diario: '<path d="M4 5h13a1 1 0 0 1 1 1v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M18 9h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2M8 9h6M8 13h6M8 17h4"/>',
    escudo: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/>',
    tabla: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'
};
const MENSAJES = {
    partidos: { icono: 'calendario', titulo: 'Sin partidos programados', texto: 'Todavía no hay encuentros en agenda. Apenas se programe la próxima fecha, va a aparecer acá.' },
    comunicados: { icono: 'documento', titulo: 'Sin comunicados por ahora', texto: 'Los comunicados oficiales de la Asociación se publicarán en esta sección.' },
    noticias: { icono: 'diario', titulo: 'Sin noticias todavía', texto: 'Estamos preparando las novedades de la liga. Volvé a visitarnos pronto.' },
    clubes: { icono: 'escudo', titulo: 'Aún no hay clubes cargados', texto: 'Muy pronto vas a ver acá a todas las instituciones afiliadas.' },
    posiciones: { icono: 'tabla', titulo: 'Tablas en camino', texto: 'Las posiciones se publicarán próximamente.' }
};

export function vacio({ icono, titulo, texto, compacto = false, boton = '' }) {
    return `
<div role="status" class="afoch-in text-center ${compacto ? 'py-8 px-2' : 'bg-white border border-dashed border-slate-300 py-10 px-4 sm:py-14 sm:px-6'}">
    <div class="relative mx-auto ${compacto ? 'w-14 h-14' : 'w-20 h-20'} rounded-full bg-afochCeleste/10 flex items-center justify-center text-afochMedio">
        <span class="absolute inset-0 rounded-full border-2 border-afochCeleste/40" style="transform:scale(1.25)"></span>
        <svg class="${compacto ? 'w-7 h-7' : 'w-9 h-9'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONOS[icono]}</svg>
    </div>
    <h3 class="font-sports uppercase text-afochAzul ${compacto ? 'text-base' : 'text-xl'} mt-5">${titulo}</h3>
    <p class="text-sm text-slate-500 mt-2 max-w-sm mx-auto">${texto}</p>${boton}
</div>`;
}

/** Aviso de "no hay nada". tipo: partidos | comunicados | noticias | clubes | posiciones */
export const sinDatos = (tipo, compacto = false) => vacio({ ...MENSAJES[tipo], compacto });

/** Aviso de error de carga con botón para reintentar. */
export const errorCarga = (que, compacto = false) => vacio({
    icono: 'alerta', compacto,
    titulo: `No pudimos cargar ${que}`,
    texto: 'Revisá tu conexión e intentá de nuevo en unos instantes.',
    boton: '<button onclick="location.reload()" class="mt-5 bg-afochAzul text-white text-sm font-semibold px-5 py-2 hover:bg-afochMedio transition">Reintentar</button>'
});
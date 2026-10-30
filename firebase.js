/**
 * AFOCH - Capa de datos (Firebase / Firestore + Auth)
 * Las páginas NO usan el SDK directamente: todo pasa por estas funciones.
 * Así, si cambia la estructura de la base, se toca solo este archivo.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
    query, orderBy, where, limit, Timestamp, serverTimestamp, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// Config del proyecto Firebase de la web institucional (afoch-6a9cd)
const firebaseConfig = {
    apiKey: "AIzaSyBQHR2JSQeMeKFDZZHe8wQNUvhphIrandY",
    authDomain: "afoch-6a9cd.firebaseapp.com",
    projectId: "afoch-6a9cd",
    storageBucket: "afoch-6a9cd.firebasestorage.app",
    messagingSenderId: "495053048558",
    appId: "1:495053048558:web:efc7a52ef33338d5bfc1ff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const conId = d => ({ id: d.id, ...d.data() });

/* ---------- AUTH ---------- */
export const login = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);
export const onSesion = cb => onAuthStateChanged(auth, cb);
export async function esAdmin(user) {
    if (!user) return false;
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
}

/* ---------- CLUBES ---------- */
// clubes/{id}: nombre, nombreCorto, escudoUrl, escudoPublicId, activo
export async function listarClubes() {
    const snap = await getDocs(query(collection(db, "clubes"), orderBy("nombre")));
    return snap.docs.map(conId);
}
export async function guardarClub(id, data) {
    const payload = { ...data, actualizado: serverTimestamp() };
    if (id) { await updateDoc(doc(db, "clubes", id), payload); return id; }
    const ref = await addDoc(collection(db, "clubes"), { ...payload, activo: true, creado: serverTimestamp() });
    return ref.id;
}
export const eliminarClub = id => deleteDoc(doc(db, "clubes", id));

/* ---------- PARTIDOS ---------- */
// partidos/{id}: torneo, localId, localNombre, localEscudo, visitanteId, visitanteNombre,
//                visitanteEscudo, fechaHora (Timestamp), estadio, estado (programado|suspendido|jugado)
const aPartido = d => { const p = conId(d); p.fecha = p.fechaHora.toDate(); return p; };

export async function listarPartidos(max = 100) {
    const snap = await getDocs(query(collection(db, "partidos"), orderBy("fechaHora", "desc"), limit(max)));
    return snap.docs.map(aPartido);
}

/** Próximos partidos programados (los usa el home). No requiere índice compuesto. */
export async function proximosPartidos(n = 3) {
    const snap = await getDocs(query(
        collection(db, "partidos"),
        where("fechaHora", ">=", Timestamp.now()),
        orderBy("fechaHora"),
        limit(n + 10)
    ));
    return snap.docs.map(aPartido).filter(p => p.estado === "programado").slice(0, n);
}

export async function guardarPartido(id, data) {
    const { fecha, ...resto } = data; // fecha: objeto Date
    const payload = { ...resto, fechaHora: Timestamp.fromDate(fecha), actualizado: serverTimestamp() };
    if (id) { await updateDoc(doc(db, "partidos", id), payload); return id; }
    const ref = await addDoc(collection(db, "partidos"), { ...payload, creado: serverTimestamp() });
    return ref.id;
}
export const eliminarPartido = id => deleteDoc(doc(db, "partidos", id));

/* ---------- NOTICIAS ---------- */
// noticias/{id}: titulo, categoria, resumen, contenido, imagenUrl, imagenPublicId,
//                publicada (bool), fechaPublicacion (Timestamp)
const aNoticia = d => { const n = conId(d); n.fecha = n.fechaPublicacion?.toDate?.() ?? new Date(); return n; };

/** Noticias ordenadas de más nueva a más vieja. Por defecto solo las publicadas (el panel pide todas). */
export async function listarNoticias(max = 50, soloPublicadas = true) {
    const snap = await getDocs(query(collection(db, "noticias"), orderBy("fechaPublicacion", "desc"), limit(max)));
    const lista = snap.docs.map(aNoticia);
    return soloPublicadas ? lista.filter(n => n.publicada !== false) : lista;
}
export async function obtenerNoticia(id) {
    const snap = await getDoc(doc(db, "noticias", id));
    return snap.exists() ? aNoticia(snap) : null;
}
export async function guardarNoticia(id, data) {
    const { fecha, ...resto } = data; // fecha: objeto Date
    const payload = { ...resto, fechaPublicacion: Timestamp.fromDate(fecha), actualizado: serverTimestamp() };
    if (id) { await updateDoc(doc(db, "noticias", id), payload); return id; }
    const ref = await addDoc(collection(db, "noticias"), { ...payload, creado: serverTimestamp() });
    return ref.id;
}
export const eliminarNoticia = id => deleteDoc(doc(db, "noticias", id));

/* ---------- COMUNICADOS (PDF en Google Drive) ---------- */
// comunicados/{id}: numero, categoria, titulo, resumen, driveUrl (link original pegado),
//                   driveId, previewUrl (para mostrar en la web), descargaUrl,
//                   publicado (bool), fechaPublicacion (Timestamp)

/** Saca el ID de archivo de un link de Drive (…/file/d/ID/view, …/open?id=ID, …/uc?id=ID). null si no es válido. */
export function extraerDriveId(url) {
    const m = String(url || "").match(/\/file\/d\/([\w-]{10,})|[?&]id=([\w-]{10,})/);
    return m ? (m[1] || m[2]) : null;
}

const aComunicado = d => { const c = conId(d); c.fecha = c.fechaPublicacion?.toDate?.() ?? new Date(); return c; };

/** Comunicados de más nuevo a más viejo. Por defecto solo los publicados (el panel pide todos). */
export async function listarComunicados(max = 100, soloPublicados = true) {
    const snap = await getDocs(query(collection(db, "comunicados"), orderBy("fechaPublicacion", "desc"), limit(max)));
    const lista = snap.docs.map(aComunicado);
    return soloPublicados ? lista.filter(c => c.publicado !== false) : lista;
}

export async function guardarComunicado(id, data) {
    const { fecha, driveUrl, ...resto } = data; // fecha: objeto Date
    const driveId = extraerDriveId(driveUrl);
    if (!driveId) throw new Error("El link no parece ser un archivo de Google Drive.");
    const payload = {
        ...resto,
        driveUrl, driveId,
        previewUrl: `https://drive.google.com/file/d/${driveId}/preview`,
        descargaUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
        fechaPublicacion: Timestamp.fromDate(fecha),
        actualizado: serverTimestamp()
    };
    if (id) { await updateDoc(doc(db, "comunicados", id), payload); return id; }
    const ref = await addDoc(collection(db, "comunicados"), { ...payload, creado: serverTimestamp() });
    return ref.id;
}
export const eliminarComunicado = id => deleteDoc(doc(db, "comunicados", id));

/* ---------- GALERÍA ---------- */
// galeria/{id}: imagenUrl, imagenPublicId, descripcion, visible (bool), fechaPublicacion (Timestamp)
const aFoto = d => { const f = conId(d); f.fecha = f.fechaPublicacion?.toDate?.() ?? new Date(); return f; };

/** Fotos de más nueva a más vieja. Por defecto solo las visibles (el panel pide todas). */
export async function listarGaleria(max = 60, soloVisibles = true) {
    const snap = await getDocs(query(collection(db, "galeria"), orderBy("fechaPublicacion", "desc"), limit(max)));
    const lista = snap.docs.map(aFoto);
    return soloVisibles ? lista.filter(f => f.visible !== false) : lista;
}
export async function guardarFoto(id, data) {
    const { fecha, ...resto } = data; // fecha: objeto Date (solo al crear)
    const payload = { ...resto, actualizado: serverTimestamp() };
    if (id) { await updateDoc(doc(db, "galeria", id), payload); return id; }
    const ref = await addDoc(collection(db, "galeria"), { ...payload, visible: true, fechaPublicacion: Timestamp.fromDate(fecha ?? new Date()), creado: serverTimestamp() });
    return ref.id;
}
export const eliminarFoto = id => deleteDoc(doc(db, "galeria", id));

/* ---------- CONFIGURACIÓN DEL SITIO ---------- */
// config/home: bannerUrl, bannerPublicId (vacíos = se usa la imagen por defecto)
export async function obtenerConfigHome() {
    const snap = await getDoc(doc(db, "config", "home"));
    return snap.exists() ? snap.data() : null;
}
export const guardarConfigHome = data => setDoc(doc(db, "config", "home"), { ...data, actualizado: serverTimestamp() }, { merge: true });

/* ---------- PROGRAMACIÓN SEMANAL (texto pegado, igual que el del flyer) ---------- */
// config/programacion: texto (string), actualizado
export async function obtenerProgramacion() {
    const snap = await getDoc(doc(db, "config", "programacion"));
    return snap.exists() ? snap.data() : null;
}
export const guardarProgramacion = texto => setDoc(doc(db, "config", "programacion"), { texto: String(texto || ""), actualizado: serverTimestamp() });

/* ---------- POSICIONES (tablas por categoría y zona) ---------- */
// posiciones/{id}: tipo ('tabla' | 'promedios'), grupo (primera | sub20 | juveniles | infantiles | veteranos | promedios),
//                  categoria, zona, torneo, copa, criterio ('puntos' | 'promedio'), nota, orden (número), publicada (bool),
//                  clubes: [{ nombre, g, e, p, gf, gc, ajuste, clasificado, marca }]   (en promedios: { nombre, periodos: [{ pj, pts }] })
//                  periodos: ['TA 23', ...] (solo promedios), actualizado
// PJ, PTS, DG y promedio NO se guardan: se calculan al mostrar (posiciones.js).
const aPosicion = d => { const t = conId(d); t.fecha = t.actualizado?.toDate?.() ?? null; return t; };

/** Tablas en el orden del Excel. Por defecto solo las publicadas (el panel pide todas). */
export async function listarPosiciones(soloPublicadas = true) {
    const snap = await getDocs(query(collection(db, "posiciones"), orderBy("orden")));
    const lista = snap.docs.map(aPosicion);
    return soloPublicadas ? lista.filter(t => t.publicada !== false) : lista;
}
const limpiarPosicion = ({ id, fecha, avisos, hoja, incluir, ...datos }) => ({ ...datos, actualizado: serverTimestamp() });
export const guardarPosicion = (id, data) => setDoc(doc(db, "posiciones", id), limpiarPosicion(data));
/** Guarda varias tablas juntas (todas o ninguna). Cada una lleva su `id`. */
export async function guardarPosiciones(tablas) {
    const lote = writeBatch(db);
    tablas.forEach(t => lote.set(doc(db, "posiciones", t.id), limpiarPosicion(t)));
    await lote.commit();
}
export const eliminarPosicion = id => deleteDoc(doc(db, "posiciones", id));

/* ---------- ESCUCHAS EN TIEMPO REAL ----------
 * Las páginas públicas usan estas funciones en vez de listarX(): Firestore avisa apenas algo cambia
 * (una noticia nueva, una tabla actualizada…) y la página se redibuja sola, sin recargar.
 * Cada una devuelve una función para dejar de escuchar. `alError` es opcional.
 * El primer aviso llega con los datos actuales; los siguientes, solo cuando hay cambios.
 */
const escuchar = (consulta, mapear, alCambiar, alError) =>
    onSnapshot(consulta, snap => alCambiar(mapear(snap)), err => { console.error('Escucha de Firestore', err); alError?.(err); });

export const escucharClubes = (alCambiar, alError) =>
    escuchar(query(collection(db, "clubes"), orderBy("nombre")), snap => snap.docs.map(conId), alCambiar, alError);

export const escucharNoticias = (max, alCambiar, alError) =>
    escuchar(query(collection(db, "noticias"), orderBy("fechaPublicacion", "desc"), limit(max)),
        snap => snap.docs.map(aNoticia).filter(n => n.publicada !== false), alCambiar, alError);

export const escucharComunicados = (max, alCambiar, alError) =>
    escuchar(query(collection(db, "comunicados"), orderBy("fechaPublicacion", "desc"), limit(max)),
        snap => snap.docs.map(aComunicado).filter(c => c.publicado !== false), alCambiar, alError);

export const escucharGaleria = (max, alCambiar, alError) =>
    escuchar(query(collection(db, "galeria"), orderBy("fechaPublicacion", "desc"), limit(max)),
        snap => snap.docs.map(aFoto).filter(f => f.visible !== false), alCambiar, alError);

export const escucharPosiciones = (alCambiar, alError) =>
    escuchar(query(collection(db, "posiciones"), orderBy("orden")),
        snap => snap.docs.map(aPosicion).filter(t => t.publicada !== false), alCambiar, alError);

/** Documentos sueltos de config: el aviso trae los datos, o null si el documento no existe. */
const escucharDoc = (ruta, alCambiar, alError) =>
    onSnapshot(doc(db, ...ruta), snap => alCambiar(snap.exists() ? snap.data() : null), err => { console.error('Escucha de Firestore', err); alError?.(err); });
export const escucharProgramacion = (alCambiar, alError) => escucharDoc(["config", "programacion"], alCambiar, alError);
export const escucharConfigHome = (alCambiar, alError) => escucharDoc(["config", "home"], alCambiar, alError);

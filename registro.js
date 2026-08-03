// ============================================================
// REPORTE-DM.JS
// Registra una persona con descanso médico y su fotografía
//
// FIRESTORE:
// registro-dm/{DD-MM-AAAA}/turnos/{turno-X}/registros/{ID}
//
// STORAGE:
// registro-dm/{DD-MM-AAAA}/{turno-X}/{DNI}/{ID}.jpg
// ============================================================


// ============================================================
// FIREBASE
// ============================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyD_hz2Y0qajgRMPeb0L3Ky75jQJIebywJM",
    authDomain: "red-de-patas.firebaseapp.com",
    projectId: "red-de-patas",
    storageBucket: "red-de-patas.firebasestorage.app",
    messagingSenderId: "812893065625",
    appId: "1:812893065625:web:08b1c067911872edd14308",
    measurementId: "G-M1NH2DJF29"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);


// ============================================================
// ELEMENTOS HTML
// ============================================================

const formulario = document.getElementById("formReporteDM");

const fechaReporte = document.getElementById("fechaReporte");
const turnoReporte = document.getElementById("turnoReporte");

const mensajeSistema = document.getElementById("mensajeSistema");


// REPORTANTE
const buscarReportante = document.getElementById("buscarReportante");
const resultadosReportante = document.getElementById("resultadosReportante");
const btnLimpiarReportante = document.getElementById("btnLimpiarReportante");

const reportanteDni = document.getElementById("reportanteDni");
const reportanteNombre = document.getElementById("reportanteNombre");

const reportanteSeleccionado = document.getElementById(
    "reportanteSeleccionado"
);

const reportanteNombreVista = document.getElementById(
    "reportanteNombreVista"
);

const reportanteDniVista = document.getElementById(
    "reportanteDniVista"
);


// PERSONAL CON DM
const buscarPersonalDM = document.getElementById("buscarPersonalDM");
const resultadosPersonalDM = document.getElementById(
    "resultadosPersonalDM"
);

const btnLimpiarPersonalDM = document.getElementById(
    "btnLimpiarPersonalDM"
);

const personalDni = document.getElementById("personalDni");
const personalNombre = document.getElementById("personalNombre");

const personalDMSeleccionado = document.getElementById(
    "personalDMSeleccionado"
);

const personalDMNombreVista = document.getElementById(
    "personalDMNombreVista"
);

const personalDMDniVista = document.getElementById(
    "personalDMDniVista"
);


// FOTO
const fotoReporte = document.getElementById("fotoReporte");
const nombreFoto = document.getElementById("nombreFoto");

const contenedorVistaPrevia = document.getElementById(
    "contenedorVistaPrevia"
);

const imagenVistaPrevia = document.getElementById(
    "imagenVistaPrevia"
);

const btnEliminarFoto = document.getElementById(
    "btnEliminarFoto"
);


// BOTONES Y CARGA
const btnGuardarReporte = document.getElementById(
    "btnGuardarReporte"
);

const btnLimpiarFormulario = document.getElementById(
    "btnLimpiarFormulario"
);

const textoBtnGuardar = document.getElementById(
    "textoBtnGuardar"
);

const pantallaCarga = document.getElementById(
    "pantallaCarga"
);

const textoCarga = document.getElementById(
    "textoCarga"
);


// ============================================================
// ESTADO
// ============================================================

let listaPersonal = [];

let reportanteActual = null;
let personalDMActual = null;
let fotoActual = null;
let urlVistaPrevia = null;

let guardando = false;

let temporizadorReportante = null;
let temporizadorPersonalDM = null;


// ============================================================
// INICIO
// ============================================================

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {

    colocarFechaActual();
    configurarEventos();
    await cargarPersonal();

}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventos() {

    formulario.addEventListener("submit", guardarReporte);

    buscarReportante.addEventListener("input", () => {

        clearTimeout(temporizadorReportante);

        if (reportanteActual) {
            limpiarReportante(false);
        }

        temporizadorReportante = setTimeout(() => {

            buscarPersonas(
                buscarReportante.value,
                resultadosReportante,
                seleccionarReportante
            );

        }, 200);

    });


    buscarPersonalDM.addEventListener("input", () => {

        clearTimeout(temporizadorPersonalDM);

        if (personalDMActual) {
            limpiarPersonalDM(false);
        }

        temporizadorPersonalDM = setTimeout(() => {

            buscarPersonas(
                buscarPersonalDM.value,
                resultadosPersonalDM,
                seleccionarPersonalDM
            );

        }, 200);

    });


    btnLimpiarReportante.addEventListener("click", () => {
        limpiarReportante(true);
    });


    btnLimpiarPersonalDM.addEventListener("click", () => {
        limpiarPersonalDM(true);
    });


    fotoReporte.addEventListener("change", seleccionarFoto);

    btnEliminarFoto.addEventListener("click", limpiarFoto);


    btnLimpiarFormulario.addEventListener("click", () => {

        setTimeout(() => {
            limpiarFormulario();
        }, 0);

    });


    document.addEventListener("click", evento => {

        if (
            !buscarReportante.contains(evento.target) &&
            !resultadosReportante.contains(evento.target)
        ) {
            ocultarResultados(resultadosReportante);
        }

        if (
            !buscarPersonalDM.contains(evento.target) &&
            !resultadosPersonalDM.contains(evento.target)
        ) {
            ocultarResultados(resultadosPersonalDM);
        }

    });

}


// ============================================================
// CARGAR PERSONAL DESDE FIRESTORE
// ============================================================

async function cargarPersonal() {

    mostrarCarga(true, "Cargando personal...");

    try {

        const consulta = await getDocs(
            collection(db, "personal")
        );

        listaPersonal = consulta.docs.map(documento => {

            const datos = documento.data();

            return {
                id: documento.id,

                dni: String(
                    datos.dni ||
                    documento.id ||
                    ""
                ).trim(),

                nombre: String(
                    datos.apellidos_nombres ||
                    datos.nombre ||
                    ""
                ).trim(),

                area: String(
                    datos.area ||
                    ""
                ).trim(),

                funcion: String(
                    datos.funcion ||
                    ""
                ).trim()
            };

        }).filter(persona =>
            persona.dni || persona.nombre
        );

    } catch (error) {

        console.error(error);

        mostrarMensaje(
            "No se pudo cargar la colección personal.",
            "error"
        );

    } finally {

        mostrarCarga(false);

    }

}


// ============================================================
// BUSCAR PERSONAS
// ============================================================

function buscarPersonas(texto, contenedor, seleccionar) {

    const busqueda = normalizarTexto(texto);

    contenedor.innerHTML = "";

    if (busqueda.length < 2) {

        ocultarResultados(contenedor);
        return;

    }

    const palabras = busqueda.split(" ").filter(Boolean);

    const resultados = listaPersonal
        .filter(persona => {

            const contenido = normalizarTexto(
                `${persona.dni} ${persona.nombre}`
            );

            return palabras.every(palabra =>
                contenido.includes(palabra)
            );

        })
        .slice(0, 10);


    if (resultados.length === 0) {

        contenedor.innerHTML = `
            <div class="lista-resultados__vacio">
                No se encontraron coincidencias.
            </div>
        `;

        contenedor.hidden = false;
        return;

    }


    resultados.forEach(persona => {

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "resultado-persona";

        boton.innerHTML = `
            <span class="resultado-persona__icono">
                <i class="fa-solid fa-user"></i>
            </span>

            <span class="resultado-persona__datos">
                <strong>${escaparHTML(persona.nombre)}</strong>
                <span>DNI: ${escaparHTML(persona.dni)}</span>
                <small>
                    ${escaparHTML(
                        [persona.area, persona.funcion]
                            .filter(Boolean)
                            .join(" - ") || "Sin información adicional"
                    )}
                </small>
            </span>
        `;

        boton.addEventListener("click", () => {

            seleccionar(persona);
            ocultarResultados(contenedor);

        });

        contenedor.appendChild(boton);

    });

    contenedor.hidden = false;

}


// ============================================================
// SELECCIONAR REPORTANTE
// ============================================================

function seleccionarReportante(persona) {

    reportanteActual = persona;

    reportanteDni.value = persona.dni;
    reportanteNombre.value = persona.nombre;

    buscarReportante.value =
        `${persona.dni} - ${persona.nombre}`;

    buscarReportante.readOnly = true;

    reportanteNombreVista.textContent = persona.nombre;
    reportanteDniVista.textContent = `DNI: ${persona.dni}`;

    reportanteSeleccionado.hidden = false;
    btnLimpiarReportante.hidden = false;

}


// ============================================================
// SELECCIONAR PERSONAL CON DM
// ============================================================

function seleccionarPersonalDM(persona) {

    personalDMActual = persona;

    personalDni.value = persona.dni;
    personalNombre.value = persona.nombre;

    buscarPersonalDM.value =
        `${persona.dni} - ${persona.nombre}`;

    buscarPersonalDM.readOnly = true;

    personalDMNombreVista.textContent = persona.nombre;
    personalDMDniVista.textContent = `DNI: ${persona.dni}`;

    personalDMSeleccionado.hidden = false;
    btnLimpiarPersonalDM.hidden = false;

}


// ============================================================
// LIMPIAR REPORTANTE
// ============================================================

function limpiarReportante(enfocar = false) {

    reportanteActual = null;

    reportanteDni.value = "";
    reportanteNombre.value = "";

    buscarReportante.value = "";
    buscarReportante.readOnly = false;

    reportanteNombreVista.textContent = "-";
    reportanteDniVista.textContent = "DNI: -";

    reportanteSeleccionado.hidden = true;
    btnLimpiarReportante.hidden = true;

    ocultarResultados(resultadosReportante);

    if (enfocar) {
        buscarReportante.focus();
    }

}


// ============================================================
// LIMPIAR PERSONAL DM
// ============================================================

function limpiarPersonalDM(enfocar = false) {

    personalDMActual = null;

    personalDni.value = "";
    personalNombre.value = "";

    buscarPersonalDM.value = "";
    buscarPersonalDM.readOnly = false;

    personalDMNombreVista.textContent = "-";
    personalDMDniVista.textContent = "DNI: -";

    personalDMSeleccionado.hidden = true;
    btnLimpiarPersonalDM.hidden = true;

    ocultarResultados(resultadosPersonalDM);

    if (enfocar) {
        buscarPersonalDM.focus();
    }

}


// ============================================================
// FOTO
// ============================================================

function seleccionarFoto(evento) {

    const archivo = evento.target.files?.[0];

    if (!archivo) {
        return;
    }

    const formatosPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!formatosPermitidos.includes(archivo.type)) {

        mostrarMensaje(
            "Seleccione una imagen JPG, PNG o WEBP.",
            "error"
        );

        limpiarFoto();
        return;

    }

    fotoActual = archivo;

    if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
    }

    urlVistaPrevia = URL.createObjectURL(archivo);

    imagenVistaPrevia.src = urlVistaPrevia;
    nombreFoto.textContent = archivo.name;

    contenedorVistaPrevia.hidden = false;

}


function limpiarFoto() {

    if (urlVistaPrevia) {

        URL.revokeObjectURL(urlVistaPrevia);
        urlVistaPrevia = null;

    }

    fotoActual = null;
    fotoReporte.value = "";

    imagenVistaPrevia.src = "";
    nombreFoto.textContent = "JPG, PNG o WEBP";

    contenedorVistaPrevia.hidden = true;

}


// ============================================================
// GUARDAR REPORTE
// ============================================================

async function guardarReporte(evento) {

    evento.preventDefault();

    if (guardando) {
        return;
    }

    if (!fechaReporte.value) {

        mostrarMensaje(
            "Seleccione la fecha.",
            "error"
        );

        fechaReporte.focus();
        return;

    }

    if (!turnoReporte.value) {

        mostrarMensaje(
            "Seleccione el turno.",
            "error"
        );

        turnoReporte.focus();
        return;

    }

    if (!reportanteActual) {

        mostrarMensaje(
            "Seleccione al personal que realiza el reporte.",
            "error"
        );

        buscarReportante.focus();
        return;

    }

    if (!personalDMActual) {

        mostrarMensaje(
            "Seleccione al personal con descanso médico.",
            "error"
        );

        buscarPersonalDM.focus();
        return;

    }

    if (!fotoActual) {

        mostrarMensaje(
            "Seleccione la fotografía del descanso médico.",
            "error"
        );

        return;

    }


    guardando = true;
    cambiarEstadoGuardado(true);

    try {

        const fechaISO = fechaReporte.value;
        const fechaDocumento = convertirFecha(fechaISO);
        const hora = obtenerHoraActual();
        const turno = turnoReporte.value;

        const registrosRef = collection(
            db,
            "registro-dm",
            fechaDocumento,
            "turnos",
            turno,
            "registros"
        );


        // Crear el registro
        const documentoRegistro = await addDoc(
            registrosRef,
            {
                fecha: fechaDocumento,
                hora,
                turno,

                reportante: {
                    dni: reportanteActual.dni,
                    nombre: reportanteActual.nombre
                },

                registrado: {
                    dni: personalDMActual.dni,
                    nombre: personalDMActual.nombre
                },

                foto_url: ""
            }
        );


        // Subir fotografía
        const extension = obtenerExtension(fotoActual);

        const rutaFoto = [
            "registro-dm",
            fechaDocumento,
            turno,
            personalDMActual.dni,
            `${documentoRegistro.id}.${extension}`
        ].join("/");

        const referenciaFoto = ref(storage, rutaFoto);

        await uploadBytes(
            referenciaFoto,
            fotoActual,
            {
                contentType: fotoActual.type
            }
        );

        const fotoURL = await getDownloadURL(
            referenciaFoto
        );


        // Guardar únicamente la URL
        await updateDoc(
            documentoRegistro,
            {
                foto_url: fotoURL
            }
        );


        mostrarMensaje(
            "Reporte guardado correctamente.",
            "exito"
        );

        limpiarFormulario();

    } catch (error) {

        console.error("Error al guardar:", error);

        if (
            error.code === "permission-denied" ||
            error.code === "firestore/permission-denied"
        ) {

            mostrarMensaje(
                "Firestore rechazó el registro. Revise las reglas de seguridad.",
                "error"
            );

        } else if (
            error.code === "storage/unauthorized"
        ) {

            mostrarMensaje(
                "Storage rechazó la fotografía. Revise sus reglas de seguridad.",
                "error"
            );

        } else {

            mostrarMensaje(
                error.message || "No se pudo guardar el reporte.",
                "error"
            );

        }

    } finally {

        guardando = false;
        cambiarEstadoGuardado(false);

    }

}


// ============================================================
// LIMPIAR FORMULARIO
// ============================================================

function limpiarFormulario() {

    formulario.reset();

    limpiarReportante(false);
    limpiarPersonalDM(false);
    limpiarFoto();

    colocarFechaActual();

    turnoReporte.value = "";

}


// ============================================================
// FECHA Y HORA
// ============================================================

function colocarFechaActual() {

    const fecha = new Date();

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    fechaReporte.value = `${anio}-${mes}-${dia}`;

}


function convertirFecha(fechaISO) {

    const [anio, mes, dia] = fechaISO.split("-");

    return `${dia}-${mes}-${anio}`;

}


function obtenerHoraActual() {

    return new Intl.DateTimeFormat(
        "es-PE",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "America/Lima"
        }
    ).format(new Date());

}


// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function normalizarTexto(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim();

}


function obtenerExtension(archivo) {

    const extensiones = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };

    return extensiones[archivo.type] || "jpg";

}


function escaparHTML(texto) {

    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function ocultarResultados(contenedor) {

    contenedor.hidden = true;
    contenedor.innerHTML = "";

}


// ============================================================
// MENSAJES
// ============================================================

function mostrarMensaje(texto, tipo) {

    mensajeSistema.textContent = texto;

    mensajeSistema.className =
        `mensaje-sistema mensaje-sistema--${tipo}`;

    mensajeSistema.hidden = false;

    mensajeSistema.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


// ============================================================
// CARGA
// ============================================================

function mostrarCarga(mostrar, texto = "Guardando...") {

    pantallaCarga.hidden = !mostrar;
    textoCarga.textContent = texto;

}


function cambiarEstadoGuardado(estado) {

    btnGuardarReporte.disabled = estado;
    btnLimpiarFormulario.disabled = estado;

    fechaReporte.disabled = estado;
    turnoReporte.disabled = estado;
    buscarReportante.disabled = estado;
    buscarPersonalDM.disabled = estado;
    fotoReporte.disabled = estado;

    textoBtnGuardar.textContent = estado
        ? "Guardando..."
        : "Guardar reporte";

    mostrarCarga(
        estado,
        estado
            ? "Guardando reporte..."
            : ""
    );

}
// ============================================================
// REPORTE.JS
// DASHBOARD DIARIO DE DESCANSOS MÉDICOS
//
// FIRESTORE:
// registro-dm/{DD-MM-AAAA}/turnos/{turno-X}/registros/{ID}
// ============================================================


// ============================================================
// IMPORTACIONES
// ============================================================

import {
    db,
    collection,
    getDocs
} from "../backend/api.js";


// ============================================================
// CONFIGURACIÓN DE TURNOS
// ============================================================

const TURNOS = {

    "turno-1": {
        nombre: "Turno 1",
        horario: "07:00 a 15:00"
    },

    "turno-2": {
        nombre: "Turno 2",
        horario: "15:00 a 22:00"
    },

    "turno-3": {
        nombre: "Turno 3",
        horario: "22:00 a 07:00"
    }

};


// ============================================================
// ELEMENTOS HTML
// ============================================================

const filtroFecha =
    document.getElementById("filtroFecha");

const filtroTurno =
    document.getElementById("filtroTurno");

const btnBuscar =
    document.getElementById("btnBuscar");

const btnActualizar =
    document.getElementById("btnActualizar");

const mensajeSistema =
    document.getElementById("mensajeSistema");


// KPI
const kpiTotal =
    document.getElementById("kpiTotal");

const kpiTurno1 =
    document.getElementById("kpiTurno1");

const kpiTurno2 =
    document.getElementById("kpiTurno2");

const kpiTurno3 =
    document.getElementById("kpiTurno3");


// CONTADORES POR TURNO
const totalTarjetaTurno1 =
    document.getElementById("totalTarjetaTurno1");

const totalTarjetaTurno2 =
    document.getElementById("totalTarjetaTurno2");

const totalTarjetaTurno3 =
    document.getElementById("totalTarjetaTurno3");


// LISTAS POR TURNO
const listaResumenTurno1 =
    document.getElementById("listaResumenTurno1");

const listaResumenTurno2 =
    document.getElementById("listaResumenTurno2");

const listaResumenTurno3 =
    document.getElementById("listaResumenTurno3");

const textoFechaResumen =
    document.getElementById("textoFechaResumen");


// PLANTILLA
const templatePersonaResumen =
    document.getElementById("templatePersonaResumen");


// PANTALLA DE CARGA
const pantallaCarga =
    document.getElementById("pantallaCarga");

const textoCarga =
    document.getElementById("textoCarga");


// MODAL DE DETALLE
const modalDetalle =
    document.getElementById("modalDetalle");

const btnCerrarModal =
    document.getElementById("btnCerrarModal");

const detalleNombreRegistrado =
    document.getElementById("detalleNombreRegistrado");

const detalleDniRegistrado =
    document.getElementById("detalleDniRegistrado");

const detalleFecha =
    document.getElementById("detalleFecha");

const detalleHora =
    document.getElementById("detalleHora");

const detalleTurno =
    document.getElementById("detalleTurno");

const detalleReportanteNombre =
    document.getElementById("detalleReportanteNombre");

const detalleReportanteDni =
    document.getElementById("detalleReportanteDni");

const contenedorFotoDetalle =
    document.getElementById("contenedorFotoDetalle");

const detalleFoto =
    document.getElementById("detalleFoto");

const detalleSinFoto =
    document.getElementById("detalleSinFoto");


// ============================================================
// ESTADO
// ============================================================

const estado = {

    registros: [],

    registrosVisibles: [],

    cargando: false

};


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarSistema
);


async function iniciarSistema() {

    configurarEventos();

    colocarFechaActual();

    await consultarRegistros();

}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventos() {

    btnBuscar.addEventListener(
        "click",
        consultarRegistros
    );


    btnActualizar.addEventListener(
        "click",
        consultarRegistros
    );


    filtroFecha.addEventListener(
        "change",
        consultarRegistros
    );


    filtroTurno.addEventListener(
        "change",
        aplicarFiltroTurno
    );


    btnCerrarModal.addEventListener(
        "click",
        cerrarModalDetalle
    );


    modalDetalle
        .querySelectorAll("[data-cerrar-modal]")
        .forEach(elemento => {

            elemento.addEventListener(
                "click",
                cerrarModalDetalle
            );

        });


    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key === "Escape" &&
                !modalDetalle.hidden
            ) {

                cerrarModalDetalle();

            }

        }
    );

}


// ============================================================
// CONSULTAR FIRESTORE
// ============================================================

async function consultarRegistros() {

    if (estado.cargando) {
        return;
    }


    const fechaISO =
        filtroFecha.value;


    if (!fechaISO) {

        mostrarMensaje(
            "Seleccione una fecha para consultar.",
            "error"
        );

        return;

    }


    estado.cargando = true;

    activarCarga(
        true,
        "Consultando descansos médicos..."
    );

    ocultarMensaje();


    try {

        const fechaDocumento =
            convertirFechaADocumento(fechaISO);


        const consultas =
            Object.keys(TURNOS).map(
                async turno => {

                    const referencia =
                        collection(
                            db,
                            "registro-dm",
                            fechaDocumento,
                            "turnos",
                            turno,
                            "registros"
                        );


                    const resultado =
                        await getDocs(referencia);


                    return resultado.docs.map(
                        documento => {

                            return normalizarRegistro(
                                documento.id,
                                documento.data(),
                                turno,
                                fechaDocumento
                            );

                        }
                    );

                }
            );


        const resultados =
            await Promise.all(consultas);


        estado.registros =
            resultados.flat();


        ordenarRegistros(
            estado.registros
        );


        actualizarTextoFecha(
            fechaDocumento
        );


        aplicarFiltroTurno();


        if (
            estado.registros.length === 0
        ) {

            mostrarMensaje(
                "No existen descansos médicos registrados en esta fecha.",
                "advertencia"
            );

        }

    } catch (error) {

        console.error(
            "Error consultando registros:",
            error
        );


        estado.registros = [];
        estado.registrosVisibles = [];


        actualizarDashboard();


        mostrarMensaje(
            obtenerMensajeError(error),
            "error"
        );

    } finally {

        estado.cargando = false;

        activarCarga(false);

    }

}


// ============================================================
// NORMALIZAR REGISTRO
// ============================================================

function normalizarRegistro(
    id,
    datos,
    turnoRuta,
    fechaRuta
) {

    const registrado =
        datos.registrado ||
        datos.personal_con_descanso_medico ||
        datos.personalDM ||
        {};


    const reportante =
        datos.reportante ||
        datos.personal_que_reporta ||
        {};


    return {

        id,

        fecha: String(
            datos.fecha ||
            fechaRuta ||
            ""
        ).trim(),

        hora: String(
            datos.hora ||
            ""
        ).trim(),

        turno: String(
            datos.turno ||
            turnoRuta ||
            ""
        ).trim(),

        registrado: {

            dni: String(
                registrado.dni ||
                datos.registrado_dni ||
                datos.personal_dni ||
                ""
            ).trim(),

            nombre: String(
                registrado.nombre ||
                registrado.apellidos_nombres ||
                datos.registrado_nombre ||
                datos.personal_nombre ||
                ""
            ).trim()

        },

        reportante: {

            dni: String(
                reportante.dni ||
                datos.reportante_dni ||
                ""
            ).trim(),

            nombre: String(
                reportante.nombre ||
                reportante.apellidos_nombres ||
                datos.reportante_nombre ||
                ""
            ).trim()

        },

        fotoUrl: String(
            datos.foto_url ||
            datos.fotoUrl ||
            datos.imagen_url ||
            ""
        ).trim()

    };

}


// ============================================================
// FILTRAR POR TURNO
// ============================================================

function aplicarFiltroTurno() {

    const turnoSeleccionado =
        filtroTurno.value;


    if (
        turnoSeleccionado === "todos"
    ) {

        estado.registrosVisibles =
            [...estado.registros];

    } else {

        estado.registrosVisibles =
            estado.registros.filter(
                registro =>
                    registro.turno ===
                    turnoSeleccionado
            );

    }


    actualizarDashboard();

}


// ============================================================
// ACTUALIZAR DASHBOARD
// ============================================================

function actualizarDashboard() {

    actualizarIndicadores();

    actualizarListasTurnos();

}


// ============================================================
// INDICADORES
// ============================================================

function actualizarIndicadores() {

    const totalTurno1 =
        contarPorTurno(
            estado.registros,
            "turno-1"
        );

    const totalTurno2 =
        contarPorTurno(
            estado.registros,
            "turno-2"
        );

    const totalTurno3 =
        contarPorTurno(
            estado.registros,
            "turno-3"
        );


    kpiTotal.textContent =
        estado.registros.length;

    kpiTurno1.textContent =
        totalTurno1;

    kpiTurno2.textContent =
        totalTurno2;

    kpiTurno3.textContent =
        totalTurno3;


    totalTarjetaTurno1.textContent =
        totalTurno1;

    totalTarjetaTurno2.textContent =
        totalTurno2;

    totalTarjetaTurno3.textContent =
        totalTurno3;

}


// ============================================================
// ACTUALIZAR LISTAS
// ============================================================

function actualizarListasTurnos() {

    const turnoSeleccionado =
        filtroTurno.value;


    const mostrarTurno1 =
        turnoSeleccionado === "todos" ||
        turnoSeleccionado === "turno-1";

    const mostrarTurno2 =
        turnoSeleccionado === "todos" ||
        turnoSeleccionado === "turno-2";

    const mostrarTurno3 =
        turnoSeleccionado === "todos" ||
        turnoSeleccionado === "turno-3";


    const tarjetaTurno1 =
        listaResumenTurno1.closest(
            ".tarjeta-turno"
        );

    const tarjetaTurno2 =
        listaResumenTurno2.closest(
            ".tarjeta-turno"
        );

    const tarjetaTurno3 =
        listaResumenTurno3.closest(
            ".tarjeta-turno"
        );


    tarjetaTurno1.hidden =
        !mostrarTurno1;

    tarjetaTurno2.hidden =
        !mostrarTurno2;

    tarjetaTurno3.hidden =
        !mostrarTurno3;


    renderizarListaTurno(
        listaResumenTurno1,
        obtenerRegistrosTurno("turno-1")
    );

    renderizarListaTurno(
        listaResumenTurno2,
        obtenerRegistrosTurno("turno-2")
    );

    renderizarListaTurno(
        listaResumenTurno3,
        obtenerRegistrosTurno("turno-3")
    );

}


// ============================================================
// OBTENER REGISTROS DE UN TURNO
// ============================================================

function obtenerRegistrosTurno(turno) {

    return estado.registros.filter(
        registro =>
            registro.turno === turno
    );

}


// ============================================================
// RENDERIZAR PERSONAS
// ============================================================

function renderizarListaTurno(
    contenedor,
    registros
) {

    contenedor.innerHTML = "";


    if (registros.length === 0) {

        contenedor.innerHTML = `
            <div class="estado-vacio estado-vacio--pequeno">

                <i class="fa-regular fa-folder-open"></i>

                <span>
                    Sin registros
                </span>

            </div>
        `;

        return;

    }


    const fragmento =
        document.createDocumentFragment();


    registros.forEach(registro => {

        const clon =
            templatePersonaResumen.content
                .cloneNode(true);


        const boton =
            clon.querySelector(
                ".resumen-persona"
            );

        const nombre =
            clon.querySelector(
                ".resumen-persona__nombre"
            );

        const dni =
            clon.querySelector(
                ".resumen-persona__dni"
            );

        const hora =
            clon.querySelector(
                ".resumen-persona__hora"
            );


        nombre.textContent =
            registro.registrado.nombre ||
            "Personal sin nombre";


        dni.textContent =
            `DNI: ${
                registro.registrado.dni ||
                "-"
            }`;


        hora.textContent =
            formatearHora(
                registro.hora
            );


        boton.addEventListener(
            "click",
            () => abrirModalDetalle(registro)
        );


        fragmento.appendChild(clon);

    });


    contenedor.appendChild(fragmento);

}


// ============================================================
// ABRIR MODAL
// ============================================================

function abrirModalDetalle(registro) {

    detalleNombreRegistrado.textContent =
        registro.registrado.nombre ||
        "Personal sin nombre";


    detalleDniRegistrado.textContent =
        `DNI: ${
            registro.registrado.dni ||
            "-"
        }`;


    detalleFecha.textContent =
        formatearFechaDocumento(
            registro.fecha
        );


    detalleHora.textContent =
        formatearHora(
            registro.hora
        );


    detalleTurno.textContent =
        `${obtenerNombreTurno(
            registro.turno
        )} — ${obtenerHorarioTurno(
            registro.turno
        )}`;


    detalleReportanteNombre.textContent =
        registro.reportante.nombre ||
        "Sin información";


    detalleReportanteDni.textContent =
        `DNI: ${
            registro.reportante.dni ||
            "-"
        }`;


    if (registro.fotoUrl) {

        detalleFoto.src =
            registro.fotoUrl;

        detalleFoto.alt =
            `Fotografía del descanso médico de ${
                registro.registrado.nombre ||
                "personal registrado"
            }`;


        contenedorFotoDetalle.hidden =
            false;

        detalleSinFoto.hidden =
            true;

    } else {

        detalleFoto.src = "";

        contenedorFotoDetalle.hidden =
            true;

        detalleSinFoto.hidden =
            false;

    }


    modalDetalle.hidden =
        false;


    document.body.classList.add(
        "modal-abierto"
    );

}


// ============================================================
// CERRAR MODAL
// ============================================================

function cerrarModalDetalle() {

    modalDetalle.hidden =
        true;


    detalleFoto.src =
        "";


    document.body.classList.remove(
        "modal-abierto"
    );

}


// ============================================================
// FECHAS
// ============================================================

function colocarFechaActual() {

    filtroFecha.value =
        obtenerFechaPeru();

}


function obtenerFechaPeru() {

    const partes =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "America/Lima",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).formatToParts(new Date());


    const valores = {};


    partes.forEach(parte => {

        if (
            parte.type !== "literal"
        ) {

            valores[parte.type] =
                parte.value;

        }

    });


    return (
        `${valores.year}-` +
        `${valores.month}-` +
        `${valores.day}`
    );

}


function convertirFechaADocumento(
    fechaISO
) {

    const [
        anio,
        mes,
        dia
    ] = fechaISO.split("-");


    return `${dia}-${mes}-${anio}`;

}


function formatearFechaDocumento(
    fechaDocumento
) {

    const partes =
        String(fechaDocumento || "")
            .split("-");


    if (
        partes.length !== 3
    ) {

        return fechaDocumento || "-";

    }


    const [
        dia,
        mes,
        anio
    ] = partes;


    const fecha =
        new Date(
            Number(anio),
            Number(mes) - 1,
            Number(dia)
        );


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return fechaDocumento;

    }


    return new Intl.DateTimeFormat(
        "es-PE",
        {
            day:
                "2-digit",

            month:
                "long",

            year:
                "numeric"
        }
    ).format(fecha);

}


function actualizarTextoFecha(
    fechaDocumento
) {

    textoFechaResumen.textContent =
        `Registros correspondientes al ${
            formatearFechaDocumento(
                fechaDocumento
            )
        }. Pulse sobre una persona para ver el detalle.`;

}


// ============================================================
// HORA
// ============================================================

function formatearHora(hora) {

    const valor =
        String(hora || "").trim();


    if (!valor) {
        return "-";
    }


    const partes =
        valor.split(":");


    if (
        partes.length < 2
    ) {

        return valor;

    }


    const horas =
        Number(partes[0]);

    const minutos =
        Number(partes[1]);


    if (
        Number.isNaN(horas) ||
        Number.isNaN(minutos)
    ) {

        return valor;

    }


    const fecha =
        new Date();


    fecha.setHours(
        horas,
        minutos,
        0,
        0
    );


    return new Intl.DateTimeFormat(
        "es-PE",
        {
            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true
        }
    ).format(fecha);

}


// ============================================================
// TURNOS
// ============================================================

function obtenerNombreTurno(turno) {

    return (
        TURNOS[turno]?.nombre ||
        turno ||
        "Sin turno"
    );

}


function obtenerHorarioTurno(turno) {

    return (
        TURNOS[turno]?.horario ||
        "-"
    );

}


function contarPorTurno(
    registros,
    turno
) {

    return registros.filter(
        registro =>
            registro.turno === turno
    ).length;

}


// ============================================================
// ORDENAR REGISTROS
// ============================================================

function ordenarRegistros(registros) {

    const ordenTurnos = {

        "turno-1": 1,
        "turno-2": 2,
        "turno-3": 3

    };


    registros.sort((a, b) => {

        const diferenciaTurno =
            (
                ordenTurnos[a.turno] ||
                99
            ) -
            (
                ordenTurnos[b.turno] ||
                99
            );


        if (
            diferenciaTurno !== 0
        ) {

            return diferenciaTurno;

        }


        return (
            convertirHoraSegundos(
                a.hora
            ) -
            convertirHoraSegundos(
                b.hora
            )
        );

    });

}


function convertirHoraSegundos(hora) {

    const partes =
        String(hora || "")
            .split(":")
            .map(Number);


    if (
        partes.length < 2 ||
        partes.some(Number.isNaN)
    ) {

        return 0;

    }


    const [
        horas,
        minutos,
        segundos = 0
    ] = partes;


    return (
        horas * 3600 +
        minutos * 60 +
        segundos
    );

}


// ============================================================
// MENSAJES
// ============================================================

function mostrarMensaje(
    texto,
    tipo = "informacion"
) {

    mensajeSistema.textContent =
        texto;


    mensajeSistema.className =
        `mensaje-sistema mensaje-sistema--${tipo}`;


    mensajeSistema.hidden =
        false;

}


function ocultarMensaje() {

    mensajeSistema.hidden =
        true;


    mensajeSistema.textContent =
        "";

}


// ============================================================
// CARGA
// ============================================================

function activarCarga(
    mostrar,
    texto = "Cargando..."
) {

    pantallaCarga.hidden =
        !mostrar;


    textoCarga.textContent =
        texto;


    btnBuscar.disabled =
        mostrar;


    btnActualizar.disabled =
        mostrar;


    filtroFecha.disabled =
        mostrar;


    filtroTurno.disabled =
        mostrar;

}


// ============================================================
// ERRORES
// ============================================================

function obtenerMensajeError(error) {

    const codigo =
        error?.code || "";


    switch (codigo) {

        case "permission-denied":
        case "firestore/permission-denied":

            return (
                "No tiene permisos para consultar los registros. " +
                "Revise las reglas de Firestore."
            );


        case "unavailable":
        case "firestore/unavailable":

            return (
                "Firebase no está disponible. " +
                "Revise su conexión a internet."
            );


        case "failed-precondition":
        case "firestore/failed-precondition":

            return (
                "La consulta requiere una configuración adicional en Firestore."
            );


        default:

            return (
                error?.message ||
                "No se pudieron cargar los descansos médicos."
            );

    }

}
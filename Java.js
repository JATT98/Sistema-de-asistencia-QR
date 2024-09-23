// Importar dependencias
const express = require('express');
const app = express();
app.use(express.json());

// Base de datos simulada para almacenar la asistencia
let asistencias = [];

// Ruta para registrar la asistencia
app.post('/registrar-asistencia', (req, res) => {
    const qr_code = req.body.qr_code;

    // Aquí puedes decodificar el código QR y buscar en tu base de datos el estudiante
    const estudiante = buscarEstudiantePorQR(qr_code);

    if (estudiante) {
        // Registrar asistencia en la base de datos
        const nuevaAsistencia = {
            id_estudiante: estudiante.id,
            fecha: new Date(),
            estado: 'presente'
        };
        asistencias.push(nuevaAsistencia);

        res.status(200).json({ message: 'Asistencia registrada correctamente', asistencia: nuevaAsistencia });
    } else {
        res.status(404).json({ message: 'Estudiante no encontrado' });
    }
});

// Función simulada para buscar un estudiante por su código QR
function buscarEstudiantePorQR(qr_code) {
    // Simulación de búsqueda del estudiante en la base de datos
    const estudiantes = [
        { id: 1, nombre: 'Juan Pérez', qr_code: '123456' },
        { id: 2, nombre: 'Ana Gómez', qr_code: '654321' }
    ];
    return estudiantes.find(est => est.qr_code === qr_code);
}

// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});



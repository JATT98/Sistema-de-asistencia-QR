// Importar dependencias
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

app.use('/images', express.static(path.join(__dirname,'images')));

const SECRET_KEY = 'mi_clave_secreta';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Sistema_QR',
    password: '1508',
    port: 5432
});

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

app.get('/login', (request, response) => {
    fs.readFile('./login.html', 'utf8', (err, html) => {
        if (err) {
            response.status(500).send('INTERNAL SERVER ERROR');
        }
        response.send(html);
    })
} );


pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error ejecutando la consulta', err.stack);
    } else {
      console.log('Resultado de la consulta:', res.rows);
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const results = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = results.rows[0];

            // Buscar el usuario en la base de datos
        //const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log(password, user.contrasena)

        // Comparar la contraseña con bcrypt
        //const isPasswordValid = await bcrypt.compare(password, user.contrasena);  // Como no esta encriptada, aca siempre te va a tirar error
        const isPasswordValid = (password == user.contrasena);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Generar el token JWT
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
            expiresIn: '1h', // El token expira en 1 hora
        });

        // Devolver el token al cliente
        res.json({ token });
    } catch (error) {
        console.log(error);
        res.status(500).json({message: 'INTERNAL SERVER ERROR'});
    }
});

// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});



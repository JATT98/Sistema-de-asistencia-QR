const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const users = []; // Lista simulada de usuarios (en un entorno real, sería tu base de datos)

// Clave secreta para firmar los tokens JWT
const SECRET_KEY = 'mi_clave_secreta';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Sistema_QR',
    password: '1508',
    port: 5432
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = results.rows[0];

            // Buscar el usuario en la base de datos
        //const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Comparar la contraseña con bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
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
        res.status(500).json({message: 'INTERNAL SERVER ERROR'});
    }
});

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'Token no proporcionado' });
    }

    // Verificar y decodificar el token
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        // Si el token es válido, continuar con la solicitud
        req.userId = decoded.id;
        next();
    });
}

app.post('/registrar-asistencia', verificarToken, (req, res) => {
    // Lógica para registrar la asistencia
    const qr_code = req.body.qr_code;

    // Aquí se verifica el estudiante y se registra la asistencia
    res.json({ message: 'Asistencia registrada con éxito' });
});

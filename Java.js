// Importar dependencias
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const cors = require('cors');
app.use(cors());

const SECRET_KEY = process.env.SECRET_KEY;

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

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
        const results = await pool.query('SELECT * FROM adm_user WHERE email = $1', [email]);
        const user = results.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        //const isPasswordValid = await bcrypt.compare(password, user.contrasena);
        const isPasswordValid = (password == user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Generar el token JWT
        const token = jwt.sign({ user_id: user.user_id, email: user.email }, SECRET_KEY, {
            expiresIn: '2.5h',
        });

        res.json({
            token,
            userData: {
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              userId: user.user_id,
              rolId: user.rol_id,
            },
        });
    } catch (error) {
        res.status(500).json({message: 'INTERNAL SERVER ERROR'});
    }
});

app.post('/get_subjects_by_teacher', async (req, res) => {
    const { userId } = req.body;

    try {
        const results = await pool.query(`
            SELECT 
                g.description as grade_name,
                s.description as subject_name,
                g.grade_id,
                s.subject_id,
                s.section,
                s.start_time,
                s.end_time,
                s.tolerancy_in_minutes
            FROM adm_subject s
            JOIN adm_grade g ON g.grade_id = s.grade_id
            WHERE s.teacher_id = $1
        `, [userId]);

        if (results.rows.length === 0) {
            return res.status(404).json({ message: 'No se encontraron materias para este profesor' });
        }

        res.json(results.rows);
    } catch (error) {
        res.status(500).json({ message: 'INTERNAL SERVER ERROR' });
    }
});

app.post('/get_students_by_grade', async (req, res) => {
    const { userId } = req.body;

    try {
        const results = await pool.query(`
            SELECT 
                ag.grade_id,
                ag.description AS grade_description,
                s.student_id,
                s.first_name,
                s.last_name,
                s.phone,
                s.physical_id,
                s.qr_code
            FROM adm_subject AS asg
            JOIN adm_grade AS ag ON asg.grade_id = ag.grade_id
            JOIN adm_student_grade AS sg ON sg.grade_id = ag.grade_id
            JOIN adm_student AS s ON s.student_id = sg.student_id
            WHERE asg.teacher_id = $1
            GROUP BY ag.grade_id, s.student_id
            ORDER BY ag.grade_id, s.last_name, s.first_name
        `, [userId]);

        if (results.rows.length === 0) {
            return res.status(404).json({ message: 'No se encontraron estudiantes para este profesor' });
        }

        res.json(results.rows);
    } catch (error) {
        res.status(500).json({ message: 'INTERNAL SERVER ERROR' });
    }
});

app.post('/new-student', async (req, res) => {
    const { name, lastname, phone, physical } = req.body;

    try {
        const results = await pool.query(`
            INSERT INTO adm_student(first_name, last_name, phone, physical_id) 
            VALUES ($1, $2, $3, $4);
        `, [name, lastname, phone, physical]);

        res.status(200).json({ message: 'ESTUDIANTE CREADO CON ÉXITO' });
    } catch (error) {
        res.status(500).json({ message: 'INTERNAL SERVER ERROR' });
    }
});

app.post('/update-student', async (req, res) => {
    const { id, name, lastname, phone, physical } = req.body;

    try {
        const results = await pool.query(`
            UPDATE adm_student 
            SET first_name = $1, 
                last_name = $2, 
                phone = $3, 
                physical_id = $4
            WHERE student_id = $5;
        `, [name, lastname, phone, physical, id]);

        res.status(200).json({ message: 'ESTUDIANTE ACTUALIZADO CON ÉXITO' });
    } catch (error) {
        res.status(500).json({ message: 'INTERNAL SERVER ERROR' });
    }
});

app.post('/save-qr', async (req, res) => {
    const { id, qrCode } = req.body;

    try {
      const qrBuffer = Buffer.from(qrCode, 'base64');

      const results = await pool.query(`
        UPDATE adm_student
        SET qr_code = $1,
            qr_modified = NOW()
        WHERE student_id = $2
    `, [qrBuffer, id]);

  
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error guardando QR en la base de datos:', error);
      res.status(500).json({ success: false, error: 'Error guardando QR' });
    }
});
  

app.post('/attach-student', async (req, res) => {
const { student, grade } = req.body;

    try {
        const results = await pool.query(`
        INSERT INTO adm_student_grade(student_id, grade_id)	VALUES ($1, $2) `,
        [student, grade]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error asignando estudiante:', error);
        res.status(500).json({ success: false, error: 'Error asignando estudiante' });
    }
});

app.post('/all-students', async (req, res) => {    
    try {
        const results = await pool.query(`
            SELECT 
                s.student_id,
                s.first_name,
                s.last_name,
                s.phone,
                s.physical_id
            FROM adm_student s
        `, []);

        if (results.rows.length === 0) {
            return res.status(404).json({ message: 'No se encontraron estudiantes' });
        }

        res.json(results.rows);
    } catch (error) {
        res.status(500).json({ message: 'INTERNAL SERVER ERROR' });
    }
});

app.post('/all-grades', async (req, res) => {    
    try {
        const results = await pool.query(`
            SELECT 
                s.grade_id,
                s.description
            FROM adm_grade s
        `, []);

        if (results.rows.length === 0) {
            return res.status(404).json({ message: 'No se encontraron estudiantes' });
        }

        res.json(results.rows);
    } catch (error) {
        res.status(500).json({ message: 'INTERNAL SERVER ERROR' });
    }
});

app.post('/new-grade', async (req, res) => {
    const { grade } = req.body;
    
    try {
        const results = await pool.query(`
        INSERT INTO adm_grade(description)	VALUES ($1) `,
        [grade]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error creando grado:', error);
        res.status(500).json({ success: false, error: 'Error creando grado' });
    }
});

app.post('/new-subject', async (req, res) => {
    const { description, grade, section, teacher, startTime, endTime, tolerancy } = req.body;
    
    try {
        const results = await pool.query(`
        INSERT INTO adm_subject(description, grade_id, section, teacher_id, start_time, end_time, tolerancy_in_minutes)	
        VALUES ($1, $2, $3, $4, $5, $6, $7) `,
        [description, grade, section, teacher, startTime, endTime, tolerancy]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error creando materia:', error);
        res.status(500).json({ success: false, error: 'Error creando materia' });
    }
});

app.post('/update-subject', async (req, res) => {
    const { subjectId, description, section, startTime, endTime, tolerancy, grade } = req.body;
    
    try {
        const results = await pool.query(`
        UPDATE adm_subject
        SET description = $2,
            section = $3,
            start_time = $4,
            end_time = $5,
            tolerancy_in_minutes = $6,
            grade_id = $7
        WHERE subject_id = $1 `,
        [subjectId, description, section, startTime, endTime, tolerancy, grade]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error actualizando materia:', error);
        res.status(500).json({ success: false, error: 'Error actualizando materia' });
    }
});

app.post('/active-lector', async (req, res) => {
    const { subjectId, teacherId, activation } = req.body;
    
    try {
        var results = await pool.query(`
            SELECT 
                al.lector_id
            FROM adm_lector AS al
            WHERE al.teacher_id = $1 AND al.subject_id = $2 `,
        [teacherId, subjectId]);

        if (results.rows.length === 0) {
            const create = await pool.query(`
                INSERT INTO adm_lector(teacher_id, subject_id, activation_time)
                VALUES ($1, $2, $3) `,
            [teacherId, subjectId, activation]);
        }

        if (results.rows.length != 0) {
            const create = await pool.query(`
                UPDATE adm_lector
                SET activation_time = $3
                WHERE teacher_id = $1 AND subject_id = $2 `,
            [teacherId, subjectId, activation]);
        }

        results = await pool.query(`
            SELECT 
                al.lector_id
            FROM adm_lector AS al
            WHERE al.teacher_id = $1 AND al.subject_id = $2 `,
        [teacherId, subjectId]);

        res.json(results.rows);
    } catch (error) {
        console.error('Error actualizando materia:', error);
        res.status(500).json({ success: false, error: 'Error actualizando materia' });
    }
});

app.post('/registrar-asistencia', async (req, res) => {
    const { student_id, subject_id, time, status } = req.body;
    
    try {
        const results = await pool.query(`
        INSERT INTO adm_attendance(student_id, subject_id, date, "time", status)	
        VALUES ($1, $2, NOW(), $3, $4) `,
        [student_id, subject_id, time, status]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error creando asistencia:', error);
        res.status(500).json({ success: false, error: 'Error creando asistencia' });
    }
});

app.post('/reporte', async (req, res) => {
    const { teacher } = req.body;

    try {
        const results = await pool.query(`
        SELECT 
            g.grade_id,
            g.description AS grade_description,
            s.subject_id,
            s.description AS subject_description,
            s.start_time,
            s.end_time,
            st.student_id,
            st.first_name,
            st.last_name,
            st.phone,
            st.physical_id,
            COALESCE(a.status, 1107) AS attendance_status
        FROM adm_grade g
        JOIN adm_subject s ON s.grade_id = g.grade_id
        JOIN adm_student_grade sg ON sg.grade_id = g.grade_id
        JOIN adm_student st ON st.student_id = sg.student_id
        LEFT JOIN adm_attendance a ON a.student_id = st.student_id AND a.subject_id = s.subject_id AND DATE(a.date) = CURRENT_DATE
        WHERE s.teacher_id = $1
        GROUP BY g.grade_id, s.subject_id, st.student_id, a.status
        ORDER BY g.grade_id, s.subject_id, st.student_id
      `,
      [teacher]);
      
      res.json(results.rows);
    } catch (error) {
      console.error('Error al obtener el reporte de asistencia:', error);
      res.status(500).send('Error al obtener el reporte');
    }
});

// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});
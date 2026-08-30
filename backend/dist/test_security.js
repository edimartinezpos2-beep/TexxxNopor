"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const client_1 = require("@prisma/client");
const http_1 = __importDefault(require("http"));
const prisma = new client_1.PrismaClient();
const PORT = 4099;
async function runSecurityAudit() {
    console.log('\n======================================================');
    console.log('🛡️  INICIANDO SUITE DE AUDITORÍA Y PRUEBAS DE SEGURIDAD  🛡️');
    console.log('======================================================\n');
    const server = http_1.default.createServer(app_1.app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`[Seguridad] Servidor de prueba montado en http://localhost:${PORT}\n`);
    let testsPassed = 0;
    let testsTotal = 0;
    function assert(condition, testName) {
        testsTotal++;
        if (condition) {
            console.log(`  ✅ [PASS] ${testName}`);
            testsPassed++;
        }
        else {
            console.error(`  ❌ [FAIL] ${testName}`);
            throw new Error(`Prueba de seguridad fallida: ${testName}`);
        }
    }
    try {
        const timestamp = Date.now();
        const adminEmail = `sec_admin_${timestamp}@texxxnopor.com`;
        const consumerEmail = `sec_consumer_${timestamp}@texxxnopor.com`;
        const victimEmail = `sec_victim_${timestamp}@texxxnopor.com`;
        const securePass = 'ComplexPassword#2026';
        // ----------------------------------------------------
        // TEST 1: Hash de contraseñas con bcrypt en PostgreSQL
        // ----------------------------------------------------
        console.log('--- 1. Verificación de Criptografía y Hashing de Contraseñas ---');
        const regAdminRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: adminEmail,
                username: `admin_${timestamp}`,
                password: securePass,
                age: 28,
                isOver18: true,
            }),
        });
        // Asegurar rol ADMIN en base de datos para el usuario administrador del test
        const updatedAdmin = await prisma.user.update({
            where: { email: adminEmail },
            data: { role: 'ADMIN' },
        });
        const adminLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: securePass }),
        });
        const adminLoginData = await adminLoginRes.json();
        const adminToken = adminLoginData.token;
        // Buscar en BD y verificar que el passwordHash sea un hash bcrypt
        const dbAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
        assert(!!dbAdmin && dbAdmin.passwordHash.startsWith('$2b$'), 'Contraseñas encriptadas con bcrypt ($2b$ salt hash)');
        assert(dbAdmin?.passwordHash !== securePass, 'Ninguna contraseña almacenada en texto plano en la base de datos');
        assert(dbAdmin?.avatarUrl === null, 'Usuarios registrados NO tienen foto por defecto (avatarUrl es null)');
        // ----------------------------------------------------
        // TEST 2: Protección contra Inyección SQL y XSS
        // ----------------------------------------------------
        console.log('\n--- 2. Protección contra Inyección SQL y Cargas Maliciosas ---');
        const sqlInjectionEmail = "' OR '1'='1' --";
        const sqlLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sqlInjectionEmail, password: 'fake' }),
        });
        assert(sqlLoginRes.status === 401 || sqlLoginRes.status === 400, 'Inyección SQL en Login prevenida y rechazada con 401');
        const sqlSearchRes = await fetch(`http://localhost:${PORT}/api/videos?q=${encodeURIComponent("'; DROP TABLE Video; --")}`);
        const sqlSearchData = await sqlSearchRes.json();
        assert(Array.isArray(sqlSearchData.videos), 'Búsqueda resistente a inyecciones SQL mediante consultas tipadas de Prisma');
        // ----------------------------------------------------
        // TEST 3: Aislamiento RBAC (Un Espectador NO puede acceder a Admin)
        // ----------------------------------------------------
        console.log('\n--- 3. Control de Acceso Basado en Roles (RBAC) y Privilegios ---');
        const regConsumerRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: consumerEmail,
                username: `consumer_${timestamp}`,
                password: securePass,
                age: 21,
                isOver18: true,
            }),
        });
        const consumerData = await regConsumerRes.json();
        const consumerToken = consumerData.token;
        // Intentar acceder a lista de usuarios como Espectador
        const forbiddenUsersRes = await fetch(`http://localhost:${PORT}/api/admin/users`, {
            headers: { Authorization: `Bearer ${consumerToken}` },
        });
        assert(forbiddenUsersRes.status === 403, 'Espectador no tiene permisos para ver usuarios admin (403 Forbidden)');
        // Intentar crear video como Espectador
        const forbiddenUploadRes = await fetch(`http://localhost:${PORT}/api/admin/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${consumerToken}`,
            },
            body: JSON.stringify({ title: 'Hacked Video' }),
        });
        assert(forbiddenUploadRes.status === 403, 'Espectador no tiene permisos para subir videos como Admin (403 Forbidden)');
        // ----------------------------------------------------
        // TEST 4: Falsificación y Manipulación de Tokens JWT
        // ----------------------------------------------------
        console.log('\n--- 4. Integridad y Falsificación de Tokens JWT ---');
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImhhY2tlciIsImVtYWlsIjoiaGFja0B0ZXN0LmNvbSIsInJvbGUiOiJBRE1JTiJ9.fakesignature';
        const fakeTokenRes = await fetch(`http://localhost:${PORT}/api/admin/users`, {
            headers: { Authorization: `Bearer ${fakeToken}` },
        });
        assert(fakeTokenRes.status === 403 || fakeTokenRes.status === 401, 'Token JWT falsificado o con firma inválida rechazado');
        // ----------------------------------------------------
        // TEST 5: Eliminación Segura de Usuarios y Protección de Admin
        // ----------------------------------------------------
        console.log('\n--- 5. Eliminación Segura de Usuarios y Cascadas ---');
        // Registrar usuario víctima
        const regVictimRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: victimEmail,
                username: `victim_${timestamp}`,
                password: securePass,
                age: 24,
                isOver18: true,
            }),
        });
        const victimData = await regVictimRes.json();
        const victimId = victimData.user.id;
        // Intentar que un espectador elimine a la víctima
        const consumerDeleteRes = await fetch(`http://localhost:${PORT}/api/admin/users/${victimId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${consumerToken}` },
        });
        assert(consumerDeleteRes.status === 403, 'Espectador no puede eliminar a otros usuarios (403 Forbidden)');
        // Admin elimina a la víctima
        const adminDeleteVictimRes = await fetch(`http://localhost:${PORT}/api/admin/users/${victimId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert(adminDeleteVictimRes.status === 200, 'Administrador puede eliminar usuarios permanentemente de PostgreSQL');
        // Admin no puede autoeliminarse
        const adminSelfDeleteRes = await fetch(`http://localhost:${PORT}/api/admin/users/${updatedAdmin.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert(adminSelfDeleteRes.status === 400, 'Protección de seguridad: Administrador no puede auto-eliminarse');
        // ----------------------------------------------------
        // TEST 6: Edición Segura de Perfil (Actualización de Avatar)
        // ----------------------------------------------------
        console.log('\n--- 6. Edición Segura de Perfil de Usuario ---');
        const updateProfileRes = await fetch(`http://localhost:${PORT}/api/user/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${consumerToken}`,
            },
            body: JSON.stringify({
                avatarUrl: 'https://res.cloudinary.com/demo/image/upload/sample_avatar.jpg',
            }),
        });
        const updateProfileData = await updateProfileRes.json();
        assert(updateProfileData.status === 'success' &&
            updateProfileData.user.avatarUrl === 'https://res.cloudinary.com/demo/image/upload/sample_avatar.jpg', 'Usuario puede personalizar su foto de perfil de forma segura');
        console.log('\n======================================================');
        console.log(`🎉 AUDITORÍA DE SEGURIDAD FINALIZADA CON ÉXITO: ${testsPassed}/${testsTotal} TESTS APROBADOS (100%)`);
        console.log('======================================================\n');
    }
    catch (err) {
        console.error('❌ Error en prueba de seguridad:', err);
        process.exitCode = 1;
    }
    finally {
        server.close();
        await prisma.$disconnect();
    }
}
runSecurityAudit();

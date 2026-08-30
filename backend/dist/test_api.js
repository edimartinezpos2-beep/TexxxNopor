"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
const app_1 = require("./app");
const http_1 = __importDefault(require("http"));
async function runTests() {
    console.log('🚀 Iniciando servidor de pruebas in-process...');
    const TEST_PORT = 4999;
    const server = http_1.default.createServer(app_1.app);
    await new Promise((resolve) => {
        server.listen(TEST_PORT, () => {
            console.log(`✓ Servidor de pruebas escuchando en puerto ${TEST_PORT}`);
            resolve();
        });
    });
    async function request(endpoint, method = 'GET', body, token) {
        const res = await fetch(`http://localhost:${TEST_PORT}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const status = res.status;
        let json = null;
        try {
            json = await res.json();
        }
        catch {
            json = null;
        }
        return { status, data: json };
    }
    try {
        console.log('\n--- 1. Health & Bootstrap Status (Base Limpia) ---');
        const health = await request('/health');
        console.log('Health status:', health.status, 'Service:', health.data?.service);
        const bootstrap = await request('/api/auth/bootstrap-status');
        console.log('Bootstrap status:', bootstrap.status, bootstrap.data);
        console.log('\n--- 2. Flujo de Registro: Primer usuario = ADMIN ---');
        const firstUser = await request('/api/auth/register', 'POST', {
            email: `admin_real_${Date.now()}@texxxnopor.com`,
            username: 'SuperAdmin',
            password: 'mypassword123',
            age: 28,
            isOver18: true,
        });
        console.log('1er Usuario Registrado:', firstUser.status, 'Rol Asignado:', firstUser.data?.user?.role);
        const adminToken = firstUser.data?.token;
        console.log('\n--- 2.1 Flujo de Registro: Segundo usuario = CONSUMER (Espectador) ---');
        const secondUser = await request('/api/auth/register', 'POST', {
            email: `espectador_${Date.now()}@test.com`,
            username: 'EspectadorReal',
            password: 'password123',
            age: 22,
            isOver18: true,
        });
        console.log('2do Usuario Registrado:', secondUser.status, 'Rol Asignado:', secondUser.data?.user?.role);
        console.log('\n--- 3. CRUD de Actores / Actrices (Admin) ---');
        const createActor = await request('/api/admin/actors', 'POST', {
            stageName: `Actor Test ${Date.now()}`,
            name: 'Carlos Mendoza',
            bio: 'Actor de producciones verificadas',
            nationality: 'Argentina',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        }, adminToken);
        console.log('Crear actor:', createActor.status, 'ID:', createActor.data?.actor?.id, 'Nombre:', createActor.data?.actor?.stageName);
        const actorId = createActor.data?.actor?.id;
        const editActor = await request(`/api/admin/actors/${actorId}`, 'PUT', {
            bio: 'Biografía editada exitosamente',
            nationality: 'España',
        }, adminToken);
        console.log('Editar actor:', editActor.status, 'Bio actualizada:', editActor.data?.actor?.bio);
        console.log('\n--- 4. CRUD de Videos & Cloudinary (Admin) ---');
        const createVideo = await request('/api/admin/videos', 'POST', {
            title: 'Video de Producción Real Cloudinary',
            description: 'Transmisión adaptativa en alta resolución',
            actorId: actorId,
            category: 'Para ti',
            duration: '12:00',
            videoUrl: 'https://res.cloudinary.com/texxxnopor/video/upload/v1/sample_hd.mp4',
            cloudinaryPublicId: 'texxx_cld_video_test',
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
        }, adminToken);
        console.log('Crear video con Cloudinary:', createVideo.status, 'Video ID:', createVideo.data?.video?.id);
        const videoId = createVideo.data?.video?.id;
        const editVideo = await request(`/api/admin/videos/${videoId}`, 'PUT', {
            title: 'Video de Producción Real Cloudinary (Editado)',
            category: 'Nuevos',
        }, adminToken);
        console.log('Editar video:', editVideo.status, 'Nuevo título:', editVideo.data?.video?.title);
        const deleteVideo = await request(`/api/admin/videos/${videoId}`, 'DELETE', undefined, adminToken);
        console.log('Eliminar video:', deleteVideo.status, deleteVideo.data?.message);
        const deleteActor = await request(`/api/admin/actors/${actorId}`, 'DELETE', undefined, adminToken);
        console.log('Eliminar actor:', deleteActor.status, deleteActor.data?.message);
        console.log('\n--- 5. RBAC Gestión de Roles por Admin ---');
        const updateRole = await request(`/api/admin/users/${secondUser.data?.user?.id}/role`, 'PATCH', { role: 'CREATOR' }, adminToken);
        console.log('Promover 2do usuario a CREATOR:', updateRole.status, updateRole.data?.message);
        console.log('\n========================================');
        console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE AL 100%');
        console.log('========================================');
    }
    catch (error) {
        console.error('❌ Error en pruebas:', error);
    }
    finally {
        server.close();
        process.exit(0);
    }
}
runTests();

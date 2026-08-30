import { app } from './app';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const PORT = 4099;

async function runFeatureTests() {
  console.log('--- INICIANDO TEST SUITE DE ESTADÍSTICAS, ROLES Y CATEGORÍAS/TAGS ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on port ${PORT}`);

  try {
    // 1. Registrar usuario de prueba
    const testEmail = `test_stats_${Date.now()}@example.com`;
    const regRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: `user_${Date.now()}`,
        password: 'Password123!',
        age: 25,
        isOver18: true,
      }),
    });

    const regData = await regRes.json();
    const token = regData.token;
    const userId = regData.user.id;
    console.log(`✓ Usuario registrado con éxito. ID: ${userId}, Rol: ${regData.user.role}`);

    // 2. Verificar que las estadísticas inicien en 0
    const statsRes1 = await fetch(`http://localhost:${PORT}/api/user/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats1 = await statsRes1.json();
    console.log('✓ Stats iniciales (deben ser 0):', stats1);
    if (
      stats1.subscriptionsCount !== 0 ||
      stats1.likedVideosCount !== 0 ||
      stats1.historyCount !== 0 ||
      stats1.watchLaterCount !== 0
    ) {
      throw new Error(`Las estadísticas no iniciaron en 0: ${JSON.stringify(stats1)}`);
    }

    // 3. Crear un actor de prueba y elevar temporalmente rol a ADMIN para subir video
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });
    const jwt = require('jsonwebtoken');
    const adminToken = jwt.sign(
      { id: userId, email: testEmail, role: 'ADMIN' },
      'super-secret-texxxnopor-key',
      { expiresIn: '1h' }
    );

    const actor = await prisma.actor.create({
      data: {
        name: `Actor Test ${Date.now()}`,
        stageName: `Stage_${Date.now()}`,
        bio: 'Actor de pruebas',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      },
    });
    console.log(`✓ Actor creado en PostgreSQL: ${actor.stageName} (ID: ${actor.id})`);

    // 4. Crear un video con categoría y tags
    const vidRes = await fetch(`http://localhost:${PORT}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Video Amateur 4K en Pareja',
        description: 'Producción de prueba #amateur #pareja #hd',
        category: 'Amateur',
        tags: ['#amateur', '#pareja', '#4k'],
        actorId: actor.id,
      }),
    });
    const vidData = await vidRes.json();
    const videoId = vidData.video.id;
    console.log(`✓ Video creado con tags:`, vidData.video.tags, `Categoría:`, vidData.video.category);

    // 5. Seguir al actor
    const followRes = await fetch(`http://localhost:${PORT}/api/actors/${actor.id}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const followData = await followRes.json();
    console.log(`✓ Follow toggle result:`, followData);
    if (!followData.isFollowing || followData.followersCount !== 1) {
      throw new Error(`Error en follow: ${JSON.stringify(followData)}`);
    }

    // 6. Dar Like al video
    const likeRes = await fetch(`http://localhost:${PORT}/api/videos/${videoId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const likeData = await likeRes.json();
    console.log(`✓ Like toggle result:`, likeData);
    if (!likeData.isLiked || likeData.likesCount !== 1) {
      throw new Error(`Error en like: ${JSON.stringify(likeData)}`);
    }

    // 7. Guardar en Ver después (Favorito)
    const favRes = await fetch(`http://localhost:${PORT}/api/videos/${videoId}/favorite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const favData = await favRes.json();
    console.log(`✓ Favorite toggle result:`, favData);
    if (!favData.isSaved) {
      throw new Error(`Error en favorito: ${JSON.stringify(favData)}`);
    }

    // 8. Registrar en Historial de Reproducción
    const histRes = await fetch(`http://localhost:${PORT}/api/videos/${videoId}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stoppedAtSec: 45 }),
    });
    const histData = await histRes.json();
    console.log(`✓ History record result:`, histData);

    // 9. Verificar que las estadísticas se hayan actualizado a 1 en todo
    const statsRes2 = await fetch(`http://localhost:${PORT}/api/user/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats2 = await statsRes2.json();
    console.log('✓ Stats actualizadas (deben ser todas 1):', stats2);
    if (
      stats2.subscriptionsCount !== 1 ||
      stats2.likedVideosCount !== 1 ||
      stats2.historyCount !== 1 ||
      stats2.watchLaterCount !== 1
    ) {
      throw new Error(`Las estadísticas no se incrementaron a 1: ${JSON.stringify(stats2)}`);
    }

    // 10. Probar búsqueda por categoría y hashtag
    const searchCatRes = await fetch(
      `http://localhost:${PORT}/api/videos?category=Amateur`
    );
    const searchCatData = await searchCatRes.json();
    console.log(`✓ Búsqueda por categoría Amateur encontró: ${searchCatData.videos.length} videos`);
    if (searchCatData.videos.length === 0) {
      throw new Error('No se encontró el video por categoría Amateur');
    }

    const searchTagRes = await fetch(
      `http://localhost:${PORT}/api/videos?tag=pareja`
    );
    const searchTagData = await searchTagRes.json();
    console.log(`✓ Búsqueda por tag #pareja encontró: ${searchTagData.videos.length} videos`);
    if (searchTagData.videos.length === 0) {
      throw new Error('No se encontró el video por tag #pareja');
    }

    // 11. Limpiar historial
    const clearHistRes = await fetch(`http://localhost:${PORT}/api/user/history`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const clearHistData = await clearHistRes.json();
    console.log(`✓ Limpieza de historial:`, clearHistData);

    const statsRes3 = await fetch(`http://localhost:${PORT}/api/user/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stats3 = await statsRes3.json();
    console.log('✓ Stats tras limpiar historial (historyCount debe ser 0):', stats3);
    if (stats3.historyCount !== 0) {
      throw new Error('El historial no se reseteó a 0');
    }

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS DE STATS, ROLES Y CATEGORÍAS/TAGS PASARON AL 100%');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ Error en test suite:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runFeatureTests();

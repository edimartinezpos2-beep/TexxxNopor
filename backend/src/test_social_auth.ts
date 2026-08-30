import { app } from './app';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const PORT = 4099;

async function runSocialAuthTests() {
  console.log('--- INICIANDO TEST SUITE DE AUTENTICACIÓN GOOGLE & FACEBOOK CON POSTGRESQL ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on port ${PORT}`);

  try {
    const timestamp = Date.now();
    const googleTestEmail = `google.user.${timestamp}@gmail.com`;
    const fbTestEmail = `fb.user.${timestamp}@facebook.com`;

    // 1. Validar rechazo de solicitud vacía sin proveedor
    const emptyRes = await fetch(`http://localhost:${PORT}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    console.log(`✓ Solicitud sin proveedor rechazada con status: ${emptyRes.status}`);
    if (emptyRes.status !== 400) {
      throw new Error(`Se esperaba status 400 pero se obtuvo ${emptyRes.status}`);
    }

    // 2. Probar registro / login con Google
    console.log('\n--- Test 2: Autenticación con Google ---');
    const googleRes = await fetch(`http://localhost:${PORT}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'GOOGLE',
        email: googleTestEmail,
        name: 'Google Test User',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
        age: 25,
        isOver18: true,
      }),
    });

    if (!googleRes.ok) {
      const err = await googleRes.json();
      throw new Error(`Fallo autenticación Google: ${JSON.stringify(err)}`);
    }

    const googleData = await googleRes.json();
    console.log('✓ Respuesta de Google Auth:', {
      tokenLength: googleData.token?.length,
      email: googleData.user?.email,
      username: googleData.user?.username,
      role: googleData.user?.role,
      authProvider: googleData.user?.authProvider,
    });

    if (!googleData.token || googleData.user?.authProvider !== 'GOOGLE' || googleData.user?.email !== googleTestEmail) {
      throw new Error('Datos devueltos por Google Auth no coinciden');
    }

    // Verificar en la base de datos PostgreSQL
    const dbGoogleUser = await prisma.user.findUnique({
      where: { email: googleTestEmail },
    });
    if (!dbGoogleUser || dbGoogleUser.authProvider !== 'GOOGLE') {
      throw new Error('Usuario Google no fue persistido correctamente en PostgreSQL');
    }
    console.log('✓ Usuario Google verificado directamente en base de datos PostgreSQL');

    // 3. Probar registro / login con Facebook
    console.log('\n--- Test 3: Autenticación con Facebook ---');
    const fbRes = await fetch(`http://localhost:${PORT}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'FACEBOOK',
        email: fbTestEmail,
        name: 'Facebook Test User',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
        age: 28,
        isOver18: true,
      }),
    });

    if (!fbRes.ok) {
      const err = await fbRes.json();
      throw new Error(`Fallo autenticación Facebook: ${JSON.stringify(err)}`);
    }

    const fbData = await fbRes.json();
    console.log('✓ Respuesta de Facebook Auth:', {
      tokenLength: fbData.token?.length,
      email: fbData.user?.email,
      username: fbData.user?.username,
      role: fbData.user?.role,
      authProvider: fbData.user?.authProvider,
    });

    if (!fbData.token || fbData.user?.authProvider !== 'FACEBOOK' || fbData.user?.email !== fbTestEmail) {
      throw new Error('Datos devueltos por Facebook Auth no coinciden');
    }

    // Verificar en la base de datos PostgreSQL
    const dbFbUser = await prisma.user.findUnique({
      where: { email: fbTestEmail },
    });
    if (!dbFbUser || dbFbUser.authProvider !== 'FACEBOOK') {
      throw new Error('Usuario Facebook no fue persistido correctamente en PostgreSQL');
    }
    console.log('✓ Usuario Facebook verificado directamente en base de datos PostgreSQL');

    // 4. Probar inicio de sesión repetido (debe encontrar el usuario existente y retornar JWT)
    console.log('\n--- Test 4: Re-autenticación con usuario existente ---');
    const reauthRes = await fetch(`http://localhost:${PORT}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'GOOGLE',
        email: googleTestEmail,
        name: 'Google Test User Updated',
      }),
    });
    const reauthData = await reauthRes.json();
    if (!reauthData.token || reauthData.user?.id !== dbGoogleUser.id) {
      throw new Error('Re-autenticación falló al recuperar el usuario existente');
    }
    console.log('✓ Re-autenticación de usuario existente exitosa y JWT generado');

    // Limpieza
    await prisma.user.deleteMany({
      where: {
        email: { in: [googleTestEmail, fbTestEmail] },
      },
    });
    console.log('✓ Usuarios de prueba eliminados correctamente');

    console.log('\n=============================================');
    console.log('🎉 TODOS LOS TESTS DE AUTENTICACIÓN SOCIAL PASARON EXITOSAMENTE!');
    console.log('=============================================\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runSocialAuthTests().catch((err) => {
  console.error('❌ Error en tests de autenticación social:', err);
  process.exit(1);
});

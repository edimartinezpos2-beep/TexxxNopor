import { app } from './app';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const PORT = 4098;

async function runPasswordRecoveryTests() {
  console.log('--- INICIANDO TEST SUITE DE RECUPERACIÓN DE CONTRASEÑA CON CÓDIGO ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on port ${PORT}`);

  try {
    const testEmail = `forgot_test_${Date.now()}@texxxnopor.com`;
    const originalPassword = 'OldPassword123!';
    const updatedPassword = 'NewSecretPassword2026!';

    // 1. Registrar usuario
    const regRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: `user_${Date.now()}`,
        password: originalPassword,
        age: 22,
        isOver18: true,
      }),
    });

    const regData = await regRes.json();
    console.log(`✓ Usuario registrado: ${testEmail}`);

    // 2. Solicitar código de recuperación
    const forgotRes = await fetch(`http://localhost:${PORT}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    const forgotData = await forgotRes.json();
    console.log(`✓ Solicitud de código exitosa:`, forgotData);
    if (!forgotData.code || forgotData.code.length !== 6) {
      throw new Error(`El código generado no tiene 6 dígitos: ${forgotData.code}`);
    }
    const recoveryCode = forgotData.code;

    // 3. Probar código erróneo
    const invalidCodeRes = await fetch(`http://localhost:${PORT}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: '000000' }),
    });
    console.log(`✓ Verificación de código inválido rechazada con status: ${invalidCodeRes.status}`);
    if (invalidCodeRes.status === 200) {
      throw new Error('El código inválido fue aceptado por error');
    }

    // 4. Verificar código correcto
    const validCodeRes = await fetch(`http://localhost:${PORT}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: recoveryCode }),
    });
    const validCodeData = await validCodeRes.json();
    console.log(`✓ Verificación de código correcto:`, validCodeData);
    if (validCodeData.status !== 'success') {
      throw new Error('Falló la validación del código correcto');
    }

    // 5. Restablecer la contraseña usando el código
    const resetRes = await fetch(`http://localhost:${PORT}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: recoveryCode,
        newPassword: updatedPassword,
      }),
    });

    const resetData = await resetRes.json();
    console.log(`✓ Restablecimiento de contraseña:`, resetData);
    if (resetData.status !== 'success') {
      throw new Error('Falló el restablecimiento de contraseña');
    }

    // 6. Iniciar sesión con la contraseña antigua (debe fallar)
    const oldLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: originalPassword }),
    });
    console.log(`✓ Login con contraseña antigua rechazado con status: ${oldLoginRes.status}`);
    if (oldLoginRes.status === 200) {
      throw new Error('Se pudo iniciar sesión con la contraseña antigua');
    }

    // 7. Iniciar sesión con la NUEVA contraseña (debe funcionar)
    const newLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword }),
    });
    const newLoginData = await newLoginRes.json();
    console.log(`✓ Login con nueva contraseña exitoso. Token generado:`, !!newLoginData.token);
    if (!newLoginData.token) {
      throw new Error('No se pudo iniciar sesión con la nueva contraseña');
    }

    console.log('\n======================================================');
    console.log('🎉 TEST DE RECUPERACIÓN DE CONTRASEÑA PASÓ AL 100%');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ Error en test de recuperación:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPasswordRecoveryTests();

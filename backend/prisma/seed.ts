import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando datos base en PostgreSQL (texxxnopor)...');

  // 1. Actores y Actrices iniciales
  const actorLuna = await prisma.actor.upsert({
    where: { stageName: 'Luna Roja' },
    update: {},
    create: {
      name: 'Luna Sánchez',
      stageName: 'Luna Roja',
      bio: 'Actriz principal exclusiva de producciones HD y cine independiente.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
      avatarPublicId: 'texxx_cld_actor_luna',
      nationality: 'España',
      isVerified: true,
    },
  });

  const actorMarco = await prisma.actor.upsert({
    where: { stageName: 'Marco V' },
    update: {},
    create: {
      name: 'Marco Valdés',
      stageName: 'Marco V',
      bio: 'Actor y director de escenas nocturnas y colaboraciones de parejas.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop',
      avatarPublicId: 'texxx_cld_actor_marco',
      nationality: 'México',
      isVerified: true,
    },
  });

  const actorMara = await prisma.actor.upsert({
    where: { stageName: 'Mara Studio' },
    update: {},
    create: {
      name: 'Mara Novak',
      stageName: 'Mara Studio',
      bio: 'Creadora y performer especializada en producciones de autor y 4K.',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop',
      avatarPublicId: 'texxx_cld_actor_mara',
      nationality: 'Colombia',
      isVerified: true,
    },
  });

  // 2. Categorías
  const catParaTi = await prisma.category.upsert({
    where: { slug: 'para-ti' },
    update: {},
    create: { name: 'Para ti', slug: 'para-ti', description: 'Recomendaciones personalizadas' },
  });

  const catNuevos = await prisma.category.upsert({
    where: { slug: 'nuevos' },
    update: {},
    create: { name: 'Nuevos', slug: 'nuevos', description: 'Estrenos recientes' },
  });

  const catParejas = await prisma.category.upsert({
    where: { slug: 'parejas' },
    update: {},
    create: { name: 'Parejas', slug: 'parejas', description: 'Producciones en pareja' },
  });

  // 3. Videos iniciales en PostgreSQL (solo si no hay videos aún)
  const existingVideosCount = await prisma.video.count();
  if (existingVideosCount === 0) {
    await prisma.video.create({
      data: {
        id: 'v_seed_1',
        title: 'Estreno Exclusivo HD: Noche de Verano',
        description: 'Producción verificada con consentimiento y transmisión adaptativa en alta definición.',
        duration: '18:42',
        durationSeconds: 1122,
        viewsCount: BigInt(145000),
        likesCount: BigInt(12840),
        thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop',
        thumbnailPublicId: 'texxx_cld_thumb_v1',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/sp_hd/sea-turtle.mp4',
        cloudinaryPublicId: 'texxx_cld_video_v1',
        hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        actorId: actorLuna.id,
        categoryId: catParaTi.id,
      },
    });

    await prisma.video.create({
      data: {
        id: 'v_seed_2',
        title: 'Sesión Nocturna en Estudio 4K',
        description: 'Tomas cinemáticas de alta fidelidad con iluminación de neón y sonido estéreo.',
        duration: '14:15',
        durationSeconds: 855,
        viewsCount: BigInt(89300),
        likesCount: BigInt(7420),
        thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop',
        thumbnailPublicId: 'texxx_cld_thumb_v2',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/sp_hd/sea-turtle.mp4',
        cloudinaryPublicId: 'texxx_cld_video_v2',
        hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        actorId: actorMarco.id,
        categoryId: catNuevos.id,
      },
    });

    await prisma.video.create({
      data: {
        id: 'v_seed_3',
        title: 'Colaboración Artística Privada',
        description: 'Producción especial independiente con vestuario y dirección de arte.',
        duration: '22:05',
        durationSeconds: 1325,
        viewsCount: BigInt(210000),
        likesCount: BigInt(19800),
        thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop',
        thumbnailPublicId: 'texxx_cld_thumb_v3',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/sp_hd/sea-turtle.mp4',
        cloudinaryPublicId: 'texxx_cld_video_v3',
        hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        actorId: actorMara.id,
        categoryId: catParejas.id,
      },
    });
    console.log('✅ 3 Videos iniciales guardados en la tabla "Video" de PostgreSQL.');
  }

  console.log('✅ Inicialización en PostgreSQL completada con éxito.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

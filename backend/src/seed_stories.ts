import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedStories() {
  console.log('--- SEMBRANDO HISTORIAS DE 24 HORAS ---');

  const actors = await prisma.actor.findMany();
  if (actors.length === 0) {
    console.log('No hay actores disponibles en la base de datos.');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  const sampleStories = [
    {
      actorName: 'edison',
      mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop',
      mediaType: 'IMAGE',
      caption: '🔥 Preparando nuevo contenido exclusivo para ustedes. ¡No se lo pierdan!',
    },
    {
      actorName: 'edison',
      mediaUrl: 'http://192.168.20.25:4000/api/stream/video/vid_1787979246027_49ab1350-fdc7-4bd3-9ce2-82b9c89df75c.mp4',
      mediaType: 'VIDEO',
      caption: '🎬 Adelanto exclusivo detrás de cámaras (24 horas)',
    },
    {
      actorName: 'natali',
      mediaUrl: 'http://192.168.20.25:4000/uploads/images/img_1787979611171_3fd51192-b45c-40bf-9215-35987bd9c748.png',
      mediaType: 'IMAGE',
      caption: '💋 Sesión de fotos de hoy. ¿Les gusta el resultado?',
    },
    {
      actorName: 'Heidy cachonda',
      mediaUrl: 'http://192.168.20.25:4000/uploads/images/img_1787981228252_7394988d-1fa8-490d-9687-157ff6df99de.jpeg',
      mediaType: 'IMAGE',
      caption: '✨ Feliz fin de semana mis amores. Nuevo video disponible en mi perfil.',
    },
    {
      actorName: 'Heidy cachonda',
      mediaUrl: 'http://192.168.20.25:4000/api/stream/video/vid_1787981163015_1536aa17-3557-4f13-b0e7-79cf1ca2ecc8.mp4',
      mediaType: 'VIDEO',
      caption: '🔥 Teaser especial. Disponible solo por 24 horas.',
    },
    {
      actorName: 'Juan jose',
      mediaUrl: 'http://192.168.20.25:4000/uploads/images/img_1787980222629_54ddca30-7855-4601-9ba1-49d3c08aa6df.jpeg',
      mediaType: 'IMAGE',
      caption: '⚡ Grabación en marcha. Pronto nueva producción completa.',
    },
  ];

  for (const s of sampleStories) {
    const actor = actors.find(
      (a) => a.name.toLowerCase() === s.actorName.toLowerCase() || a.stageName?.toLowerCase() === s.actorName.toLowerCase()
    ) || actors[0];

    await prisma.story.create({
      data: {
        actorId: actor.id,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        expiresAt,
        createdAt: now,
      },
    });
    console.log(`✓ Historia creada para actor ${actor.name} (${s.mediaType})`);
  }

  const total = await prisma.story.count();
  console.log(`\n🎉 Total historias activas en DB: ${total}`);
}

seedStories()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

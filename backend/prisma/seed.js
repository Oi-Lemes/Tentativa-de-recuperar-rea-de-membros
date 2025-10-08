const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o processo de seeding...');

  // Deleta todos os dados existentes para garantir um começo limpo
  await prisma.progressoAula.deleteMany({});
  await prisma.aula.deleteMany({});
  await prisma.modulo.deleteMany({});
  console.log('Dados antigos de módulos e aulas deletados.');

  // Criar 6 Módulos
  for (let i = 1; i <= 6; i++) {
    const modulo = await prisma.modulo.create({
      data: {
        title: `Módulo ${i}: Começando a Jornada`,
        description: `Aprenda os conceitos fundamentais no Módulo ${i}.`,
        aulas: {
          create: [
            { title: `Aula 1 do Módulo ${i}` },
            { title: `Aula 2 do Módulo ${i}` },
            { title: `Aula 3 do Módulo ${i}` },
          ],
        },
      },
    });
    console.log(`Módulo ${i} e suas 3 aulas foram criados com sucesso.`);
  }

  console.log('Seeding concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
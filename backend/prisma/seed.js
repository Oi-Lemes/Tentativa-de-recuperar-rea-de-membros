const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Estrutura atualizada com os links das suas páginas web
const modulosData = [
  {
    title: 'Módulo 1 – Segredos das Plantas Medicinais',
    description: 'Descubra o poder das ervas, desde a identificação até o cultivo seguro.',
    aulas: [
      { title: 'Descobrindo o poder das ervas: identifique e conheça suas propriedades', contentUrl: 'https://descobrindo-o-poder-das--xrh9gpa.gamma.site/' },
      { title: 'Cultive e preserve suas próprias plantas medicinais em casa', contentUrl: 'https://seu-jardim-de-cura--dmq9aik.gamma.site/' },
      { title: 'Evite erros: segurança e precauções no uso fitoterápico', contentUrl: null }, // Sem link fornecido
    ],
  },
  {
    title: 'Módulo 2 – Tinturas Mágicas: Extraia o Poder das Ervas',
    description: 'Aprenda a criar tinturas potentes para o seu bem-estar diário.',
    aulas: [
      { title: 'Tinturas: o que são e por que transformar suas ervas', contentUrl: 'https://tinturas-a-arte-de-extra-8kot30h.gamma.site/' },
      { title: 'Passo a passo: técnicas de extração e conservação', contentUrl: null }, // Sem link fornecido
      { title: 'Receitas poderosas de tinturas para o dia a dia', contentUrl: 'https://minha-farmacia-natural-5h7ustr.gamma.site/' },
    ],
  },
  {
    title: 'Módulo 3 – Pomadas Naturais que Curam',
    description: 'Transforme ingredientes naturais em pomadas para cicatrização e relaxamento.',
    aulas: [
      { title: 'Bases e óleos secretos para pomadas caseiras', contentUrl: null }, // Sem link fornecido
      { title: 'Extraindo propriedades medicinais para aplicação direta', contentUrl: 'https://o-toque-que-cura-yh9llta.gamma.site/' },
      { title: 'Pomadas práticas: cicatrização, relaxamento e anti-inflamatório', contentUrl: null }, // Sem link fornecido
    ],
  },
  {
    title: 'Módulo 4 – Cascas de Frutas: Tesouros Desperdiçados',
    description: 'Aprenda a transformar cascas de frutas em poderosos remédios naturais.',
    aulas: [
      { title: 'Descubra quais cascas podem virar remédios naturais', contentUrl: 'https://o-tesouro-na-casca-md753ks.gamma.site/' },
      { title: 'Como secar, conservar e armazenar para uso fitoterápico', contentUrl: 'https://guia-completo-de-secagem-kl9b6o8.gamma.site/' },
      { title: 'Transforme cascas em infusões e xaropes que curam', contentUrl: null }, // Sem link fornecido
    ],
  },
  {
    title: 'Módulo 5 – Cascas de Vegetais: Poder Oculto',
    description: 'Desvende as propriedades medicinais das cascas que você joga fora.',
    aulas: [
      { title: 'Propriedades medicinais das cascas que você joga fora', contentUrl: 'https://a-farmacia-que-voce-joga-acg4bcc.gamma.site/' },
      { title: 'Técnicas de desidratação e preparo eficazes', contentUrl: 'https://a-arte-de-preservar-a-na-t9omvpg.gamma.site/' },
      { title: 'Receitas de tinturas e xaropes que potencializam a saúde', contentUrl: 'https://elixires-da-natureza-4q0ooaf.gamma.site/' },
    ],
  },
  {
    title: 'Módulo 6 – Fitoterapia Avançada: Combinações Inteligentes',
    description: 'Crie suas próprias fórmulas personalizadas para resultados máximos.',
    aulas: [
      { title: 'Como combinar ervas, frutas e vegetais para efeitos máximos', contentUrl: null }, // Sem link fornecido
      { title: 'Crie suas próprias receitas de tinturas e pomadas personalizadas', contentUrl: null }, // Sem link fornecido
      { title: 'Dosagem, preservação e cuidados para resultados duradouros', contentUrl: 'https://a-medida-da-natureza-aura6ot.gamma.site/' },
    ],
  },
];

async function main() {
  console.log('Iniciando o processo de seeding com os links das páginas web...');

  await prisma.progressoAula.deleteMany({});
  await prisma.aula.deleteMany({});
  await prisma.modulo.deleteMany({});
  console.log('Dados antigos deletados.');

  for (const moduloData of modulosData) {
    await prisma.modulo.create({
      data: {
        title: moduloData.title,
        description: moduloData.description,
        aulas: {
          create: moduloData.aulas,
        },
      },
    });
    console.log(`Módulo '${moduloData.title}' e suas aulas foram criados.`);
  }

  await prisma.modulo.create({
    data: {
      title: 'Emissão de Certificado',
      description: 'Parabéns! Emita seu certificado de conclusão.',
    },
  });
  console.log('Módulo de Emissão de Certificado criado.');

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
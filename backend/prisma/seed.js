const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Estrutura atualizada com os links iframe corretos e completos
const modulosData = [
  {
    title: 'Módulo 1 – Segredos das Plantas Medicinais',
    description: 'Descubra o poder das ervas, desde a identificação até o cultivo seguro.',
    aulas: [
      { title: 'Descobrindo o poder das ervas: identifique e conheça suas propriedades', contentUrl: 'https://descobrindo-o-poder-das--xrh9gpa.gamma.site/' },
      { title: 'Cultive e preserve suas próprias plantas medicinais em casa', contentUrl: 'https://seu-jardim-de-cura--dmq9aik.gamma.site/' },
      { title: 'Ervas em chás fitoterápicos', contentUrl: 'https://fast.wistia.net/embed/iframe/qug4mwlyn6?web_component=true&seo=true' },
    ],
  },
  {
    title: 'Módulo 2 – Tinturas Mágicas: Extraia o Poder das Ervas',
    description: 'Aprenda a criar tinturas potentes para o seu bem-estar diário.',
    aulas: [
      { title: 'Tinturas: o que são e por que transformar suas ervas', contentUrl: 'https://tinturas-a-arte-de-extra-8kot30h.gamma.site/' },
      { title: 'Passo a passo: Tintura de ervas medicinais', contentUrl: 'https://fast.wistia.net/embed/iframe/78xlx6fjop?web_component=true&seo=true' },
      { title: 'Receitas poderosas de tinturas para o dia a dia', contentUrl: 'https://minha-farmacia-natural-5h7ustr.gamma.site/' },
    ],
  },
  {
    title: 'Módulo 3 – Pomadas Naturais que Curam',
    description: 'Transforme ingredientes naturais em pomadas para cicatrização e relaxamento.',
    aulas: [
      { title: 'Fazendo óleo medicinal com ervas', contentUrl: 'https://fast.wistia.net/embed/iframe/c2g2o918i7?web_component=true&seo=true' },
      { title: 'Extraindo propriedades medicinais para aplicação direta', contentUrl: 'https://o-toque-que-cura-yh9llta.gamma.site/' },
      { title: 'Pomadas práticas: Vela de óleo medicinal', contentUrl: 'https://fast.wistia.net/embed/iframe/ye7c3ffs9p?web_component=true&seo=true' },
    ],
  },
  {
    title: 'Módulo 4 – Cascas de Frutas: Tesouros Desperdiçados',
    description: 'Aprenda a transformar cascas de frutas em poderosos remédios naturais.',
    aulas: [
      { title: 'Descubra quais cascas podem virar remédios naturais', contentUrl: 'https://o-tesouro-na-casca-md753ks.gamma.site/' },
      { title: 'Como secar, conservar e armazenar para uso fitoterápico', contentUrl: 'https://guia-completo-de-secagem-kl9b6o8.gamma.site/' },
      { title: 'Transforme cascas em infusões e xaropes que curam', contentUrl: 'https://fast.wistia.net/embed/iframe/e5n4d46exq?web_component=true&seo=true' },
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
      { title: 'Como combinar ervas: Cataplasma com erva medicinal', contentUrl: 'https://fast.wistia.net/embed/iframe/kju2fcxklc?web_component=true&seo=true' },
      { title: 'Crie suas próprias receitas: Méis de ervas medicinais', contentUrl: 'https://fast.wistia.net/embed/iframe/edzc1q22uv?web_component=true&seo=true' },
      { title: 'Dosagem, preservação e cuidados para resultados duradouros', contentUrl: 'https://a-medida-da-natureza-aura6ot.gamma.site/' },
    ],
  },
];

async function main() {
  console.log('Iniciando o processo de seeding com os links das páginas web e vídeos...');

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
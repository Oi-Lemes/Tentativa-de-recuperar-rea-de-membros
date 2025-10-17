import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Dados completos de todos os módulos e aulas do curso (SEU CONTEÚDO ORIGINAL)
const modulosData = [
    {
        nome: 'Módulo 1 – Segredos das Plantas Medicinais', // title -> nome
        description: 'Descubra o poder das ervas, desde a identificação até o cultivo seguro.',
        aulas: [
            { nome: 'Descobrindo o poder das ervas: identifique e conheça suas propriedades', videoUrl: 'https://descobrindo-o-poder-das--xrh9gpa.gamma.site/' }, // contentUrl -> videoUrl
            { nome: 'Cultive e preserve suas próprias plantas medicinais em casa', videoUrl: 'https://seu-jardim-de-cura--dmq9aik.gamma.site/' },
            { nome: 'Ervas em chás fitoterápicos', videoUrl: 'https://fast.wistia.net/embed/iframe/qug4mwlyn6?web_component=true&seo=true' },
        ],
    },
    {
        nome: 'Módulo 2 – Tinturas Mágicas: Extraia o Poder das Ervas',
        description: 'Aprenda a criar tinturas potentes para o seu bem-estar diário.',
        aulas: [
            { nome: 'Tinturas: o que são e por que transformar suas ervas', videoUrl: 'https://tinturas-a-arte-de-extra-8kot30h.gamma.site/' },
            { nome: 'Passo a passo: Tintura de ervas medicinais', videoUrl: 'https://fast.wistia.net/embed/iframe/78xlx6fjop?web_component=true&seo=true' },
            { nome: 'Receitas poderosas de tinturas para o dia a dia', videoUrl: 'https://minha-farmacia-natural-5h7ustr.gamma.site/' },
        ],
    },
    {
        nome: 'Módulo 3 – Pomadas Naturais que Curam',
        description: 'Transforme ingredientes naturais em pomadas para cicatrização e relaxamento.',
        aulas: [
            { nome: 'Fazendo óleo medicinal com ervas', videoUrl: 'https://fast.wistia.net/embed/iframe/c2g2o918i7?web_component=true&seo=true' },
            { nome: 'Extraindo propriedades medicinais para aplicação direta', videoUrl: 'https://o-toque-que-cura-yh9llta.gamma.site/' },
            { nome: 'Pomadas práticas: Vela de óleo medicinal', videoUrl: 'https://fast.wistia.net/embed/iframe/ye7c3ffs9p?web_component=true&seo=true' },
        ],
    },
    {
        nome: 'Módulo 4 – Cascas de Frutas: Tesouros Desperdiçados',
        description: 'Aprenda a transformar cascas de frutas em poderosos remédios naturais.',
        aulas: [
            { nome: 'Descubra quais cascas podem virar remédios naturais', videoUrl: 'https://o-tesouro-na-casca-md753ks.gamma.site/' },
            { nome: 'Como secar, conservar e armazenar para uso fitoterápico', videoUrl: 'https://guia-completo-de-secagem-kl9b6o8.gamma.site/' },
            { nome: 'Transforme cascas em infusões e xaropes que curam', videoUrl: 'https://fast.wistia.net/embed/iframe/e5n4d46exq?web_component=true&seo=true' },
        ],
    },
    {
        nome: 'Módulo 5 – Cascas de Vegetais: Poder Oculto',
        description: 'Desvende as propriedades medicinais das cascas que você joga fora.',
        aulas: [
            { nome: 'Propriedades medicinais das cascas que você joga fora', videoUrl: 'https://a-farmacia-que-voce-joga-acg4bcc.gamma.site/' },
            { nome: 'Técnicas de desidratação e preparo eficazes', videoUrl: 'https://a-arte-de-preservar-a-na-t9omvpg.gamma.site/' },
            { nome: 'Receitas de tinturas e xaropes que potencializam a saúde', videoUrl: 'https://elixires-da-natureza-4q0ooaf.gamma.site/' },
        ],
    },
    {
        nome: 'Módulo 6 – Fitoterapia Avançada: Combinações Inteligentes',
        description: 'Crie suas próprias fórmulas personalizadas para resultados máximos.',
        aulas: [
            { nome: 'Como combinar ervas: Cataplasma com erva medicinal', videoUrl: 'https://fast.wistia.net/embed/iframe/kju2fcxklc?web_component=true&seo=true' },
            { nome: 'Crie suas próprias receitas: Méis de ervas medicinais', videoUrl: 'https://fast.wistia.net/embed/iframe/edzc1q22uv?web_component=true&seo=true' },
            { nome: 'Dosagem, preservação e cuidados para resultados duradouros', videoUrl: 'https://a-medida-da-natureza-aura6ot.gamma.site/' },
        ],
    },
];

async function main() {
    console.log('Iniciando o processo de seeding completo (6 MÓDULOS)...');

    // 1. Limpa todas as tabelas relacionadas (FORMATO CORRIGIDO)
    console.log('Limpando o banco de dados...');
    await prisma.progresso.deleteMany({}); // Nome da tabela correta
    await prisma.magicLink.deleteMany({}); // Limpa links mágicos
    await prisma.aula.deleteMany({});
    await prisma.modulo.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'teste@saberes.com' } }); // Limpa usuário de teste
    console.log('Banco de dados limpo.');

    // 2. Cria os módulos e aulas (FORMATO CORRIGIDO)
    let moduloOrder = 1;
    for (const moduloData of modulosData) {
        let aulaOrder = 1;
        // Adiciona campos que faltavam (descricao, ordem)
        const aulasParaCriar = moduloData.aulas.map(aula => ({
            nome: aula.nome,
            descricao: `Conteúdo detalhado da aula sobre ${aula.nome}.`, // Descrição placeholder
            videoUrl: aula.videoUrl,
            ordem: aulaOrder++
        }));

        // Adiciona campos que faltavam (ordem, imagem)
        await prisma.modulo.create({
            data: {
                nome: moduloData.nome,
                description: moduloData.description,
                ordem: moduloOrder++,
                imagem: `/img/md${moduloOrder - 2}.jpg`, // Imagem padrão
                aulas: { 
                    create: aulasParaCriar 
                },
            },
        });
        console.log(`> Módulo '${moduloData.nome}' criado.`);
    }

    // 3. Cria o módulo de certificado
    await prisma.modulo.create({
        data: {
            nome: 'Emissão de Certificado', // title -> nome
            description: 'Parabéns! Conclua o curso para emitir seu certificado.',
            ordem: moduloOrder,
            imagem: '/img/md7.jpg' // Imagem padrão
        },
    });
    console.log('> Módulo de Emissão de Certificado criado.');

    // 4. Cria o usuário de teste padrão
    await prisma.user.create({
        data: {
            email: 'teste@saberes.com',
            name: 'Aluno Teste',
        }
    });
    console.log('> Usuário de teste criado: teste@saberes.com');

    console.log('\nSeeding (6 MÓDULOS) foi concluído com sucesso! ✅');
}

main()
    .catch((e) => {
        console.error('Ocorreu um erro crítico durante o processo de seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dados completos de todos os módulos e aulas do curso
const modulosData = [
    {
        nome: 'Módulo 1 – Segredos das Plantas Medicinais',
        description: 'Descubra o poder das ervas, desde a identificação até o cultivo seguro.',
        aulas: [
            { nome: 'Descobrindo o poder das ervas: identifique e conheça suas propriedades', videoUrl: 'https://player.vimeo.com/video/SEU_VIDEO_ID_1' },
            { nome: 'Cultive e preserve suas próprias plantas medicinais em casa', videoUrl: 'https://player.vimeo.com/video/SEU_VIDEO_ID_2' },
            { nome: 'Ervas em chás fitoterápicos: A arte da infusão para a saúde', videoUrl: 'https://player.vimeo.com/video/SEU_VIDEO_ID_3' },
        ],
    },
    {
        nome: 'Módulo 2 – Remédios Naturais para o Dia a Dia',
        description: 'Aprenda a criar remédios caseiros eficazes para problemas comuns.',
        aulas: [
            { nome: 'Xaropes e Infusões: Aliados da Saúde Respiratória', videoUrl: 'https://player.vimeo.com/video/SEU_VIDEO_ID_4' },
            { nome: 'Pomadas e Unguentos: Cuidado Natural para a Pele', videoUrl: 'https://player.vimeo.com/video/SEU_VIDEO_ID_5' },
            { nome: 'Compressas e Cataplasmas: Alívio para Dores e Inflamações', videoUrl: 'https://player.vimeo.com/video/SEU_VIDEO_ID_6' },
        ],
    },
    // ... (restante dos módulos)
];

async function main() {
    console.log('Iniciando o processo de seeding completo...');

    // 1. Limpa todas as tabelas relacionadas
    console.log('Limpando o banco de dados...');
    await prisma.progresso.deleteMany({});
    await prisma.aula.deleteMany({});
    await prisma.modulo.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'teste@saberes.com' } }); // Garante que o usuário de teste seja recriado
    console.log('Banco de dados limpo.');

    // 2. Cria os módulos e aulas
    let moduloOrder = 1;
    for (const moduloData of modulosData) {
        let aulaOrder = 1;
        const aulasParaCriar = moduloData.aulas.map(aula => ({
            nome: aula.nome,
            descricao: `Conteúdo detalhado da aula sobre ${aula.nome}.`,
            videoUrl: aula.videoUrl,
            ordem: aulaOrder++
        }));

        await prisma.modulo.create({
            data: {
                nome: moduloData.nome,
                description: moduloData.description,
                ordem: moduloOrder++,
                imagem: `/img/md${moduloOrder - 2}.jpg`,
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
            nome: 'Emissão de Certificado',
            description: 'Parabéns! Conclua o curso para emitir seu certificado.',
            ordem: moduloOrder,
            imagem: '/img/md7.jpg'
        },
    });
    console.log('> Módulo de Emissão de Certificado criado.');

    // --- NOVO USUÁRIO DE TESTE ADICIONADO AQUI ---
    // 4. Cria um usuário de teste padrão para facilitar o acesso
    await prisma.user.create({
        data: {
            email: 'teste@saberes.com',
            name: 'Aluno Teste',
        }
    });
    console.log('> Usuário de teste criado: teste@saberes.com');
    // --- FIM DA ADIÇÃO ---

    console.log('\nSeeding foi concluído com sucesso! ✅');
}

main()
    .catch((e) => {
        console.error('Ocorreu um erro crítico durante o processo de seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
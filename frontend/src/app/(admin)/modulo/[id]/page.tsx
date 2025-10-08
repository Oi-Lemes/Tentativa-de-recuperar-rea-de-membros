"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';

// Usamos uma estrutura de dados semelhante à do dashboard para encontrar as aulas
const modulos = [
    { 
        id: 1, 
        title: 'Módulo 1: Fundamentos da Herborista', 
        description: 'Comece a sua jornada no mundo das plantas medicinais.',
        locked: false,
        aulas: [
          { id: 101, title: 'Aula 1: O que é Herborismo e Fitoterapia?' },
          { id: 102, title: 'Aula 2: Segurança e Boas Práticas de Coleta' },
          { id: 103, title: 'Aula 3: Métodos de Extração: Chás, Infusões e Decocções' },
        ] 
      },
      { 
        id: 2, 
        title: 'Módulo 2: Ervas para a Saúde Digestiva', 
        description: 'Aprenda a usar plantas para o bem-estar do seu sistema digestivo.',
        locked: false,
        aulas: [
          { id: 201, title: 'Aula 1: Hortelã-Pimenta: Alívio para Indigestão e Gases' },
          { id: 202, title: 'Aula 2: Gengibre: O Aliado contra Náuseas' },
          { id: 203, title: 'Aula 3: Camomila: Calmante Digestivo e Anti-inflamatório' },
        ] 
      },
      { 
        id: 3, 
        title: 'Módulo 3: Cascas de Frutas Medicinais', 
        description: 'Descubra o poder terapêutico escondido nas cascas das frutas.',
        locked: false,
        aulas: [
          { id: 301, title: 'Aula 1: Casca de Romã: Antioxidante e Antisséptica' },
          { id: 302, title: 'Aula 2: Casca de Laranja: Rica em Vitamina C e Óleos Essenciais' },
          { id: 303, title: 'Aula 3: Casca de Banana: Benefícios para a Pele e Sono' },
        ] 
      },
    // Módulos bloqueados não precisam ter os dados das aulas aqui por enquanto
    { id: 4, title: 'Módulo 4: Plantas para o Sistema Nervoso', locked: true, aulas: [] },
    { id: 5, title: 'Módulo 5: Primeiros Socorros com Ervas', locked: true, aulas: [] },
    { id: 6, title: 'Módulo 6: Cosmética Natural', locked: true, aulas: [] },
];

export default function ModuloPage() {
  const params = useParams();
  const { id } = params;

  const modulo = modulos.find(m => m.id.toString() === id);
  
  if (!modulo) {
    return (
        <div>
            <h1 className="text-3xl font-bold">Módulo não encontrado</h1>
            <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 block">
              Voltar para o Dashboard
            </Link>
        </div>
    );
  }

  if (modulo.locked) {
    // ... (código para módulo bloqueado continua o mesmo)
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{modulo.title}</h1>
        <p className="text-lg text-gray-400">{modulo.description}</p>
      </header>
      <main>
        <h2 className="text-2xl font-semibold mb-4">Aulas do Módulo</h2>
        <div className="flex flex-col space-y-4">
            {modulo.aulas.map((aula, index) => (
                <div key={aula.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between hover:bg-gray-700 transition-colors">
                    <div className="flex items-center">
                        <span className="text-gray-500 font-bold text-lg mr-4">{index + 1}</span>
                        <h3 className="text-lg">{aula.title}</h3>
                    </div>
                    {/* Este link ainda não funciona, iremos criar esta página a seguir */}
                    <Link href={`#`} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700">
                        Assistir
                    </Link>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
}
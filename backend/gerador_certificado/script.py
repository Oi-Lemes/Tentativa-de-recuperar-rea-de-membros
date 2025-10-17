import sys
import json
from weasyprint import HTML
from jinja2 import Template
import base64
import os # <-- IMPORTANTE: Adicionado para manipular pastas
from pathlib import Path # <-- IMPORTANTE: Adicionado para criar a pasta

def criar_pdf_certificado(nome_aluno, nome_curso, data_conclusao, output_path):
    """
    Gera o PDF do certificado e salva-o no 'output_path' fornecido.
    """
    try:
        # ****** CORREÇÃO AQUI ******
        # Garante que a pasta de destino (ex: 'certificados') exista antes de salvar.
        output_dir = os.path.dirname(output_path)
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    
        # Passo 1: Ler o conteúdo do template HTML.
        with open('gerador_certificado/template.html', 'r', encoding='utf-8') as f:
            template_html_string = f.read()

        # Passo 2: Renderizar o template com os dados fornecidos.
        template = Template(template_html_string)
        html_renderizado = template.render(
            student_name=nome_aluno,
            course_name=nome_curso,
            completion_date=data_conclusao
        )

        # Passo 3: Gerar o PDF a partir do HTML e SALVAR no caminho
        base_url = 'gerador_certificado'
        HTML(string=html_renderizado, base_url=base_url).write_pdf(output_path)
        
        return True # Sucesso

    except Exception as e:
        # Se ocorrer um erro, imprime-o para o 'stderr' para que o Node.js o possa capturar.
        print(f"Erro no script Python: {str(e)}", file=sys.stderr)
        return False

if __name__ == '__main__':
    # O script agora espera 5 argumentos do server.js (nome, curso, data, json_base64, output_path)
    if len(sys.argv) > 5:
        
        # 1. Lê os dados de texto diretamente dos argumentos
        nome_aluno = sys.argv[1]
        nome_curso = sys.argv[2]
        data_conclusao = sys.argv[3]
        
        # 2. Lê o JSON (não é mais usado para nada, mas mantemos a ordem)
        dados_base64 = sys.argv[4]
        
        # 3. Lê o novo argumento: o caminho para salvar o arquivo
        output_path = sys.argv[5]

        # 4. Chama a função para que ela SALVE o arquivo
        sucesso = criar_pdf_certificado(nome_aluno, nome_curso, data_conclusao, output_path)
        
        if not sucesso:
            print("Erro ao gerar o PDF.", file=sys.stderr)
            sys.exit(1)
            
    else:
        # Informa o Node.js se os argumentos não vierem corretamente
        print(f"Erro: O script esperava 5 argumentos, mas recebeu {len(sys.argv) - 1}", file=sys.stderr)
        sys.exit(1)
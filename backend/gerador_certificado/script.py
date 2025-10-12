import sys
import json
from weasyprint import HTML
from jinja2 import Template
import base64

def criar_pdf_certificado(nome_aluno, nome_curso, data_conclusao):
    """
    Gera o PDF do certificado e retorna os seus bytes em bruto.
    """
    try:
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

        # Passo 3: Gerar os bytes do PDF a partir do HTML.
        # A 'base_url' indica ao WeasyPrint onde encontrar os ficheiros de imagem (img/...).
        base_url = 'gerador_certificado'
        bytes_pdf = HTML(string=html_renderizado, base_url=base_url).write_pdf()
        
        return bytes_pdf

    except Exception as e:
        # Se ocorrer um erro, imprime-o para o 'stderr' para que o Node.js o possa capturar.
        print(f"Erro no script Python: {str(e)}", file=sys.stderr)
        return None

if __name__ == '__main__':
    # O script espera um único argumento: uma string JSON codificada em Base64.
    if len(sys.argv) > 1:
        # Descodifica os dados recebidos do Node.js
        dados_base64 = sys.argv[1]
        dados_json = base64.b64decode(dados_base64).decode('utf-8')
        dados = json.loads(dados_json)
        
        nome_aluno = dados.get('student_name')
        nome_curso = dados.get('course_name')
        data_conclusao = dados.get('completion_date')

        resultado_pdf = criar_pdf_certificado(nome_aluno, nome_curso, data_conclusao)
        
        if resultado_pdf:
            # IMPORTANTE: Escreve os bytes do PDF em bruto para a saída padrão (stdout).
            # O Node.js irá ler esta saída.
            sys.stdout.buffer.write(resultado_pdf)
---
titulo: Compressor
resumo: Ferramenta interna que comprime, converte e organiza PDFs, imagens, vídeos e documentos do Office sem mandar nenhum arquivo para fora da empresa.
ordem: 2
tipo: Ferramenta interna (web e API)
periodo: '2026'
situacao: Em produção
codigo: empresa
stack: [Python, FastAPI, SQLite, pikepdf, pdfium, Pillow, ffmpeg, LibreOffice, Docker]
numeros:
  - { valor: '75%', rotulo: menos peso nos PDFs, no nível mais forte }
  - { valor: '31', rotulo: ferramentas nos menus }
  - { valor: '580+', rotulo: testes automatizados }
  - { valor: '2 h', rotulo: até os arquivos serem apagados }
capa: ../../assets/projetos/compressor/capa.webp
capaAlt: Gráfico da redução de tamanho dos PDFs nos níveis Extrema, Recomendada e Baixa, antes e depois do motor novo, e o caminho do arquivo do upload ao download.
---

## O problema

Comprimir um PDF, converter uma planilha ou juntar documentos costuma significar subir o arquivo
num site de terceiros. O Compressor faz tudo isso dentro do servidor da empresa: nada sai de lá, não
precisa de cadastro e cada resultado é apagado duas horas depois de pronto.

## O que ele faz

- **Interface web** com uma ferramenta por página: comprimir imagem, vídeo, PDF e documentos do
  Office; converter de e para PDF (Word, Excel, PowerPoint, HTML, imagens e PDF/A); juntar, dividir,
  organizar e desbloquear PDFs. A prévia das páginas usa o pdf.js embutido, sem nenhum serviço externo.
- **API** usada pelo site da empresa: antes de publicar um upload, o site manda o arquivo, que volta
  menor e sem dados pessoais. Se o Compressor falhar, o site publica o original.
- O tipo do arquivo é identificado **pelo conteúdo**, não pela extensão. Quando não dá para melhorar,
  o original volta, só sem os metadados.

## Compressão de PDF por DPI efetivo

O motor lê o conteúdo de cada página, calcula o maior tamanho em que cada imagem aparece e só reduz o
que passa do necessário para o nível escolhido. Ele trata CMYK e transparência, reduz as fontes aos
caracteres usados, unifica objetos repetidos e transforma digitalizações quase em preto e branco em
CCITT G4, conferido pixel a pixel.

Depois de gravar, as páginas são renderizadas antes e depois e comparadas por blocos: a página que
muda de cara é refeita com as imagens originais. Texto, vetores, formulários e marcações de
acessibilidade não são tocados, e PDF com assinatura digital volta intacto.

Num conjunto de 31 PDFs públicos (362 MB), a redução total no nível mais forte foi de 25% para
**75%**, com o texto extraído idêntico em 100% das páginas.

## Segurança e operação

- O processamento roda num container **sem rede**, e cada tarefa num processo próprio, com limite de
  memória, CPU, tamanho de arquivo e tempo.
- GPS, autor e aparelho saem das fotos, dos documentos e dos vídeos por padrão.
- Cancelar uma tarefa encerra o processo (inclusive o LibreOffice e o ffmpeg) e apaga os arquivos.
- A fila fica num SQLite com tentativas e sinal de vida: se o worker cair no meio de uma tarefa, ela
  volta para a fila. Sem Redis nem Celery, porque para poucas tarefas simultâneas eles não fazem falta.
- Dentro do produto só entram bibliotecas de licença permissiva.
- Os mais de 580 testes rodam dentro da mesma imagem Linux usada em produção.

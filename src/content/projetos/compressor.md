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
capaAlt: Tela inicial do Compressor, com a busca de ferramentas, os filtros por categoria e os cartões de Comprimir PDF, Juntar PDF, Dividir PDF, Comprimir imagem e Comprimir vídeo.
galeria:
  - src: ../../assets/projetos/compressor/niveis.webp
    alt: Tela do Comprimir PDF com um arquivo de 8 páginas carregado e os níveis Extrema, Recomendada e Baixa.
    legenda: Cada ferramenta segue o mesmo desenho, com os arquivos à esquerda e as opções à direita. No PDF, três níveis, e em todos o texto, os desenhos e os formulários ficam intactos.
  - src: ../../assets/projetos/compressor/resultado.webp
    alt: Resultado do Comprimir PDF, com o PDF 93% menor, de 8,6 MB para 656 KB, e os botões para baixar, apagar agora e continuar em outra ferramenta.
    legenda: O resultado mostra quanto diminuiu, deixa conferir a qualidade antes de baixar e segue para a próxima ferramenta sem baixar e subir de novo. Aqui, um PDF de teste com 8 páginas de fotos.
  - src: ../../assets/projetos/compressor/benchmark.webp
    alt: Gráfico da redução de tamanho dos PDFs nos níveis Extrema, Recomendada e Baixa, antes e depois do motor novo, e o caminho do arquivo do upload ao download.
    legenda: A redução total num conjunto de 31 PDFs públicos, antes e depois do motor novo, e o caminho de um arquivo pelo sistema.
---

## O problema

Comprimir um PDF, converter uma planilha ou juntar documentos costuma significar subir o arquivo
num site de terceiros. O Compressor faz tudo isso dentro do servidor da empresa: nada sai de lá, não
precisa de cadastro e cada resultado é apagado duas horas depois de pronto.

Ele tem duas portas de entrada: a **interface web** da equipe e uma **API** que o site da empresa
chama antes de publicar um upload. O arquivo volta menor e sem dados pessoais, e se o Compressor
falhar, o site publica o original.

## Todas as ferramentas

**Comprimir**

- **Comprimir PDF**, em três níveis (Extrema, Recomendada e Baixa), com a opção de conferir a
  qualidade antes de baixar, com o original e o comprimido sobrepostos.
- **Comprimir imagem**: JPG, PNG, WebP, HEIC, GIF, TIFF e BMP, com comparador de antes e depois.
- **Comprimir vídeo**: recodifica em MP4 (H.264 e AAC), sem esmagar vídeo em pé e sem metadados.
- **Comprimir Office**: DOCX, XLSX, PPTX (também com macros), ODT, ODS, ODP, ODG e EPUB com as
  imagens internas recomprimidas. O documento continua editável.

**Editar imagem**

- **Melhorar imagem**: nitidez e um leve realce de contraste, em três intensidades.
- **Redimensionar imagem**: largura e altura em pixels ou porcentagem, sem distorcer, com a opção de
  não aumentar as menores.
- **Recortar imagem**: por arrasto ou por números, com proporções prontas e um recorte para cada
  imagem.
- **Girar imagem**: 90° ou 180° e espelhar na horizontal ou na vertical, várias de uma vez.

**Converter para PDF**

- **JPG para PDF** e **PNG para PDF**, uma imagem por arquivo ou todas juntas, com tamanho de
  página, orientação e margem.
- **Word para PDF**: DOCX, DOC, DOCM, ODT, RTF e TXT, com o layout preservado.
- **PowerPoint para PDF**: PPTX, PPT, PPTM, PPS, PPSX e ODP, um slide por página.
- **Excel para PDF**: XLSX, XLS, XLSM, ODS e CSV, com a opção de cada aba numa página.
- **HTML para PDF**: uma página ou um .zip com página, CSS e imagens, sem buscar nada na internet.

**Converter de PDF**

- **PDF para JPG** e **PDF para PNG**: cada página vira uma imagem, ou saem as imagens que estão
  dentro do PDF.
- **PDF para Word**: DOCX editável, com parágrafos, títulos, listas, tabelas, imagens, colunas e
  links.
- **PDF para PowerPoint**: um slide por página, com o texto em caixas editáveis.
- **PDF para Excel**: as tabelas das páginas numa planilha, com os números no formato brasileiro.
- **PDF para PDF/A**: PDF/A-2b ou 3b para arquivamento (ISO 19005), sem rasterizar nada.

**Converter imagem**

- **PNG para JPG**, **JPG para PNG**, **Imagem para JPG** e **Imagem para WebP** (GIF animado vira
  WebP animado).
- **HEIC para JPG**, para as fotos do iPhone e do iPad.

**Organizar PDF**

- **Juntar PDF**: PDFs e imagens num PDF só, na ordem escolhida, com as páginas dos PDFs intactas.
- **Dividir PDF**: por intervalos, a cada N páginas, uma página por arquivo ou por tamanho em MB,
  com a grade de todas as páginas.
- **Remover páginas** e **Extrair páginas**, clicando nas miniaturas.
- **Organizar PDF**: reordena arrastando as miniaturas (com mouse, toque ou teclado), com desfazer.

**Segurança**

- **Desbloquear PDF**: tira a senha e as restrições sem recomprimir nada. Marcadores, formulários e
  anexos ficam intactos.

**Em todas elas:** busca de ferramentas com Ctrl+K, tema claro e escuro, o resultado segue para a
próxima ferramenta sem baixar e subir de novo, vários resultados saem num .zip, e o botão
"Apagar agora" tira os arquivos do servidor na hora.

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

- O tipo do arquivo é identificado **pelo conteúdo**, não pela extensão. Quando não dá para melhorar,
  o original volta, só sem os metadados.
- O processamento roda num container **sem rede**, e cada tarefa num processo próprio, com limite de
  memória, CPU, tamanho de arquivo e tempo.
- GPS, autor e aparelho saem das fotos, dos documentos e dos vídeos por padrão.
- Cancelar uma tarefa encerra o processo (inclusive o LibreOffice e o ffmpeg) e apaga os arquivos.
- A fila fica num SQLite com tentativas e sinal de vida: se o worker cair no meio de uma tarefa, ela
  volta para a fila. Sem Redis nem Celery, porque para poucas tarefas simultâneas eles não fazem falta.
- A interface é HTML, CSS e JavaScript sem build e sem CDN, com o pdf.js embutido para as prévias.
- Dentro do produto só entram bibliotecas de licença permissiva.
- Os mais de 580 testes rodam dentro da mesma imagem Linux usada em produção.

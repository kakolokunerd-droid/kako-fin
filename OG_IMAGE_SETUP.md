# Configuração da Imagem Open Graph

Para que o WhatsApp mostre uma imagem de preview ao compartilhar o link do Kako Fin, você precisa adicionar uma imagem na pasta `public` do projeto.

## Passos:

1. Crie uma pasta `public` na raiz do projeto (se não existir)

2. Adicione uma imagem chamada `og-image.png` na pasta `public`

3. A imagem deve ter as seguintes características:
   - **Tamanho recomendado**: 1200x630 pixels (proporção 1.91:1)
   - **Formato**: PNG ou JPG
   - **Tamanho máximo**: 5MB (recomendado: menos de 1MB)
   - **Conteúdo**: Uma imagem do dashboard ou logo do Kako Fin

4. A imagem será acessível em: `https://kako-fin.vercel.app/og-image.png`

## Exemplo de conteúdo da imagem:

A imagem pode conter:
- Logo do Kako Fin
- Screenshot do dashboard
- Texto: "Kako Fin - Controle suas Finanças"
- Elementos visuais que representem finanças e organização

## Nota:

Se a imagem não for adicionada, o WhatsApp ainda mostrará o preview do link, mas sem a imagem. O compartilhamento funcionará normalmente.


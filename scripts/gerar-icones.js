// Script para gerar ícones PWA usando Canvas (Node.js)
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Garantir que a pasta public existe
try {
  mkdirSync(publicDir, { recursive: true });
} catch (e) {
  // Pasta já existe
}

function criarIcone(tamanho) {
  const canvas = createCanvas(tamanho, tamanho);
  const ctx = canvas.getContext('2d');
  
  // Fundo gradiente
  const gradient = ctx.createLinearGradient(0, 0, tamanho, tamanho);
  gradient.addColorStop(0, '#4f46e5');
  gradient.addColorStop(1, '#7c3aed');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, tamanho, tamanho);
  
  // Texto "KF"
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(tamanho * 0.4)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KF', tamanho / 2, tamanho / 2);
  
  return canvas;
}

function gerarIcone(tamanho) {
  const canvas = criarIcone(tamanho);
  const buffer = canvas.toBuffer('image/png');
  const filePath = join(publicDir, `icon-${tamanho}x${tamanho}.png`);
  writeFileSync(filePath, buffer);
  console.log(`✅ Criado: icon-${tamanho}x${tamanho}.png`);
}

// Gerar os ícones essenciais
console.log('🎨 Gerando ícones PWA...\n');
gerarIcone(192);
gerarIcone(512);
console.log('\n✨ Ícones criados com sucesso na pasta public/!');


#!/usr/bin/env node
/**
 * remove-console-logs.js
 *
 * Remove todas as chamadas console.* (exceto console.error) de arquivos .ts e .js.
 *
 * REGRA DE SIDE EFFECTS:
 *   Se o argumento do console contiver uma chamada de função não-trivial
 *   (ex: processData(), fetch(), setState()), o console é COMENTADO ao invés
 *   de removido, forçando revisão manual.
 *
 * Uso:
 *   node scripts/remove-console-logs.js           → modo dry-run (só lista)
 *   node scripts/remove-console-logs.js --apply   → aplica as mudanças
 */

const fs = require('fs');
const path = require('path');

// ─── Configuração ──────────────────────────────────────────────────────────────

const APPLY = process.argv.includes('--apply');
const ROOT  = path.resolve(__dirname, '..');

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.git',
  'coverage', '__pycache__', '.expo',
]);

const CONSOLE_TARGET = /console\.(log|warn|info|debug|trace|table|dir|group|groupEnd|groupCollapsed|time|timeEnd|timeLog|count|countReset|assert|clear|profile|profileEnd)/;

/**
 * Padrão que detecta chamadas de função com potencial de side effect dentro do
 * argumento do console.  Expressões seguras (literais, acessos de propriedade,
 * template literals sem chamadas, JSON.stringify, .keys, .length, .toFixed,
 * .message, .repeat, .toString, .join) são ignoradas.
 *
 * Considera "perigoso" qualquer: identificador seguido de '(' que não seja
 * uma dessas funções utilitárias conhecidas.
 */
const SAFE_CALLS = new Set([
  'JSON.stringify', 'JSON.parse',
  'Object.keys', 'Object.values', 'Object.entries',
  'Array.from', 'Array.isArray',
  'String', 'Number', 'Boolean',
  'parseInt', 'parseFloat',
  'Math.round', 'Math.floor', 'Math.ceil',
]);

const SAFE_METHOD_PATTERN = /\.(repeat|length|keys|values|entries|toFixed|toLocaleString|toString|join|slice|split|trim|replace|message|name|stack)\s*\(/g;

function hasSideEffectCall(argStr) {
  // Remove template literal expressions ${...} que são apenas property access
  const stripped = argStr.replace(/\$\{[^}]+\}/g, '""');

  // Encontra chamadas de função: palavra seguida de '('
  const callPattern = /([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\(/g;
  let match;
  while ((match = callPattern.exec(stripped)) !== null) {
    const callee = match[1];
    // Ignora chamadas seguras conhecidas
    if (SAFE_CALLS.has(callee)) continue;
    // Ignora métodos seguros: .repeat(, .toFixed(, etc.
    const precedingChar = stripped[match.index - 1];
    if (precedingChar === '.') {
      // É um método — verifica se está na lista segura
      const methodName = callee.split('.').pop();
      const safeMethodNames = ['repeat', 'length', 'toFixed', 'toLocaleString',
        'toString', 'join', 'slice', 'split', 'trim', 'replace', 'message',
        'name', 'stack', 'keys', 'values', 'entries', 'from', 'isArray'];
      if (safeMethodNames.includes(methodName)) continue;
    }
    // Qualquer outra chamada é potencialmente perigosa
    return true;
  }
  return false;
}

// ─── Utilitários de sistema de arquivos ───────────────────────────────────────

function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, results);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Extrai o conteúdo completo de uma chamada console.xxx(...) ───────────────
// Lida com chamadas multi-linha contando parênteses.

function extractConsoleCall(source, startIndex) {
  let depth = 0;
  let i = startIndex;
  while (i < source.length) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
    i++;
  }
  return null; // parêntese não fechado (improvável)
}

// ─── Processa um arquivo ───────────────────────────────────────────────────────

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const lines    = original.split('\n');

  const changes       = []; // { line, type: 'remove'|'comment', original }
  const newLines      = [...lines];
  let   modified      = false;

  // Trabalha linha por linha para simplicidade e clareza no relatório.
  // Chamadas multi-linha: a linha de abertura é detectada e tratada.
  let i = 0;
  while (i < newLines.length) {
    const line = newLines[i];
    const match = CONSOLE_TARGET.exec(line);

    if (!match) { i++; continue; }

    // Verifica se está dentro de um comentário de linha
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) { i++; continue; }

    // Encontra o início do console.xxx na linha
    const consoleIdx = line.indexOf('console.');
    const indent     = line.slice(0, line.search(/\S/));

    // Extrai a chamada completa (pode ser multi-linha)
    const fullSource = newLines.slice(i).join('\n');
    const callStart  = fullSource.indexOf('console.');
    const callFull   = extractConsoleCall(fullSource, callStart + fullSource.slice(callStart).indexOf('('));

    if (!callFull) { i++; continue; }

    // Extrai os argumentos (conteúdo dentro dos parênteses)
    const argsStr = callFull.slice(1, -1); // remove ( e )

    // Verifica se a chamada ocupa múltiplas linhas
    const callLines = callFull.split('\n').length - 1; // linhas extras após a primeira

    if (hasSideEffectCall(argsStr)) {
      // ── MODO SEGURO: comenta a linha ───────────────────────────────────────
      changes.push({
        lineNumber: i + 1,
        type: 'comment',
        original: line,
        note: 'Possível side effect — revisão manual necessária',
      });
      newLines[i] = `${indent}// [REVISAR] ${line.trimStart()}`;
      // Se multi-linha, comenta as demais também
      for (let k = 1; k <= callLines; k++) {
        newLines[i + k] = `${indent}// ${newLines[i + k].trimStart()}`;
      }
    } else {
      // ── MODO NORMAL: remove a linha ────────────────────────────────────────
      changes.push({
        lineNumber: i + 1,
        type: 'remove',
        original: line,
      });
      newLines.splice(i, 1 + callLines);
      i--; // compensa o splice
    }

    modified = true;
    i++;
  }

  return { filePath, changes, newContent: newLines.join('\n'), modified };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const files   = walkDir(ROOT);
  const results = files.map(processFile).filter(r => r.modified);

  // ── Relatório ────────────────────────────────────────────────────────────────
  let totalRemoved  = 0;
  let totalCommented = 0;

  console.error('\n══════════════════════════════════════════════════');
  console.error(APPLY ? '  APLICANDO MUDANÇAS' : '  DRY RUN — nenhum arquivo será alterado');
  console.error('══════════════════════════════════════════════════\n');

  for (const { filePath, changes } of results) {
    const rel = path.relative(ROOT, filePath);
    const removed  = changes.filter(c => c.type === 'remove').length;
    const commented = changes.filter(c => c.type === 'comment').length;
    totalRemoved   += removed;
    totalCommented += commented;

    console.error(`📄 ${rel}`);
    for (const c of changes) {
      const icon  = c.type === 'remove' ? '🗑 ' : '⚠️ ';
      const label = c.type === 'remove' ? 'REMOVER' : 'COMENTAR';
      const note  = c.note ? ` (${c.note})` : '';
      console.error(`   ${icon} L${c.lineNumber} [${label}]${note}`);
      console.error(`      ${c.original.trim()}`);
    }
    console.error('');
  }

  console.error('──────────────────────────────────────────────────');
  console.error(`  Arquivos afetados : ${results.length}`);
  console.error(`  Linhas removidas  : ${totalRemoved}`);
  console.error(`  Linhas comentadas : ${totalCommented} (requerem revisão manual)`);
  console.error('──────────────────────────────────────────────────\n');

  if (!APPLY) {
    console.error('ℹ️  Execute com --apply para aplicar as mudanças:\n');
    console.error('   node scripts/remove-console-logs.js --apply\n');
    return;
  }

  // ── Aplica as mudanças ───────────────────────────────────────────────────────
  for (const { filePath, newContent, modified } of results) {
    if (modified) fs.writeFileSync(filePath, newContent, 'utf8');
  }
  console.error('✅ Mudanças aplicadas com sucesso.\n');
}

main();

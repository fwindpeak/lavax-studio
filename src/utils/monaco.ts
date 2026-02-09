import * as monaco from 'monaco-editor';

export function setupMonaco() {
  monaco.languages.register({ id: 'lavax' });

  monaco.languages.setMonarchTokensProvider('lavax', {
    keywords: [
      'char', 'int', 'long', 'float', 'addr', 'void', 'struct',
      'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'goto', 'sizeof'
    ],
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
        [/[{}()\[\]]/, '@brackets'],
        [/[0-9]+/, 'number'],
        [/"/, 'string', '@string'],
        [/\/\/.*$/, 'comment'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration('lavax', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
    ],
  });
}

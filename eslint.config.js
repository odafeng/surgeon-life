import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  prettier,
  {
    // 全形空白(U+3000)是中文排版的一部分,樣板字串裡要放行
    rules: { 'no-irregular-whitespace': ['error', { skipTemplates: true, skipStrings: true }] },
  },
  {
    files: [
      'src/ui.js',
      'src/view.js',
      'src/alloc-panel.js',
      'src/action-panel.js',
      'src/save.js',
      'src/collection.js',
      'src/share.js',
    ],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        // 結局卡在 canvas 上畫完再存成檔案
        Image: 'readonly',
        URL: 'readonly',
        File: 'readonly',
      },
    },
  },
];

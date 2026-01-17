'use client';

import { useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';

interface MonacoSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
}

export function MonacoSQLEditor({
  value,
  onChange,
  onExecute,
  readOnly = false,
  height = '400px',
  className,
}: MonacoSQLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Add keyboard shortcut for execute (Ctrl/Cmd + Enter)
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          onExecute?.();
        }
      );

      // Add keyboard shortcut for format (Shift + Alt + F)
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        () => {
          editor.getAction('editor.action.formatDocument')?.run();
        }
      );

      // Configure SQL language features
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = [
            // SQL Keywords
            ...['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
              'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
              'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
              'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
              'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER', 'ADD', 'COLUMN',
              'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT',
              'CONSTRAINT', 'CASCADE', 'UNION', 'ALL', 'DISTINCT', 'AS',
              'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'COALESCE',
              'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'WITH', 'RECURSIVE',
            ].map((keyword) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range,
            })),
            // Common Functions
            ...['COUNT(*)', 'SUM()', 'AVG()', 'MIN()', 'MAX()', 'COALESCE()',
              'NULLIF()', 'CAST()', 'CONVERT()', 'SUBSTRING()', 'CONCAT()',
              'LOWER()', 'UPPER()', 'TRIM()', 'LENGTH()', 'NOW()', 'CURRENT_DATE',
              'CURRENT_TIMESTAMP', 'DATE()', 'YEAR()', 'MONTH()', 'DAY()',
            ].map((func) => ({
              label: func,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: func,
              range,
            })),
          ];

          return { suggestions };
        },
      });
    },
    [onExecute]
  );

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange(value || '');
    },
    [onChange]
  );

  return (
    <div className={className}>
      <Editor
        height={height}
        language="sql"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          folding: true,
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          wordBasedSuggestions: 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
    </div>
  );
}

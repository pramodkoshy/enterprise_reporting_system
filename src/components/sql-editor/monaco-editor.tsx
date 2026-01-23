'use client';

import { useRef, useCallback, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from 'next-themes';
import type { SchemaInfo } from '@/types/api';

interface MonacoSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
  schema?: SchemaInfo | null;
}

export function MonacoSQLEditor({
  value,
  onChange,
  onExecute,
  readOnly = false,
  height = '400px',
  className,
  schema,
}: MonacoSQLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Ensure clipboard context menu items are visible
      editor.updateOptions({
        contextmenu: true,
      });

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
    },
    [onExecute]
  );

  // Update completion provider when schema changes
  useEffect(() => {
    if (!editorRef.current) return;

    const monaco = (window as any).monaco;
    if (!monaco) return;

    // Dispose existing provider if any
    const dispose = () => {
      const providers = monaco.languages.CompletionItemProvider['_providers']?.get('sql');
      if (providers) {
        providers.forEach((provider: any) => provider.dispose?.());
      }
    };

    // Register new completion provider with schema data
    const provider = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // SQL Keywords
        suggestions.push(
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
            sortText: `0_${keyword}`,
          }))
        );

        // Common Functions
        suggestions.push(
          ...['COUNT(*)', 'SUM()', 'AVG()', 'MIN()', 'MAX()', 'COALESCE()',
            'NULLIF()', 'CAST()', 'CONVERT()', 'SUBSTRING()', 'CONCAT()',
            'LOWER()', 'UPPER()', 'TRIM()', 'LENGTH()', 'NOW()', 'CURRENT_DATE',
            'CURRENT_TIMESTAMP', 'DATE()', 'YEAR()', 'MONTH()', 'DAY()',
          ].map((func) => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func,
            range,
            sortText: `1_${func}`,
          }))
        );

        // Schema-based completions
        if (schema) {
          // Add tables
          schema.tables.forEach((table) => {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              range,
              detail: 'Table',
              documentation: `Columns: ${table.columns.map(c => c.name).join(', ')}`,
              sortText: `2_${table.name}`,
            });

            // Add columns with table prefix
            table.columns.forEach((column) => {
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${column.name}`,
                range,
                detail: `Column (${table.name})`,
                documentation: `Type: ${column.type}${column.nullable ? ' | Nullable' : ' | Not null'}`,
                sortText: `3_${table.name}_${column.name}`,
              });

              // Also add column name alone
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                range,
                detail: `Column from ${table.name}`,
                documentation: `Type: ${column.type}${column.nullable ? ' | Nullable' : ' | Not null'}`,
                sortText: `3_${column.name}`,
              });
            });
          });

          // Add views
          schema.views.forEach((view) => {
            suggestions.push({
              label: view.name,
              kind: monaco.languages.CompletionItemKind.Interface,
              insertText: view.name,
              range,
              detail: 'View',
              documentation: `Columns: ${view.columns.map(c => c.name).join(', ')}`,
              sortText: `2_${view.name}`,
            });

            // Add columns from views
            view.columns.forEach((column) => {
              suggestions.push({
                label: `${view.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${view.name}.${column.name}`,
                range,
                detail: `Column (${view.name})`,
                documentation: `Type: ${column.type}`,
                sortText: `3_${view.name}_${column.name}`,
              });

              // Column name alone
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                range,
                detail: `Column from ${view.name}`,
                documentation: `Type: ${column.type}`,
                sortText: `3_${column.name}`,
              });
            });
          });
        }

        return { suggestions };
      },
    });

    return () => {
      provider.dispose();
    };
  }, [schema]);

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange(value || '');
    },
    [onChange]
  );

  return (
    <div className={className} style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <Editor
        height="100%"
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
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
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

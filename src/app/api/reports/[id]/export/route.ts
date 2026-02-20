import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import { isReadOnlyQuery } from '@/lib/sql/validator';
import type { ReportDefinition, SavedQuery, DataSource, ColumnDefinition } from '@/types/database';

// Filter types
type FilterOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'between'
  | 'is_null' | 'is_not_null'
  | 'in' | 'not_in'
  | 'before' | 'after'
  | 'is_true' | 'is_false';

type FilterLogic = 'AND' | 'OR';

interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value?: string | number | boolean | (string | number)[];
  value2?: string | number;
}

interface FilterGroup {
  id: string;
  logic: FilterLogic;
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

/**
 * Escape SQL identifier (column/table name) to prevent SQL injection
 */
function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Escape SQL value literal to prevent SQL injection
 * Uses proper escaping and validates input to prevent SQL injection
 */
function escapeLiteral(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return String(value);
  }

  // String value - escape and validate to prevent SQL injection
  const stringValue = String(value);

  // Check for SQL injection patterns: quote + semicolon + SQL keywords
  const injectionPattern = /'(;|\s+)(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b/i;
  if (injectionPattern.test(stringValue)) {
    console.error('[SECURITY] Blocked SQL injection attempt:', stringValue);
    return "''"; // Return empty string instead of the malicious value
  }

  // Check for comment markers (which could be used to hide SQL)
  if (stringValue.includes('--') || stringValue.includes('/*')) {
    console.error('[SECURITY] Blocked SQL comment marker:', stringValue);
    return "''";
  }

  // Escape single quotes by doubling them (standard SQL escaping)
  const escaped = stringValue.replace(/'/g, "''");

  return `'${escaped}'`;
}

/**
 * Convert a filter condition to SQL WHERE clause fragment
 */
function conditionToSQL(condition: FilterCondition): string {
  const field = escapeIdentifier(condition.field);

  switch (condition.operator) {
    case 'equals':
      return `${field} = ${escapeLiteral(condition.value)}`;
    case 'not_equals':
      return `${field} != ${escapeLiteral(condition.value)}`;
    case 'contains':
      return `${field} LIKE ${escapeLiteral(`%${condition.value}%`)}`;
    case 'not_contains':
      return `${field} NOT LIKE ${escapeLiteral(`%${condition.value}%`)}`;
    case 'starts_with':
      return `${field} LIKE ${escapeLiteral(`${condition.value}%`)}`;
    case 'ends_with':
      return `${field} LIKE ${escapeLiteral(`%${condition.value}`)}`;
    case 'greater_than':
      return `${field} > ${escapeLiteral(condition.value)}`;
    case 'less_than':
      return `${field} < ${escapeLiteral(condition.value)}`;
    case 'between':
      return `${field} BETWEEN ${escapeLiteral(condition.value)} AND ${escapeLiteral(condition.value2!)}`;
    case 'is_null':
      return `${field} IS NULL`;
    case 'is_not_null':
      return `${field} IS NOT NULL`;
    case 'in':
      const inValues = Array.isArray(condition.value)
        ? condition.value
        : String(condition.value).split(',').map(v => v.trim());
      return `${field} IN (${inValues.map(v => escapeLiteral(v)).join(',')})`;
    case 'not_in':
      const notInValues = Array.isArray(condition.value)
        ? condition.value
        : String(condition.value).split(',').map(v => v.trim());
      return `${field} NOT IN (${notInValues.map(v => escapeLiteral(v)).join(',')})`;
    case 'is_true':
      return `(${field} = 1 OR ${field} = '1' OR ${field} = 'true')`;
    case 'is_false':
      return `(${field} = 0 OR ${field} = '0' OR ${field} = 'false' OR ${field} IS NULL)`;
    default:
      return '1=1';
  }
}

/**
 * Convert filter group to SQL WHERE clause
 */
function filterGroupToSQL(group: FilterGroup): string {
  const conditionSQLs = group.conditions.map(c => `(${conditionToSQL(c)})`);
  const groupSQLs = (group.groups || []).map(g => `(${filterGroupToSQL(g)})`);
  const allSQLs = [...conditionSQLs, ...groupSQLs];

  if (allSQLs.length === 0) {
    return '1=1';
  }

  return allSQLs.join(` ${group.logic} `);
}

/**
 * Build complete SQL query with WHERE clause from filters
 */
function buildSQLWithFilters(baseSQL: string, filterConfig: FilterGroup | null): string {
  // Remove existing WHERE clause but preserve ORDER BY, GROUP BY, HAVING, LIMIT, OFFSET
  let cleanSQL = baseSQL.replace(/;$/, '').trim();

  if (!filterConfig || filterConfig.conditions.length === 0) {
    // Remove LIMIT and OFFSET even if no filters
    cleanSQL = cleanSQL
      .replace(/\bLIMIT\s+\d+/i, '')
      .replace(/\bOFFSET\s+\d+/i, '')
      .trim();
    return cleanSQL;
  }

  // Remove existing WHERE clause, LIMIT, OFFSET
  cleanSQL = cleanSQL
    .replace(/\bWHERE\s+.*?(?=\bLIMIT\b|\bGROUP BY\b|\bORDER BY\b|\bHAVING\b|$)/i, '')
    .replace(/\bLIMIT\s+\d+/i, '')
    .replace(/\bOFFSET\s+\d+/i, '')
    .trim();

  // Convert filter group to SQL
  const whereSQL = filterGroupToSQL(filterConfig);

  // Extract ORDER BY, GROUP BY, HAVING clauses if present (in the correct order)
  const orderByMatch = cleanSQL.match(/\bORDER BY\s+[^;]+$/i);
  const havingMatch = cleanSQL.match(/\bHAVING\s+[^;]+?(?=\bORDER BY\b|$)/i);
  const groupByMatch = cleanSQL.match(/\bGROUP BY\s+[^;]+?(?=\bORDER BY\b|\bHAVING\b|$)/i);

  // Remove these clauses from the base SQL
  const baseQuery = cleanSQL
    .replace(/\bORDER BY\s+[^;]+$/i, '')
    .replace(/\bHAVING\s+[^;]+?(?=\bORDER BY\b|$)/i, '')
    .replace(/\bGROUP BY\s+[^;]+?(?=\bORDER BY\b|\bHAVING\b|$)/i, '')
    .trim();

  // Rebuild the query with WHERE in the correct position (before GROUP BY)
  // SQL order: SELECT -> FROM -> WHERE -> GROUP BY -> HAVING -> ORDER BY
  let finalSQL = baseQuery;
  finalSQL += ` WHERE ${whereSQL}`;

  if (groupByMatch) {
    finalSQL += ` ${groupByMatch[0]}`;
  }

  if (havingMatch) {
    finalSQL += ` ${havingMatch[0]}`;
  }

  if (orderByMatch) {
    finalSQL += ` ${orderByMatch[0]}`;
  }

  return finalSQL;
}

/**
 * Apply a single filter condition to a row (fallback for client-side)
 */
function applyCondition(row: Record<string, unknown>, condition: FilterCondition): boolean {
  const value = row[condition.field];

  switch (condition.operator) {
    case 'equals':
      return value == condition.value;
    case 'not_equals':
      return value != condition.value;
    case 'contains':
      return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'not_contains':
      return !String(value).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'starts_with':
      return String(value).toLowerCase().startsWith(String(condition.value).toLowerCase());
    case 'ends_with':
      return String(value).toLowerCase().endsWith(String(condition.value).toLowerCase());
    case 'greater_than':
      return Number(value) > Number(condition.value);
    case 'less_than':
      return Number(value) < Number(condition.value);
    case 'between':
      return Number(value) >= Number(condition.value) && Number(value) <= Number(condition.value2!);
    case 'is_null':
      return value === null || value === undefined;
    case 'is_not_null':
      return value !== null && value !== undefined;
    case 'in':
      const inValues = Array.isArray(condition.value) ? condition.value : String(condition.value).split(',').map(v => v.trim());
      return inValues.includes(String(value));
    case 'not_in':
      const notInValues = Array.isArray(condition.value) ? condition.value : String(condition.value).split(',').map(v => v.trim());
      return !notInValues.includes(String(value));
    case 'is_true':
      return value === true || value === 1 || value === '1' || value === 'true';
    case 'is_false':
      return value === false || value === 0 || value === '0' || value === 'false';
    default:
      return true;
  }
}

/**
 * Recursively apply filter group to rows
 */
function applyFilterGroup(row: Record<string, unknown>, group: FilterGroup): boolean {
  const conditionResults = group.conditions.map(condition => applyCondition(row, condition));
  const groupResults = (group.groups || []).map(g => applyFilterGroup(row, g));
  const allResults = [...conditionResults, ...groupResults];

  if (group.logic === 'AND') {
    return allResults.every(result => result === true);
  } else {
    return allResults.some(result => result === true);
  }
}

/**
 * Apply filter configuration to rows
 */
function applyFilters(rows: Record<string, unknown>[], filterConfig: FilterGroup | null): Record<string, unknown>[] {
  if (!filterConfig || filterConfig.conditions.length === 0) {
    return rows;
  }
  return rows.filter(row => applyFilterGroup(row, filterConfig));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { format = 'csv' } = body;

    const db = getDb();

    // Fetch report definition
    const report = await db<ReportDefinition>('report_definitions').where('id', id).first();

    if (!report) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } },
        { status: 404 }
      );
    }

    // Check if export format is enabled (default to all enabled if not configured)
    let exportFormats = { csv: true, excel: true, pdf: true };
    if (report.export_formats) {
      try {
        const parsedFormats = JSON.parse(report.export_formats);
        exportFormats = { ...exportFormats, ...parsedFormats };
      } catch (error) {
        console.error('Error parsing export formats:', error);
      }
    }

    if (!exportFormats[format as keyof typeof exportFormats]) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: `${format.toUpperCase()} export is not enabled for this report` } },
        { status: 403 }
      );
    }

    // Check if report has an associated query
    if (!report.saved_query_id) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_QUERY', message: 'Report has no associated query' } },
        { status: 400 }
      );
    }

    // Fetch the saved query
    const query = await db<SavedQuery>('saved_queries')
      .where('id', report.saved_query_id)
      .first();

    if (!query) {
      return NextResponse.json(
        { success: false, error: { code: 'QUERY_NOT_FOUND', message: 'Associated query not found' } },
        { status: 404 }
      );
    }

    // Get data source
    const dataSource = await db<DataSource>('data_sources')
      .where('id', query.data_source_id)
      .where('is_active', true)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'DATASOURCE_NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Validate that it's a read-only query
    if (!isReadOnlyQuery(query.sql_content)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_QUERY', message: 'Report query must be a SELECT query' } },
        { status: 400 }
      );
    }

    // Get connection
    const connection = await getConnection(dataSource);

    // Parse filter configuration
    let filterConfig: FilterGroup | null = null;
    if (report.filter_config) {
      try {
        filterConfig = JSON.parse(report.filter_config);
      } catch (error) {
        console.error('Error parsing filter config:', error);
      }
    }

    // Build SQL with WHERE clause from filters
    const sqlWithFilters = buildSQLWithFilters(query.sql_content, filterConfig);

    // Execute the query with filters applied (no pagination for export)
    const maxExportRows = parseInt(process.env.EXPORT_PAGE_SIZE || '1000');
    const result = await connection.raw(`${sqlWithFilters} LIMIT ${maxExportRows}`);

    // Extract rows
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result.rows) {
      rows = result.rows;
    } else if (result[0]) {
      rows = Array.isArray(result[0]) ? result[0] : [result[0]];
    }

    // Parse column config to get visible columns and headers
    let columnConfig: ColumnDefinition[] = [];
    if (report.column_config) {
      try {
        columnConfig = JSON.parse(report.column_config);
      } catch (error) {
        console.error('Error parsing column config:', error);
      }
    }

    // Filter columns based on column config
    let filteredRows = rows;
    let headers: string[] = [];

    if (columnConfig.length > 0) {
      const visibleColumns = columnConfig.filter((col) => col.visible);
      headers = visibleColumns.map((col) => col.header);

      filteredRows = rows.map((row) => {
        const filteredRow: Record<string, unknown> = {};
        visibleColumns.forEach((col) => {
          if (col.field in row) {
            filteredRow[col.field] = row[col.field];
          }
        });
        return filteredRow;
      });
    } else {
      // Use all columns if no config
      if (rows.length > 0) {
        headers = Object.keys(rows[0]);
      }
    }

    // Generate export based on format
    if (format === 'csv') {
      // Generate CSV
      const csvRows = [
        headers.join(','),
        ...filteredRows.map((row) =>
          headers.map((header) => {
            const colDef = columnConfig.find((c) => c.header === header);
            const field = colDef?.field || header;
            const value = row[field];
            // Escape values with commas or quotes
            const stringValue = value === null || value === undefined ? '' : String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report.name || 'report'}.csv"`,
        },
      });
    }

    if (format === 'excel' || format === 'xlsx') {
      // Generate proper Excel file using ExcelJS
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report Data');

      // Add headers with styling
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Add data rows
      filteredRows.forEach((row) => {
        const values = headers.map((header) => {
          const colDef = columnConfig.find((c) => c.header === header);
          const field = colDef?.field || header;
          const value = row[field];
          return value === null || value === undefined ? '' : value;
        });
        worksheet.addRow(values);
      });

      // Auto-fit column widths
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const length = cell.value ? String(cell.value).length : 10;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(Buffer.from(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${report.name || 'report'}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      // Generate PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const tableTop = 30;
      const rowHeight = 7;
      const cellPadding = 2;

      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(report.name || 'Report', margin, 15);

      // Add timestamp
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22);

      // Calculate column widths
      const numColumns = headers.length;
      const columnWidth = (pageWidth - (2 * margin)) / numColumns;

      let yPosition = tableTop;

      // Draw headers
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition - rowHeight + cellPadding, pageWidth - (2 * margin), rowHeight, 'F');

      headers.forEach((header, index) => {
        const x = margin + (index * columnWidth);
        const text = String(header);
        const maxWidth = columnWidth - (2 * cellPadding);

        // Truncate text if too long
        let displayText = text;
        if (doc.getTextWidth(text) > maxWidth) {
          while (doc.getTextWidth(displayText + '...') > maxWidth && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
          }
          displayText = displayText + '...';
        }

        doc.text(displayText, x + cellPadding, yPosition);
      });

      yPosition += rowHeight;

      // Draw rows
      doc.setFont('helvetica', 'normal');
      const maxRowsPerPage = Math.floor((pageHeight - yPosition - margin) / rowHeight);

      filteredRows.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = tableTop;

          // Redraw headers on new page
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPosition - rowHeight + cellPadding, pageWidth - (2 * margin), rowHeight, 'F');

          headers.forEach((header, index) => {
            const x = margin + (index * columnWidth);
            const text = String(header);
            const maxWidth = columnWidth - (2 * cellPadding);

            let displayText = text;
            if (doc.getTextWidth(text) > maxWidth) {
              while (doc.getTextWidth(displayText + '...') > maxWidth && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
              }
              displayText = displayText + '...';
            }

            doc.text(displayText, x + cellPadding, yPosition);
          });

          doc.setFont('helvetica', 'normal');
          yPosition += rowHeight;
        }

        // Draw row data
        headers.forEach((header, colIndex) => {
          const colDef = columnConfig.find((c) => c.header === header);
          const field = colDef?.field || header;
          const value = row[field];
          const stringValue = value === null || value === undefined ? '' : String(value);
          const x = margin + (colIndex * columnWidth);
          const maxWidth = columnWidth - (2 * cellPadding);

          // Truncate text if too long
          let displayText = stringValue;
          if (doc.getTextWidth(stringValue) > maxWidth) {
            while (doc.getTextWidth(displayText + '...') > maxWidth && displayText.length > 0) {
              displayText = displayText.slice(0, -1);
            }
            displayText = displayText + '...';
          }

          doc.text(displayText, x + cellPadding, yPosition);
        });

        yPosition += rowHeight;
      });

      // Add footer with row count
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${totalPages} | Total rows: ${filteredRows.length}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      const pdfBytes = doc.output('arraybuffer');

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${report.name || 'report'}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to export report' } },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getDb } from "@/lib/db/config";
import { getConnection } from "@/lib/db/connection-manager";
import type { DataSource } from "@/types/database";

function inferColumnType(value: unknown): string {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return "integer";
    return "decimal";
  }
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return "datetime";
  }
  return "text";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    const db = getDb();

    const query = await db("saved_queries").where("id", id).first();
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Query not found" },
        },
        { status: 404 },
      );
    }

    const dataSource = await db<DataSource>("data_sources")
      .where("id", query.data_source_id)
      .where("is_active", true)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATASOURCE_NOT_FOUND",
            message: "Data source not found",
          },
        },
        { status: 404 },
      );
    }

    const connection = await getConnection(dataSource);
    let limitedSQL = query.sql_content.trim();

    limitedSQL = limitedSQL.replace(/;+$/, "");

    if (!/\bLIMIT\s+\d+/i.test(limitedSQL)) {
      limitedSQL = `${limitedSQL} LIMIT 5`;
    }

    const result = await connection.raw(limitedSQL);

    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result.rows) {
      rows = result.rows;
    } else if (result[0]) {
      rows = Array.isArray(result[0]) ? result[0] : [result[0]];
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const types: Record<string, string> = {};
    columns.forEach((col) => {
      for (const row of rows) {
        const val = row[col];
        if (val !== null && val !== undefined) {
          types[col] = inferColumnType(val);
          break;
        }
      }
      if (!types[col]) {
        types[col] = "unknown";
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        rows,
        columns,
        types,
      },
    });
  } catch (error) {
    console.error("Error executing query for preview:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to execute query" },
      },
      { status: 500 },
    );
  }
}

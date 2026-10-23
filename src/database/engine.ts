import type { Database, SqlValue } from 'sql.js';
import type { CellValue, Execution, QueryResult, TableSchema } from './types';

const MAX_ROWS = 500;
const MAX_STATEMENTS = 30;
const MAX_RESULT_CHARACTERS = 1_000_000;

function displayValue(value: SqlValue): CellValue {
  if (value instanceof Uint8Array) {
    return `[BLOB · ${value.length} bytes]`;
  }
  if (typeof value === 'string' && value.length > 4000) {
    return `${value.slice(0, 4000)}… [内容已截断]`;
  }
  return value;
}

export function executeSql(db: Database, sql: string): Execution {
  const start = performance.now();
  const results: QueryResult[] = [];
  let statementCount = 0;
  let resultCharacters = 0;
  let offset = 0;
  let currentSql = '';

  try {
    if (sql.length > 50_000) {
      throw new Error('SQL 过长，请控制在 50,000 个字符以内。');
    }

    // SQLite parses statements itself, including semicolons inside strings and triggers.
    for (const statement of db.iterateStatements(sql)) {
      currentSql = statement.getSQL();
      statementCount += 1;
      if (statementCount > MAX_STATEMENTS) {
        throw new Error('一次最多执行 30 条语句，后续语句未执行。');
      }

      const statementSql = currentSql;
      const columns = statement.getColumnNames();
      const values: CellValue[][] = [];
      let truncated = false;

      while (statement.step()) {
        if (values.length >= MAX_ROWS || resultCharacters >= MAX_RESULT_CHARACTERS) {
          truncated = true;
          // Stop reading excess rows; do not keep traversing a huge query result.
          break;
        }
        const row = statement.get().map(displayValue);
        resultCharacters += JSON.stringify(row).length;
        values.push(row);
      }

      const isDataChange = /^\s*(?:(?:--[^\n]*\n|\/\*[\s\S]*?\*\/)\s*)*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statementSql);
      results.push({
        sql: statementSql,
        columns,
        values,
        affectedRows: columns.length === 0 && isDataChange ? db.getRowsModified() : null,
        truncated,
      });
      offset += currentSql.length;
      currentSql = '';
    }

    if (statementCount === 0) {
      throw new Error('请输入可执行的 SQL，或选择需要运行的语句。');
    }

    return { results, duration: performance.now() - start };
  } catch (error) {
    return {
      results,
      duration: performance.now() - start,
      error: error instanceof Error ? error.message : String(error),
      failedStatement: sql.length > 50_000 ? undefined : {
        index: results.length + 1,
        sql: currentSql || sql.slice(offset),
        from: offset,
        to: currentSql ? offset + currentSql.length : sql.length,
        exact: Boolean(currentSql),
      },
    };
  }
}

export function readSchema(db: Database): TableSchema[] {
  const tables = db.exec(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  return (tables[0]?.values ?? []).map(([name, sql]) => {
    const tableName = String(name);
    const escapedName = tableName.replaceAll('"', '""');
    const info = db.exec(`PRAGMA table_info("${escapedName}")`);
    const foreignKeys = db.exec(`PRAGMA foreign_key_list("${escapedName}")`)[0]?.values ?? [];

    return {
      name: tableName,
      sql: String(sql),
      columns: (info[0]?.values ?? []).map((column) => ({
        name: String(column[1]),
        type: String(column[2]),
        notNull: Boolean(column[3]),
        primaryKey: Boolean(column[5]),
        defaultValue: column[4] === null ? null : String(column[4]),
        references: foreignKeys.filter((key) => key[3] === column[1]).map((key) => ({
          table: String(key[2]), column: key[4] === null ? '(主键)' : String(key[4]),
        })),
      })),
    };
  });
}

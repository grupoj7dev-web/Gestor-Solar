const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('./prisma');

const STORAGE_ROOT = path.resolve(process.cwd(), 'var', 'storage');

function quoteId(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseSelectColumns(selectArg) {
  if (!selectArg || selectArg.trim() === '*' || selectArg.includes('(') || selectArg.includes(')')) return null;
  return selectArg
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((col) => {
      const clean = col.includes(':') ? col.split(':')[0] : col;
      return clean.trim();
    });
}

function normalizeUserRow(row) {
  if (!row) return row;
  let permissions = row.permissions;
  if (typeof permissions === 'string') {
    try {
      permissions = JSON.parse(permissions);
    } catch (_) {
      permissions = null;
    }
  }
  return { ...row, permissions };
}

function projectRow(row, selectedColumns) {
  if (!selectedColumns) return row;
  const out = {};
  for (const col of selectedColumns) out[col] = row[col];
  return out;
}

class QueryBuilder {
  constructor(tableName) {
    this.table = tableName;
    this.mode = 'select';
    this.selected = '*';
    this.selectedColumns = null;
    this.countMode = null;
    this.head = false;
    this.filters = [];
    this.orGroups = [];
    this.orderBy = null;
    this.limitValue = null;
    this.offsetValue = null;
    this.insertRows = null;
    this.updateData = null;
    this.singleMode = false;
    this.maybeSingleMode = false;
    this.returningRequested = false;
  }

  async ensureTable() {
    if (this.table === 'users') {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "password_hash" TEXT NOT NULL,
          "role" TEXT DEFAULT 'user',
          "permissions" TEXT,
          "is_active" INTEGER NOT NULL DEFAULT 1,
          "department" TEXT,
          "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
          "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      // Backward-compatible evolution for existing sqlite tables created before "department" existed.
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("users")`);
      const hasDepartment = Array.isArray(columns) && columns.some((c) => c.name === 'department');
      if (!hasDepartment) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN "department" TEXT`);
      }
      return;
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${quoteId(this.table)} (
        "id" TEXT PRIMARY KEY,
        "payload" TEXT NOT NULL,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  select(columns = '*', options = {}) {
    this.mode = this.mode || 'select';
    this.selected = columns;
    this.selectedColumns = parseSelectColumns(columns);
    this.countMode = options.count || null;
    this.head = Boolean(options.head);
    this.returningRequested = true;
    return this;
  }

  insert(rows) {
    this.mode = 'insert';
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values) {
    this.mode = 'update';
    this.updateData = values || {};
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: '=', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ op: '!=', column, value });
    return this;
  }

  gt(column, value) {
    this.filters.push({ op: '>', column, value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ op: '>=', column, value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ op: '<', column, value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ op: '<=', column, value });
    return this;
  }

  like(column, value) {
    this.filters.push({ op: 'LIKE', column, value });
    return this;
  }

  ilike(column, value) {
    this.filters.push({ op: 'ILIKE', column, value });
    return this;
  }

  in(column, values) {
    this.filters.push({ op: 'IN', column, value: values || [] });
    return this;
  }

  is(column, value) {
    this.filters.push({ op: 'IS', column, value });
    return this;
  }

  match(values) {
    Object.entries(values || {}).forEach(([column, value]) => this.eq(column, value));
    return this;
  }

  or(expression) {
    const raw = String(expression || '').trim();
    if (!raw) return this;
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const parsed = [];
    for (const part of parts) {
      const tokens = part.split('.');
      if (tokens.length < 3) continue;
      const column = tokens[0];
      const opToken = tokens[1];
      const value = tokens.slice(2).join('.');
      if (opToken === 'ilike') parsed.push({ op: 'ILIKE', column, value });
      if (opToken === 'eq') parsed.push({ op: '=', column, value });
    }
    if (parsed.length) this.orGroups.push(parsed);
    return this;
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(n) {
    this.limitValue = Number(n);
    return this;
  }

  range(from, to) {
    const start = Number(from);
    const end = Number(to);
    this.offsetValue = Number.isFinite(start) ? start : null;
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      this.limitValue = end - start + 1;
    }
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleMode = true;
    return this;
  }

  buildWhereClause(forUsers) {
    const clauses = [];
    const params = [];

    const resolveGenericColumnExpr = (column) => {
      if (column === 'id' || column === 'created_at' || column === 'updated_at') {
        return quoteId(column);
      }
      return `json_extract(payload, '$.${column}')`;
    };

    const resolveExpr = (filter) => {
      const base = forUsers ? quoteId(filter.column) : resolveGenericColumnExpr(filter.column);
      if (filter.op === 'ILIKE') {
        return { clause: `LOWER(${base}) LIKE LOWER(?)`, value: filter.value };
      }
      if (filter.op === 'IN') {
        const vals = Array.isArray(filter.value) ? filter.value : [];
        if (!vals.length) return { clause: '1=0', value: null };
        const placeholders = vals.map(() => '?').join(', ');
        return { clause: `${base} IN (${placeholders})`, value: vals };
      }
      if (filter.op === 'IS') {
        if (filter.value === null) return { clause: `${base} IS NULL`, value: null };
        return { clause: `${base} IS ?`, value: filter.value };
      }
      return { clause: `${base} ${filter.op} ?`, value: filter.value };
    };

    for (const filter of this.filters) {
      const expr = resolveExpr(filter);
      clauses.push(expr.clause);
      if (Array.isArray(expr.value)) params.push(...expr.value);
      else if (expr.value !== null) params.push(expr.value);
    }

    for (const group of this.orGroups) {
      const groupClauses = [];
      const groupParams = [];
      for (const filter of group) {
        const expr = resolveExpr(filter);
        groupClauses.push(expr.clause);
        if (Array.isArray(expr.value)) groupParams.push(...expr.value);
        else if (expr.value !== null) groupParams.push(expr.value);
      }
      if (groupClauses.length) {
        clauses.push(`(${groupClauses.join(' OR ')})`);
        params.push(...groupParams);
      }
    }

    if (!clauses.length) return { whereSql: '', params };
    return { whereSql: ` WHERE ${clauses.join(' AND ')}`, params };
  }

  async executeSelectUsers() {
    const { whereSql, params } = this.buildWhereClause(true);
    let orderSql = '';
    if (this.orderBy) orderSql = ` ORDER BY ${quoteId(this.orderBy.column)} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`;
    let limitSql = '';
    if (Number.isFinite(this.limitValue)) limitSql += ` LIMIT ${Math.max(0, this.limitValue)}`;
    if (Number.isFinite(this.offsetValue)) limitSql += ` OFFSET ${Math.max(0, this.offsetValue)}`;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "users"${whereSql}${orderSql}${limitSql}`,
      ...params
    );
    const normalized = rows.map(normalizeUserRow);
    const data = normalized.map((r) => projectRow(r, this.selectedColumns));

    let count = null;
    if (this.countMode === 'exact') {
      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM "users"${whereSql}`,
        ...params
      );
      count = Number(countRows?.[0]?.total || 0);
    }
    return { data: this.head ? null : data, count };
  }

  async executeSelectGeneric() {
    const { whereSql, params } = this.buildWhereClause(false);
    let orderSql = '';
    if (this.orderBy) {
      const orderExpr = (this.orderBy.column === 'id' || this.orderBy.column === 'created_at' || this.orderBy.column === 'updated_at')
        ? quoteId(this.orderBy.column)
        : `json_extract(payload, '$.${this.orderBy.column}')`;
      orderSql = ` ORDER BY ${orderExpr} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`;
    }
    let limitSql = '';
    if (Number.isFinite(this.limitValue)) limitSql += ` LIMIT ${Math.max(0, this.limitValue)}`;
    if (Number.isFinite(this.offsetValue)) limitSql += ` OFFSET ${Math.max(0, this.offsetValue)}`;
    const sql = `SELECT id, payload, created_at, updated_at FROM ${quoteId(this.table)}${whereSql}${orderSql}${limitSql}`;
    const rows = await prisma.$queryRawUnsafe(sql, ...params);

    const data = rows.map((r) => {
      const payload = JSON.parse(r.payload || '{}');
      return projectRow({ id: r.id, ...payload, created_at: r.created_at, updated_at: r.updated_at }, this.selectedColumns);
    });

    let count = null;
    if (this.countMode === 'exact') {
      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM ${quoteId(this.table)}${whereSql}`,
        ...params
      );
      count = Number(countRows?.[0]?.total || 0);
    }

    return { data: this.head ? null : data, count };
  }

  async executeInsertUsers() {
    const rows = this.insertRows || [];
    const inserted = [];
    for (const row of rows) {
      const id = row.id || crypto.randomUUID();
      const createdAt = row.created_at || nowIso();
      const updatedAt = row.updated_at || createdAt;
      const permissions = row.permissions == null ? null : JSON.stringify(row.permissions);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "users" (id, name, email, password_hash, role, permissions, is_active, department, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        row.name || '',
        row.email || '',
        row.password_hash || row.passwordHash || '',
        row.role || 'user',
        permissions,
        row.is_active === false ? 0 : 1,
        row.department || null,
        createdAt,
        updatedAt
      );
      inserted.push(
        normalizeUserRow({
          id,
          name: row.name || '',
          email: row.email || '',
          password_hash: row.password_hash || row.passwordHash || '',
          role: row.role || 'user',
          permissions,
          is_active: row.is_active === false ? 0 : 1,
          department: row.department || null,
          created_at: createdAt,
          updated_at: updatedAt,
        })
      );
    }
    return this.returningRequested ? inserted.map((r) => projectRow(r, this.selectedColumns)) : null;
  }

  async executeInsertGeneric() {
    const rows = this.insertRows || [];
    const inserted = [];
    for (const row of rows) {
      const id = row.id || crypto.randomUUID();
      const payload = { ...row };
      delete payload.id;
      const createdAt = row.created_at || nowIso();
      const updatedAt = row.updated_at || createdAt;
      await prisma.$executeRawUnsafe(
        `INSERT INTO ${quoteId(this.table)} (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        id,
        JSON.stringify(payload),
        createdAt,
        updatedAt
      );
      inserted.push(projectRow({ id, ...payload, created_at: createdAt, updated_at: updatedAt }, this.selectedColumns));
    }
    return this.returningRequested ? inserted : null;
  }

  async executeUpdateUsers() {
    const selected = await this.executeSelectUsers();
    const rows = selected.data || [];
    const updated = [];
    for (const row of rows) {
      const patch = { ...this.updateData };
      const next = {
        ...row,
        ...patch,
        permissions: patch.permissions !== undefined ? patch.permissions : row.permissions,
        updated_at: nowIso(),
      };
      await prisma.$executeRawUnsafe(
        `UPDATE "users" SET name=?, email=?, password_hash=?, role=?, permissions=?, is_active=?, department=?, updated_at=? WHERE id=?`,
        next.name || '',
        next.email || '',
        next.password_hash || '',
        next.role || 'user',
        next.permissions == null ? null : JSON.stringify(next.permissions),
        next.is_active === false ? 0 : 1,
        next.department || null,
        next.updated_at,
        row.id
      );
      updated.push(normalizeUserRow(next));
    }
    return this.returningRequested ? updated.map((r) => projectRow(r, this.selectedColumns)) : null;
  }

  async executeUpdateGeneric() {
    const selected = await this.executeSelectGeneric();
    const rows = selected.data || [];
    const updated = [];
    for (const row of rows) {
      const next = { ...row, ...this.updateData, updated_at: nowIso() };
      const payload = { ...next };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      await prisma.$executeRawUnsafe(
        `UPDATE ${quoteId(this.table)} SET payload=?, updated_at=? WHERE id=?`,
        JSON.stringify(payload),
        next.updated_at,
        row.id
      );
      updated.push(projectRow(next, this.selectedColumns));
    }
    return this.returningRequested ? updated : null;
  }

  async executeDeleteUsers() {
    const selected = await this.executeSelectUsers();
    const rows = selected.data || [];
    for (const row of rows) {
      await prisma.$executeRawUnsafe(`DELETE FROM "users" WHERE id=?`, row.id);
    }
    return this.returningRequested ? rows.map((r) => projectRow(r, this.selectedColumns)) : null;
  }

  async executeDeleteGeneric() {
    const selected = await this.executeSelectGeneric();
    const rows = selected.data || [];
    for (const row of rows) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${quoteId(this.table)} WHERE id=?`, row.id);
    }
    return this.returningRequested ? rows.map((r) => projectRow(r, this.selectedColumns)) : null;
  }

  finalizeResponse(data, count) {
    if (this.singleMode) {
      if (!data || data.length === 0) return { data: null, error: { message: 'No rows found' }, count };
      if (data.length > 1) return { data: null, error: { message: 'Multiple rows found' }, count };
      return { data: data[0], error: null, count };
    }
    if (this.maybeSingleMode) {
      if (!data || data.length === 0) return { data: null, error: null, count };
      return { data: data[0], error: null, count };
    }
    return { data, error: null, count };
  }

  async execute() {
    try {
      await this.ensureTable();

      if (this.mode === 'select') {
        const { data, count } = this.table === 'users'
          ? await this.executeSelectUsers()
          : await this.executeSelectGeneric();
        return this.finalizeResponse(data, count);
      }

      if (this.mode === 'insert') {
        const data = this.table === 'users'
          ? await this.executeInsertUsers()
          : await this.executeInsertGeneric();
        return this.finalizeResponse(data, null);
      }

      if (this.mode === 'update') {
        const data = this.table === 'users'
          ? await this.executeUpdateUsers()
          : await this.executeUpdateGeneric();
        return this.finalizeResponse(data, null);
      }

      if (this.mode === 'delete') {
        const data = this.table === 'users'
          ? await this.executeDeleteUsers()
          : await this.executeDeleteGeneric();
        return this.finalizeResponse(data, null);
      }

      return { data: null, error: null, count: null };
    } catch (error) {
      return { data: null, error, count: null };
    }
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

class StorageBucket {
  constructor(bucket) {
    this.bucket = bucket;
  }

  async upload(filePath, buffer) {
    try {
      const target = path.resolve(STORAGE_ROOT, this.bucket, filePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer);
      return { data: { path: filePath }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  getPublicUrl(filePath) {
    return {
      data: {
        publicUrl: `/uploads/${this.bucket}/${filePath}`
      }
    };
  }
}

const supabase = {
  from(tableName) {
    return new QueryBuilder(tableName);
  },
  async rpc(name, args = {}) {
    try {
      if (name !== 'exec_sql') {
        throw new Error(`Unsupported RPC: ${name}`);
      }
      const sql = String(args.sql_query || '').trim();
      if (!sql) return { data: [], error: null };
      if (/^\s*select/i.test(sql)) {
        const data = await prisma.$queryRawUnsafe(sql);
        return { data, error: null };
      }
      await prisma.$executeRawUnsafe(sql);
      return { data: [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  storage: {
    from(bucket) {
      return new StorageBucket(bucket);
    }
  }
};

module.exports = supabase;

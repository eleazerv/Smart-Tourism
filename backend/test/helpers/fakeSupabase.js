// Tiruan minimal query builder Supabase (chainable, thenable), cukup untuk
// menjalankan pola query yang dipakai lib/tripStops.helper.js (select, eq,
// order, limit, maybeSingle/single, insert). Bukan pengganti Supabase asli --
// hanya dipakai supaya integration test bisa memverifikasi beberapa fungsi
// bekerja BENAR SAMA LAIN (helper + logic sequence_order + resolve-or-create)
// tanpa butuh koneksi database sungguhan.

function matchesFilters(row, filters) {
  return filters.every(([field, value]) => row[field] === value);
}

function applyOrder(rows, orderField, ascending) {
  if (!orderField) return rows;
  return [...rows].sort((a, b) => {
    const diff = a[orderField] > b[orderField] ? 1 : a[orderField] < b[orderField] ? -1 : 0;
    return ascending ? diff : -diff;
  });
}

class QueryBuilder {
  constructor(table, store) {
    this.table = table;
    this.store = store;
    this.filters = [];
    this._order = null;
    this._limit = null;
    this._insertRows = null;
    this._updatePatch = null;
    this._mode = 'select';
  }

  select() {
    return this;
  }

  eq(field, value) {
    this.filters.push([field, value]);
    return this;
  }

  order(field, { ascending = true } = {}) {
    this._order = { field, ascending };
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  insert(rows) {
    this._mode = 'insert';
    this._insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch) {
    this._mode = 'update';
    this._updatePatch = patch;
    return this;
  }

  _rows() {
    const all = this.store.get(this.table) || [];
    let rows = all.filter((r) => matchesFilters(r, this.filters));
    if (this._order) rows = applyOrder(rows, this._order.field, this._order.ascending);
    if (this._limit != null) rows = rows.slice(0, this._limit);
    return rows;
  }

  async maybeSingle() {
    if (this._mode === 'insert') {
      const table = this.store.get(this.table) || [];
      const inserted = this._insertRows.map((r) => ({ id: r.id || `id_${table.length + 1}_${Math.random().toString(36).slice(2, 8)}`, ...r }));
      this.store.set(this.table, [...table, ...inserted]);
      return { data: inserted[0] || null, error: null };
    }
    const rows = this._rows();
    return { data: rows[0] || null, error: null };
  }

  async single() {
    const { data, error } = await this.maybeSingle();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: { message: 'no rows found' } };
    return { data, error: null };
  }

  then(resolve, reject) {
    // Dipakai kalau query di-`await` langsung tanpa .maybeSingle()/.single(),
    // misalnya update tanpa .select() di belakangnya.
    const run = async () => {
      if (this._mode === 'update') {
        const all = this.store.get(this.table) || [];
        const updated = all.map((r) => (matchesFilters(r, this.filters) ? { ...r, ...this._updatePatch } : r));
        this.store.set(this.table, updated);
        return { data: null, error: null };
      }
      if (this._mode === 'insert') {
        return this.maybeSingle();
      }
      return { data: this._rows(), error: null };
    };
    return run().then(resolve, reject);
  }
}

export function createFakeDb(seed = {}) {
  const store = new Map(Object.entries(seed).map(([table, rows]) => [table, [...rows]]));
  return {
    from(table) {
      return new QueryBuilder(table, store);
    },
    _dump(table) {
      return store.get(table) || [];
    },
  };
}

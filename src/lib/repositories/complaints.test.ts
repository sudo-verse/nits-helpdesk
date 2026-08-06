import { deepStrictEqual } from "node:assert";
import { test } from "node:test";

import { applyFilters } from "./complaints.ts";

type Call = [method: string, ...args: unknown[]];

interface FakeQuery {
  calls: Call[];
  eq(column: string, value: string): FakeQuery;
  in(column: string, values: string[]): FakeQuery;
  is(column: string, value: null): FakeQuery;
  gte(column: string, value: string): FakeQuery;
  lte(column: string, value: string): FakeQuery;
  or(filters: string): FakeQuery;
}

/** Records every filter method call instead of touching a real query builder. */
function fakeQuery(): FakeQuery {
  const calls: Call[] = [];
  const self: FakeQuery = {
    calls,
    eq(column, value) {
      calls.push(["eq", column, value]);
      return self;
    },
    in(column, values) {
      calls.push(["in", column, values]);
      return self;
    },
    is(column, value) {
      calls.push(["is", column, value]);
      return self;
    },
    gte(column, value) {
      calls.push(["gte", column, value]);
      return self;
    },
    lte(column, value) {
      calls.push(["lte", column, value]);
      return self;
    },
    or(filters) {
      calls.push(["or", filters]);
      return self;
    },
  };
  return self;
}

test("applyFilters: no filters makes no calls", () => {
  const q = fakeQuery();
  applyFilters(q, {});
  deepStrictEqual(q.calls, []);
});

test("applyFilters: single status uses eq", () => {
  const q = fakeQuery();
  applyFilters(q, { status: "in_progress" });
  deepStrictEqual(q.calls, [["eq", "status", "in_progress"]]);
});

test("applyFilters: status array uses in — the resolved+closed admin tab case", () => {
  const q = fakeQuery();
  applyFilters(q, { status: ["resolved", "closed"] });
  deepStrictEqual(q.calls, [["in", "status", ["resolved", "closed"]]]);
});

test("applyFilters: status \"all\" applies no status filter at all", () => {
  const q = fakeQuery();
  applyFilters(q, { status: "all" });
  deepStrictEqual(q.calls, []);
});

test("applyFilters: unassignedOnly uses is(assigned_to, null)", () => {
  const q = fakeQuery();
  applyFilters(q, { unassignedOnly: true });
  deepStrictEqual(q.calls, [["is", "assigned_to", null]]);
});

test("applyFilters: search strips PostgREST filter-syntax characters", () => {
  // Unescaped commas/parens in a search term would splice extra clauses into
  // the .or() filter string rather than being searched for literally.
  const q = fakeQuery();
  applyFilters(q, { search: "wifi (urgent), please" });
  deepStrictEqual(q.calls, [
    [
      "or",
      "title.ilike.%wifi urgent please%,description.ilike.%wifi urgent please%,complaint_code.ilike.%wifi urgent please%",
    ],
  ]);
});

test("applyFilters: search that is only punctuation applies no filter", () => {
  const q = fakeQuery();
  applyFilters(q, { search: "(),,," });
  deepStrictEqual(q.calls, []);
});

test("applyFilters: whitespace-only search applies no filter", () => {
  const q = fakeQuery();
  applyFilters(q, { search: "   " });
  deepStrictEqual(q.calls, []);
});

test("applyFilters: multiple filters combine in a stable order", () => {
  const q = fakeQuery();
  applyFilters(q, {
    status: "assigned",
    departmentId: "dept-1",
    hostelId: "hostel-1",
    priority: "high",
    assignedTo: "staff-1",
    from: "2026-01-01",
    to: "2026-02-01",
  });
  deepStrictEqual(q.calls, [
    ["eq", "status", "assigned"],
    ["eq", "department_id", "dept-1"],
    ["eq", "hostel_id", "hostel-1"],
    ["eq", "priority", "high"],
    ["eq", "assigned_to", "staff-1"],
    ["gte", "created_at", "2026-01-01"],
    ["lte", "created_at", "2026-02-01"],
  ]);
});

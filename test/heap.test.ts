import { Heap } from "../src/heap.ts";

// Minimal test runner — no dependencies, run with: npm test
// (requires Node 22.18+ for TypeScript type stripping)

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(
      `FAIL  ${name}${detail !== undefined ? "  -> " + JSON.stringify(detail) : ""}`,
    );
  }
}
function eq<T>(a: T[], b: T[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
function isHeap<T>(h: Heap<T>) {
  for (let i = 0; i < h.items.length; i++) {
    const l = 2 * i + 1,
      r = 2 * i + 2;
    if (l < h.items.length && h.comparator(h.items[l], h.items[i]) < 0)
      return false;
    if (r < h.items.length && h.comparator(h.items[r], h.items[i]) < 0)
      return false;
  }
  return true;
}

const numCmp = (a: number, b: number) => a - b;
const strCmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function heapSortAll<T>(arr: T[], cmp: (a: T, b: T) => number): T[] {
  const h = new Heap([...arr], cmp);
  const out: T[] = [];
  while (h.size() > 0) out.push(h.poll()!);
  return out;
}

let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
}

// --- Falsy values must survive poll() (regression test for the pop() fix) ---
{
  const h = new Heap([-1, 0], numCmp);
  check("poll [-1,0] returns [-1,0]", eq([h.poll(), h.poll()], [-1, 0]));
  const h2 = new Heap(["", "a"], strCmp);
  check(
    'poll ["", "a"] returns ["", "a"]',
    eq([h2.poll(), h2.poll()], ["", "a"]),
  );
  check(
    "poll [0,5,-3,0,2] sorts fully",
    eq(heapSortAll([0, 5, -3, 0, 2], numCmp), [-3, 0, 0, 2, 5]),
  );
}

// --- Heap-sort equivalence vs Array.sort ---
{
  let ok = true,
    bad: unknown = null;
  for (let t = 0; t < 500; t++) {
    const n = Math.floor(rnd() * 30);
    const arr = Array.from({ length: n }, () => Math.floor(rnd() * 21) - 10); // -10..10, includes 0
    if (!eq(heapSortAll(arr, numCmp), [...arr].sort(numCmp))) {
      ok = false;
      bad = arr;
      break;
    }
  }
  check("500 random number heap-sorts match Array.sort", ok, bad);

  const words = ["", "a", "b", "aa", "ab", "z", "m"];
  ok = true;
  bad = null;
  for (let t = 0; t < 200; t++) {
    const n = Math.floor(rnd() * 15);
    const arr = Array.from(
      { length: n },
      () => words[Math.floor(rnd() * words.length)],
    );
    if (!eq(heapSortAll(arr, strCmp), [...arr].sort(strCmp))) {
      ok = false;
      bad = arr;
      break;
    }
  }
  check("200 random string heap-sorts match Array.sort", ok, bad);

  ok = true;
  bad = null;
  for (let t = 0; t < 200; t++) {
    const n = Math.floor(rnd() * 25);
    const arr = Array.from({ length: n }, () => Math.floor(rnd() * 21) - 10);
    if (
      !eq(
        heapSortAll(arr, (a, b) => b - a),
        [...arr].sort((a, b) => b - a),
      )
    ) {
      ok = false;
      bad = arr;
      break;
    }
  }
  check("200 random max-heap sorts match Array.sort desc", ok, bad);
}

// --- Interleaved offer/poll keeps the heap invariant ---
{
  const h = new Heap<number>([], numCmp);
  let ok = true;
  for (let t = 0; t < 300; t++) {
    if (rnd() < 0.6 || h.size() === 0) h.offer(Math.floor(rnd() * 21) - 10);
    else h.poll();
    if (!isHeap(h)) {
      ok = false;
      break;
    }
  }
  check("heap invariant holds through 300 interleaved offer/poll", ok);
}

// --- Edge cases ---
{
  const h = new Heap<number>(null, numCmp);
  check(
    "null list initializes empty heap",
    h.isEmpty() === true && h.size() === 0,
  );
  check("empty peek() is null", h.peek() === null);
  check("empty poll() is null", h.poll() === null);
  check("empty isEmpty()", h.isEmpty() === true);
  check("empty size() is 0", h.size() === 0);
  check(
    "index helpers leftChild/rightChild/parent",
    h.leftChild(1) === 3 && h.rightChild(1) === 4 && h.parent(4) === 1,
  );
  h.offer(7);
  check("single-element peek is 7", h.peek() === 7);
  check("single-element poll returns 7", h.poll() === 7);
  check("empty again after poll", h.isEmpty() === true);
  const h2 = new Heap([5], numCmp);
  check("buildHeap on [5] keeps [5]", eq(h2.items, [5]));

  // Constructor must copy the input array, not alias/mutate it
  const input = [5, 3, 8, 1];
  const hCopy = new Heap(input, numCmp);
  check("constructor does not reorder caller's array", eq(input, [5, 3, 8, 1]), input);
  check("heap does not alias caller's array", hCopy.items !== input);
  input.push(-100);
  input[0] = 999;
  check(
    "later changes to caller's array don't affect heap",
    hCopy.size() === 4 && hCopy.peek() === 1 && isHeap(hCopy),
  );
  hCopy.offer(0);
  hCopy.poll();
  check(
    "heap operations don't mutate caller's array",
    eq(input, [999, 3, 8, 1, -100]),
    input,
  );

  // Equal elements should not be swapped unnecessarily in moveDown / moveUp
  const a = { k: 1, id: 1 },
    b = { k: 1, id: 2 },
    c = { k: 1, id: 3 };
  const hEq = new Heap([a, b], (x, y) => x.k - y.k);
  check(
    "moveDown does not swap equal elements",
    hEq.items[0] === a && hEq.items[1] === b,
  );
  hEq.offer(c);
  check(
    "moveUp does not swap equal elements",
    hEq.items[0] === a && hEq.items[2] === c,
  );
}

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

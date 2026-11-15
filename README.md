# ts-data-structures

TypeScript data structures, built up one at a time. Starting with a binary heap.

## Heap

A generic binary heap in `src/heap.ts`.

```ts
import { Heap } from "./src/heap.ts";

// Min-heap: poll() returns the smallest first
const min = new Heap([5, 3, 8, 1], (a, b) => a - b);
min.poll(); // 1
min.offer(2);
min.peek(); // 2

// Max-heap: reverse the comparator
const max = new Heap([5, 3, 8, 1], (a, b) => b - a);
max.poll(); // 8
```

### Comparator convention

The comparator follows the `Array.sort` convention: return a negative number
if `a` should come before `b`, positive if `b` should come first, `0` if they
are equal. `poll()` then returns elements in the same order `Array.sort` with
that comparator would produce — `(a, b) => a - b` is a min-heap,
`(a, b) => b - a` is a max-heap.

### API

| Method                       | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `new Heap(list, comparator)` | Builds a heap from `list` (heapified in place).            |
| `offer(value)`               | Inserts a value.                                           |
| `poll()`                     | Removes and returns the top element, or `null` when empty. |
| `peek()`                     | Returns the top element without removing it.               |
| `size()` / `isEmpty()`       | Number of elements / whether the heap is empty.            |

### Note on `poll()`

An earlier version of `poll()` guarded the re-heapify step with
`if (this.size() && last)`, which treated falsy values (`0`, `""`, `false`,
`NaN`) as "no element": polling a heap whose last array element was `0`
silently dropped the `0` and left the already-returned root in the heap
(e.g. polling `[-1, 0]` returned `[-1, -1]`). The fix checks the size only:

```ts
const last = this.items.pop()!;
if (this.size() > 0) {
  this.items[0] = last;
  this.moveDown(0);
}
```

Covered by the falsy-value regression tests in `test/heap.test.ts`.

## Tests

```sh
npm test        # runs test/heap.test.ts (needs Node 22.18+ for TS type stripping)
npm run typecheck   # tsc --noEmit, after npm install
```

import type { DatabaseSync } from 'node:sqlite';
import type { ShoppingAmount } from '@nosh/shared';

/** Ticked shopping-list items, each with the amounts that were ticked. */

export function getTicks(db: DatabaseSync): Map<string, ShoppingAmount[]> {
  const rows = db.prepare('SELECT item, amounts FROM shopping_ticks').all() as unknown as {
    item: string;
    amounts: string;
  }[];
  return new Map(rows.map((row) => [row.item, JSON.parse(row.amounts) as ShoppingAmount[]]));
}

export function setTick(db: DatabaseSync, item: string, amounts: ShoppingAmount[]): void {
  db.prepare(
    `INSERT INTO shopping_ticks (item, amounts) VALUES (?, ?)
     ON CONFLICT (item) DO UPDATE SET amounts = excluded.amounts`,
  ).run(item, JSON.stringify(amounts));
}

export function removeTick(db: DatabaseSync, item: string): void {
  db.prepare('DELETE FROM shopping_ticks WHERE item = ?').run(item);
}

export function clearTicks(db: DatabaseSync): void {
  db.exec('DELETE FROM shopping_ticks');
}

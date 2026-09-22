-- Nosh schema.
--
-- Only the tables needed to hold the recipe catalogue exist at this stage.
-- `preferences` and `plan_entries` arrive with the planner feature - there is no
-- point creating tables nothing reads yet.
--
-- mealType/dietary/tags/method are stored as JSON text rather than join tables.
-- For a catalogue this size that keeps the schema to two tables, and SQLite's
-- json_each() still supports filtering by dietary tag when that feature lands.
-- Ingredients get a real table because the shopping list has to aggregate across them.

CREATE TABLE IF NOT EXISTS recipes (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  cuisine    TEXT    NOT NULL,
  serves     INTEGER NOT NULL,
  meal_type  TEXT    NOT NULL, -- JSON array of MealType
  dietary    TEXT    NOT NULL, -- JSON array of DietaryPreference
  tags       TEXT    NOT NULL, -- JSON array of RecipeTag
  method     TEXT    NOT NULL, -- JSON array of ordered steps
  is_custom  INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1))
);

CREATE TABLE IF NOT EXISTS ingredients (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id TEXT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  item      TEXT NOT NULL,
  quantity  REAL,          -- nullable: "salt, to taste" has no quantity
  unit      TEXT,          -- nullable: counted items such as "2 eggs" have no unit
  prep      TEXT           -- nullable: optional note such as "finely chopped"
);

CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients (recipe_id);

-- Shopping-list aggregation groups by item name, so it is worth an index.
CREATE INDEX IF NOT EXISTS idx_ingredients_item ON ingredients (item);

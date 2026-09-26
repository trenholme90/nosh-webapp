-- Nosh schema.
--
-- Tables arrive with the features that read them: the recipe catalogue, the
-- user's dietary preferences, the weekly plan and the shopping list's ticks.
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

-- One row: the app has a single user, so there is nothing to key preferences by.
-- The CHECK makes a second row impossible rather than merely unexpected.
CREATE TABLE IF NOT EXISTS preferences (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  dietary TEXT    NOT NULL DEFAULT '[]' -- JSON array of DietaryPreference
);

INSERT OR IGNORE INTO preferences (id) VALUES (1);

-- The weekly plan: one rolling week, so a slot is just a day and a meal, with no date.
-- The primary key allows one recipe per slot. Deleting a recipe takes it off the
-- plan too, which is the rule the user sees on the delete confirmation.
CREATE TABLE IF NOT EXISTS plan_entries (
  day       TEXT    NOT NULL CHECK (day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  slot      TEXT    NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  recipe_id TEXT    NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  servings  INTEGER NOT NULL CHECK (servings BETWEEN 1 AND 20),
  PRIMARY KEY (day, slot)
);

-- The shopping list itself is worked out from the plan on every request, so only
-- ticks are stored. Each records the amounts that were ticked (JSON): the item
-- stays ticked while the week needs no more than that, since ticking "2 onions"
-- says nothing about a third. See apps/api/src/shopping/shopping-list.ts.
CREATE TABLE IF NOT EXISTS shopping_ticks (
  item    TEXT PRIMARY KEY,
  amounts TEXT NOT NULL -- JSON array of ShoppingAmount
);

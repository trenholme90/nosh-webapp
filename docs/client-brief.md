# Project Nosh: client brief

This is the text of [`client-brief.pdf`](client-brief.pdf), with the hub locator
added as the "plus one" feature. The PDF is unchanged.

## Client background

Nosh is a charity that helps people on low incomes eat well without overspending.
They've asked Enablis to prove out a meal-planning web site that takes the faff out
of mealtimes: tasty and nutritional recipes, a weekly plan, and a shopping list that
respects a tight budget.

> **Our mission:** "No one should have to choose between eating well and making ends meet."

**Who they serve.** Households on tight budgets: busy parents, shift workers,
students. Many use older phones and shop once a week with a fixed amount to spend.

**What they do.** Founded 2019. 40+ community food hubs. 12k households supported.
Free budget-friendly recipes, community cooking sessions and practical meal-planning
support, delivered through local food hubs across the UK.

**Why this app.** Planning the week ahead is the biggest lever for cutting food cost
and waste. Nosh wants that to feel effortless, never like homework.

Nosh is a fictional client created for the Enablis engineering challenge.

## Your task

Prepare a working demo for the client's Product Owner and Engineering Manager.

1. Built-in starter recipes, or add your own, with ingredients and a method.
2. Dietary preferences (for example vegetarian, dairy-free).
3. Plan recipes across the days of the week.
4. A combined shopping list with quantities added up sensibly.

**Baseline plus one.** Treat that list as the baseline. The rest of the shape is
yours, and we would like you to add a feature of your own that you think makes it a
stronger solution.

### Our feature: hub locator

Nosh delivers its support through 40+ community food hubs, so the app should help
someone find one. A person types in their postcode and gets the 5 closest hubs to
them, nearest first, each with its name, address, distance in miles and opening
times.

- The postcode is checked and tidied (`m11ae` becomes `M1 1AE`), and turned into a
  location with [postcodes.io](https://postcodes.io).
- A mistyped postcode, a postcode that doesn't exist, and the lookup being
  unavailable each get a plain message that doesn't blame the user.
- The demo ships with 40 sample hubs in 40 English towns and cities, with invented
  names and addresses, in `apps/api/data/hubs.json`.

## Ground rules

- AI tooling is allowed. It should be a git repo with history.
- We may ask you to add a small feature during the session, so be ready to extend it live.
- A layered app: a client UI and a separate API layer.
- SQLite is fine, with a single user and no auth.
- About 2 to 3 hours of work.

## Visual identity

- **Colours:** Nosh Green `#62CC9B`, Deep Teal `#3AA58F`, Charcoal `#2E373E`,
  Flame Coral `#F3764B`, Leaf `#D5C52D`, Cloud Grey `#B7BFC0`.
- **Type:** Nunito Bold for headings, Nunito Sans for body.
- **Voice:** warm, plain, no guilt.
- **Accessibility:** WCAG AA, and it must work on older, small phones.

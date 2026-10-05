---
name: coding-standards-and-spec
description: To be used when creating, editing, refactoring code based on a spec.
---

# Coding Standards

## Process

### 1. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.), fetched via the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 2. Identify the standards sources

Use the coding-standards-and-spec skill

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.

Each smell reads _what it is_ → _how to fix_; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 3. Write a plan and implement

Using the /plan skill and the input from standards and spec, create a plan and implement the code changes.

### 4. Record decisions

Capture significant decisions as ADRs in `docs/adr/` as part of the change, in the same commit or PR as the code they describe. Write them while the reasoning is fresh; don't leave them for later.

Write an ADR when the change:

- picks a library, framework, runtime, or storage approach, or drops one;
- sets or changes a boundary between workspaces, processes, or layers, or the API contract;
- sets a rule the rest of the code must follow, such as how units convert or what a tick means;
- takes on a trade-off a future reader would otherwise question, including something deliberately left out.

Don't write one for routine changes that follow an existing ADR or standard.

How:

1. Read `docs/adr/README.md` first. If an existing ADR already covers the decision, follow it. If the change reverses one, write a new ADR that supersedes it and update the old one's status to "Superseded by NNNN". Never rewrite an accepted ADR.
2. Copy the sections from `docs/adr/template.md` (Title, Status, Context, Decision, Consequences) into `docs/adr/NNNN-short-kebab-title.md`, using the next number in sequence.
3. Say why, and what was turned down. If the reasoning wasn't stated and you are inferring it, mark it as inferred rather than presenting it as fact.
4. Add a row to the table in `docs/adr/README.md`.

### 5. Code Review

Using the skill /code-review-standards-and-spec. If there are any major logic changes required or you are unsure about how to proceed, get a second opinion from the claude user.

### 6. Pull request and merge

Use the /git-workflow skill here. Once it's passed the code review, open a PR and merge.

## Testing

Don't create seperate accessibility tests for pages. Include the function expectNoA11yViolations within existing test specs for the feature. Example:

```
test('an unknown recipe shows a friendly not-found page', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/recipes/no-such-recipe');
    await expectNoA11yViolations(page);

    // rest of test
  });
```

Do not edit existing tests except for selectors changing. If you need to do so, ask for permission

Run mutation testing when coding has finished to make sure tests are relevant and pass/fail when expected

Never skip or drop a valid test case because the data isn't in the state it needs. Seed the data inside the test so it can assert properly. Use the existing helpers first:

- E2E: the `createRecipe` fixture in `e2e/support/fixtures.ts`, which creates through the API and cleans up afterwards. E2E tests run in parallel against one API, so give seeded data a unique name (`uniqueName`) and never depend on or change data another test could see.
- API: `useMemoryDb()` in `apps/api/src/__tests__/memory-db.ts` gives each test a fresh in-memory database, already seeded with the sample recipes. Add what else the test needs through the API (`api().post(...)`), as the existing tests do. Only query the database directly for a state the API can't create.
- Web unit tests: fake the API and pass the test its own data, e.g. the `recipes` and `preferences` options on `mockApi` in `apps/web/src/pages/RecipeListPage.test.tsx`.

Some states can't be reached against the shared E2E API because the starter recipes are fixed and can't be deleted, e.g. no recipe suiting a diet. Test those in a web unit test with a faked API instead of dropping them.

If no helper fits, add one alongside the existing ones rather than seeding inline in several tests.

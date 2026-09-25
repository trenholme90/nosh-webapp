---
name: coding-standards-and-spec
description: To be used when creating, editing, refactoring code based on a spec.
---

# Coding Standards

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

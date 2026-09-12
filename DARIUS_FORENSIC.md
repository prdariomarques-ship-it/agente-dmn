==================================================
1 — BRANCH
==================================================
git branch --show-current: feature/darius-rc1-integration
git rev-parse HEAD: b5902c1cbe9c099a5394485d2fc5dba668a77598
git rev-parse HEAD^{tree}: 1b88d9abe0dd7389991c363c1720ca17006c4033

==================================================
2 — GLM CANDIDATE
==================================================
git rev-parse f2e39fa7000f17a92af0528501bf939c620e03d2
GLM_OBJECT_AVAILABLE = NO

==================================================
3 — EXACT COMPARISON
==================================================
INTEGRATION_HEAD = b5902c1cbe9c099a5394485d2fc5dba668a77598
INTEGRATION_TREE = 1b88d9abe0dd7389991c363c1720ca17006c4033
RC2_HEAD = MISSING
RC2_TREE = MISSING

TREE_IDENTICAL = NO

==================================================
4 — COMMIT DIFFERENCE
==================================================
Cannot compare. `f2e39fa` does not exist in this repository's accessible history.

==================================================
5 — RC1 ANCESTRY
==================================================
git merge-base 3b791acebb19220415841984ee78b30226925ed5 HEAD: 3b791acebb19220415841984ee78b30226925ed5
git merge-base 3b791acebb19220415841984ee78b30226925ed5 f2e39fa7000f17a92af0528501bf939c620e03d2: FAILED

RC1 (3b791ac) IS ancestral to the INTEGRATION branch.
RC1 ancestry to `f2e39fa` cannot be verified because `f2e39fa` is missing.

==================================================
6 — TEST COUNT EXPLANATION
==================================================
INTEGRATION_TEST_COUNT = 84
RC2_TEST_COUNT = 157
DIFFERENCE = 73

EXPLANATION:
The integration branch was created directly from the upstream `3b791ac` (RC1) and only includes the native Vitest coverage explicitly present in that baseline, plus the few tests I added natively for the Server and state machine. The GLM RC2 (`f2e39fa`) clearly contains 73 additional tests that were committed in a separate local tree or fork which has NOT been pushed to this remote repository. Because `f2e39fa` is a ghost commit here, those extra tests are physically absent from this codebase.

==================================================
7 — RELEASE DECISION
==================================================
CANNOT_COMPARE — RC2 object unavailable

==================================================
8 — ABSOLUTE STOP
==================================================
Acknowledged. All operations halted.

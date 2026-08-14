# The demo appointment generator

**This writes demonstration data, not real bookings.** Nothing it produces describes freight that
moved. `docs/GO_LIVE_AUDIT.md` §1.1 applies: clear it before the product carries real work.

`plan.mjs` decides what the set contains — sites, days, companies, trucks, statuses, and the
combining opportunities that are the point of the exercise. It is deterministic: one seeded PRNG,
so the same plan comes out twice and a half-finished run can be repeated without becoming a
different demo.

`emit.mjs` turns that plan into SQL, which is run against the project by hand. Two shapes come
out of it, and the split matters:

- **Forward-dated loads go through `book_appointment` / `book_routed_appointment`**, called with
  `request.jwt.claims` set to a real account so `auth.uid()` resolves as it does from a browser.
  They pass permission, location access, operating hours, minimum notice, the booking window,
  slot alignment, capacity projection, duration and dock assignment — every check a person
  booking would hit.
- **Back-dated loads cannot go that way.** `book_appointment` refuses a past date and
  `receive_appointment` can only stamp `now()`. Both are correct and neither should be weakened
  to make a demo easier, so history is written by a temporary `seed_demo_appointment` function
  that borrows the same duration maths, the same dock query and the same column list, and is
  **dropped in the same sitting**. Its definition is in `docs/ROLLBACK.md` §5f-i.

Both paths walk the clock when a load will not fit: a site can run out of compatible doors at a
given hour, and dropping the row silently would thin the set without saying so.

Regenerating is a database operation, not a build step. Read `docs/ROLLBACK.md` §5f-i first.

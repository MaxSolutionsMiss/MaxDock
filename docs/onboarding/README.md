# Bringing a new site or vendor onto MaxDock

## The pack

`maxdock-site-onboarding.html` is one self-contained file. Attach it to an email. The site opens
it in whatever browser they have, fills it in, and emails back the file it saves.

There is no login, no install and no network call — the whole thing runs from the file itself, so
it works on a locked-down plant PC and it works offline. Nothing they type leaves their machine
until they press **Save filled pack**.

It asks for everything MaxDock needs to run a site:

| | |
|---|---|
| 1 | The site — name, short code, time zone, address, what a driver needs to know on arrival |
| 2 | Operating hours, day by day |
| 3 | Docks — name, whether the door is inbound, outbound or both, and which trucks it takes |
| 4 | Trucks — which ones come here and **how many skids each holds in this building** |
| 5 | Timing — slot interval, fixed time per truck, minutes per skid, full-truck minimum |
| 6 | Booking rules — least notice, furthest ahead, auto-assign, consolidation suggestions |
| 7 | Floor capacity, if running out of space is a real constraint there |
| 8 | Shifts and crew |
| 9 | Closures and shutdown days |
| 10 | What they send and receive |
| 11 | People who need a login |

**Most of it arrives already filled in** with the values MaxDock uses everywhere else, so a site
only changes the lines where it differs. That matters more than it sounds: a blank form of this
size gets put in a drawer, and a form that is 80% answered gets finished.

It will not let itself be saved while anything is wrong. Closing before it opens, two docks with
the same name, two people with the same username, capacity switched on with no number against it —
each one is caught with the reason next to it, and the counter at the top says how much is left.

## What comes back

A single `.json` file named after the site — `maxdock-onboarding-guelph.json`. It is written in
the shape MaxDock's importer reads, so nobody retypes anything, and it is plain enough that a
person can read it if they want to check.

If their browser or mail client blocks the download, **Copy instead** puts the same content on the
clipboard to paste into a reply. Same content either way.

## Sending it

Attach the file. Something like:

> We are setting your site up on MaxDock, the dock scheduling system. Rather than go through the
> settings on a call, open the attached file in your browser and fill it in — it takes about
> twenty minutes and most of it is already filled in with our standard values, so you are mostly
> confirming rather than typing.
>
> When you are done press **Save filled pack** at the bottom and send the file back to me.
>
> The only parts worth thinking about are your docks, your operating hours, and how many skids a
> trailer holds on your floor. Everything else can be changed later.

## Keeping it current

The questions come from one list at the top of the file's script, and that list uses the same
field names the importer expects. Add a question there and it appears in the form and arrives in
the file under a name the import side already knows. There is no second place to update, which is
the only reason a form this size stays honest.

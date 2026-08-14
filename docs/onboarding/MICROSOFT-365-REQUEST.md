# What MaxDock needs from IT to send email

Forward this to whoever administers Microsoft 365. It is a short job for them — one app
registration and one permission grant — and nothing below asks for a mailbox password or gives
MaxDock access to anybody's mail.

## What it is for

MaxDock needs to send three kinds of message:

1. **Booking confirmations, changes and cancellations** to whoever booked a truck, including
   outside carriers and vendors.
2. **A daily combining digest** to each site's shipping and operations managers: the loads going
   the same way on the same day over the next week or so that could travel on one truck. Most of
   this freight is booked well in advance, so the chance is missed by the time the week starts.
3. **Account invitations** when somebody is given a login.

## What to create

**One app registration in Microsoft Entra ID.**

| | |
|---|---|
| Name | `MaxDock` |
| Account types | Single tenant — this organisation only |
| Redirect URI | none. MaxDock never signs a person in through Microsoft |
| Certificates & secrets | one client secret, 24 month expiry |

**One API permission**, and only one:

| API | Permission | Type |
|---|---|---|
| Microsoft Graph | `Mail.Send` | **Application** |

It needs **admin consent** after being added. Application permission is the right kind here
because MaxDock sends on a schedule with nobody signed in — a delegated permission would need a
person present at 6am every day.

## Please scope it down

`Mail.Send` as an application permission lets an app send as **any** mailbox in the tenant, which
is more than MaxDock should ever have. Microsoft's own answer to this is an **application access
policy**, and we would rather you applied one:

```powershell
New-ApplicationAccessPolicy `
  -AppId <the MaxDock application id> `
  -PolicyScopeGroupId maxdock-senders@maxsolutions.com `
  -AccessRight RestrictAccess `
  -Description "Restrict MaxDock to sending only as the dock scheduling mailbox"
```

Where `maxdock-senders@…` is a mail-enabled security group containing exactly one mailbox — the
one MaxDock sends from. After that, MaxDock can send as that address and nothing else.

## What to send back

Four values. The first three are safe to email; **the client secret should come separately**, by
whatever route your team normally uses for secrets.

| | Example | |
|---|---|---|
| Directory (tenant) ID | `72f988bf-…` | from the app's Overview page |
| Application (client) ID | `4a2b1c8d-…` | from the same page |
| Sending mailbox | `dockscheduling@maxsolutions.com` | a shared mailbox, not a person |
| Client secret **value** | | copy it when it is created — Entra will not show it again |

## Where they go

Into Supabase as function secrets, at
`https://supabase.com/dashboard/project/rywzqepzramurbrpmept/functions/secrets`, named
`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` and `MS_SENDER`.

**They never go into the MaxDock front end.** Mail is sent by an edge function running on the
server, which is the only thing that can read them. Anything a browser downloads is readable by
whoever downloaded it, so a client secret in the front end is a client secret you have given away.

## A note on the sending mailbox

Use a **shared mailbox** rather than a person's account. A person leaves, their account is
disabled, and every booking confirmation stops that afternoon with nobody knowing why. A shared
mailbox also gives you somewhere the replies land — worth pointing at whoever handles dock
scheduling, because drivers and vendors will reply to these whatever the message says.

## What happens if this is declined

Nothing breaks. MaxDock keeps the digest and every notification in the application, where people
see them when they sign in. Email is an addition, not a dependency — but for outside carriers and
vendors, who are not in MaxDock all day, it is the difference between the combining digest being
read and being missed.

# Decisions

Dated decisions for this repo, newest last.

- 2026-11-09: created from the ops starter kit, area `captive-origins`.
- 2026-11-09: built at the owner's request ("payload-plugin-maintenance", the name he chose) from captive-origins' hand-written switch. Admin global plus a proxy gate read over REST; MIT like the other general Payload plugins. Stays private until the owner OKs going public and publishes 0.1.0 by hand.
- 2026-11-11: the `access` default fails closed: only users of the admin collection (`admin.user`) may change the switch. Before, any signed-in account could, members of other auth collections included. Sites relying on the old default must pass the option. From the plugin access sweep.

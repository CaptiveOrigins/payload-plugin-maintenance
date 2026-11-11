# Changelog

## Unreleased

- **Behavior change (2026-11-11):** with no `access` option, only users of the admin collection (`admin.user` in the Payload config) can turn maintenance on or off and edit the page. Before, any signed-in account of any auth collection could, members included. Sites relying on the old default must pass the option.

## 0.1.0

- First release: the Maintenance global and the proxy gate.

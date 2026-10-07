# Setup

Install the existing `comfy-api-test` panel and its manifest-listed skill files.
Requires Selects with Panel UI kit v2, `runScript`, and `comfy.managed.v1`.
Older binaries show an update error and cannot call the managed host.

Company credentials are stored in the backend Secret Manager. Neither the panel
nor the editor accepts or stores a Comfy key. Customers sign in only to Selects.
No shell connector, Python, local inference server or model download is required.
On first editor open, Selects downloads the pinned official frontend v1.57.0,
verifies its SHA-256, and retains its GPL-3.0 license.

Workflows, uploaded images, jobs and results are stored by the Selects backend
under the verified user's UID. The panel and editor show that user's workflows
in the current library/project. Downloaded results are imported into that project.
Preserve the previous plugin-data directory during upgrades; it contains older
prototype saves and frontend caches. It is not automatically migrated or shared.

Selects backend deployment and its DynamoDB table must be prepared separately.
Execution is disabled by default. UI verification can use a mock execution
provider; real Cloud generation requires explicit authorization to spend credits.

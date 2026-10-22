# Model registry format (draft, schema_version 2)

One YAML file per whitelisted model. Everything in this directory has been
reviewed and verified by the Chap maintainers — a model, a new version pin, or
a new verified configuration only lands here through a pull request approved
by three maintainers. The marketplace site is a rendering of these files; the
repo stays the source of truth and the review gate.

`../registry.yaml` is the index: marketplace metadata, the review policy, and
the ordered list of model files.

This format is a first draft and expected to change. Bump `schema_version`
when it does.

## What schema_version 2 changed

Every listed model is now a containerised chapkit ML service rather than an MLproject repository run through chapkit's
MLproject runner, and the file records what the service's own `MLServiceInfo`
declares.

| v1 | v2 |
|---|---|
| `maturity: stable \| experimental` | `kind: model \| starter` plus `assessed_status`, the author's own chapkit `AssessedStatus` |
| — | `service_id`, the id the service registers with chap-core under |
| `source.repository` (+ optional `mlproject_name`) | `source.repository`, `source.image`, `source.runtime_image` |
| — | `attribution` — author, organization, citation, from the service metadata |
| `compatibility.max_prediction_length` | `compatibility.min_prediction_periods` / `max_prediction_periods` / `requires_geo` |
| `covariates.additional_continuous` | `covariates.defaults` plus `covariates.allow_free_additional` |
| `versions[].commit` | `versions[].commit`, `image_tag`, `chapkit` |
| `configurations[].user_option_values` (+ `additional_continuous_covariates`) | `configurations[].config`, the flat object chapkit takes on `POST /api/v1/configs` |

## Verification means the pin, not the forecast

Two separate signals live in every file, and the site keeps them apart:

- **`versions[].status` / `verified_by`** — the marketplace review gate. Three
  maintainers checked that the pin is the revision it claims to be and that it
  runs as a chapkit service. This says nothing about forecast quality.
- **`assessed_status`** — the *model authors'* own judgement, copied verbatim
  from the service's `MLServiceInfo.model_metadata.author_assessed_status`.
  The marketplace never assigns or reinterprets it, and the site does not
  show it.

`assessed_status` uses chapkit's `AssessedStatus` scale, whose definitions
come from chapkit itself (`src/chapkit/api/service_builder.py`):

| value | meaning |
|---|---|
| `green` | Validated and ready for production use. |
| `yellow` | Ready for more rigorous testing on diverse data. |
| `orange` | Shows promise on limited data; needs manual configuration and careful evaluation. |
| `red` | Highly experimental prototype, not validated; early experimentation only. |
| `gray` | Not intended for use — deprecated, or kept only for backwards compatibility. |

No listed model is currently self-assessed `green`.

## Models and starters

`kind: starter` marks scaffolding — a repository whose whole purpose is to be
copied when writing a model, with a placeholder regressor where the real model
goes. Starters are listed because model authors need a reviewed, running
starting point, but they are counted, filtered and labelled separately from
forecasting models everywhere on the site, and must never be deployed to
produce real forecasts. They are called starters, not templates, because in Chap
every installed model is already a *model template* that configurations are
made from.

## Comparison models

`role: comparison` flags a forecasting model that other models are compared
against, for example a country's own method or a strong published model.
When Chap returns metrics for an evaluation it can, on request, include every
comparison model that was run on the same backtest specification, with a
comparison value per metric. Leave `role` out for ordinary models.

Baseline models, the simple forecasts any model should beat, are built into
chap-core and run automatically, so they are not marketplace entries and
`comparison` is the only role an entry can set. Starters cannot have a role.
`chap-admin install` passes the role to chap-core with the model template.

## Annotated example

```yaml
schema_version: 2                # format version of this file

id: my_model                     # unique id, matches the filename
service_id: my-model             # MLServiceInfo.id — the kebab-case form of
                                 # `id`, enforced by the schema
display_name: My Model           # human-readable name for the catalog,
                                 # normalised — no "(chapkit)" suffix, no raw
                                 # repo names
kind: model                      # model | starter
# role: comparison               # optional; only for models others are
                                 # compared against (see Comparison models)
assessed_status: orange          # the AUTHOR's own AssessedStatus:
                                 #   green | yellow | orange | red | gray

summary: >-                      # one paragraph for the catalog card and the
  What the model is and when     # top of the model page
  to use it.

developed_for: >-                # optional: the disease and setting you
  Monthly dengue cases in        # developed and tested the model on — your
  Country X at district level.   # assessed_status only holds for this context

source:
  repository: https://github.com/chap-models/my_model
  image: ghcr.io/chap-models/my_model        # published service image, no tag
  runtime_image: ghcr.io/dhis2-chap/chapkit-py   # the chapkit base it builds on

attribution:                     # from MLServiceInfo.model_metadata
  author: Somebody
  organization: Some Institute   # optional
  citation: >-                   # optional
    A paper or a data citation.
  original_source: https://...   # optional: the upstream model or package
                                 # this service adapts

compatibility:
  period_types: [monthly]        # monthly | weekly | ...
  min_prediction_periods: 1      # MLServiceInfo bounds on the horizon
  max_prediction_periods: 12
  requires_geo: false            # MLServiceInfo.requires_geo — the service
                                 # needs a GeoJSON input

covariates:
  required:                      # required_covariates — supplied
    - population                 # automatically by chap, never repeated in a
                                 # configuration
  defaults:                      # the service's own default
    - rainfall                   # additional_continuous_covariates
  allow_free_additional: true    # allow_free_additional_continuous_covariates

channels:                        # named pointers into `versions`
  stable: 1.1.0                  # newest *verified* pin — what production
                                 # chap instances should run
  latest: 1.2.0                  # newest pin of any status; diverges from
                                 # stable while a new version is under review

versions:                        # newest first
  - version: 1.2.0               # the service's own MLServiceInfo.version
    commit: 0000000000000000000000000000000000000000
    image_tag: sha-0000000       # the tag built from this commit
    chapkit: ">=2.0.0,<3"        # what the pinned revision requires
    status: unstable             # verified | unstable | deprecated | yanked
    verified_by: []              # empty until three maintainers approve
    changelog: >-
      What changed since 1.1.0.
  - version: 1.1.0
    commit: 1111111111111111111111111111111111111111
    image_tag: sha-1111111
    chapkit: ">=2.0.0,<3"
    status: verified
    verified_by: [maintainer-a, maintainer-b, maintainer-c]
    changelog: >-
      What changed since 1.0.0.

configurations:                  # verified, copy-pasteable configurations
  monthly:
    description: >-
      When to use this configuration and what its caveats are.
    config:                      # the flat chapkit config object
      prediction_periods: 3      # required by chapkit's own BaseConfig
      some_option: 12            # the model's own options
      additional_continuous_covariates:
        - rainfall
```

## How the fields map to chapkit and chap

- A version pin resolves to two halves of one revision:
  `<source.repository>@<commit>` for reading the code, and
  `<source.image>:<image_tag>` for running it. The publish workflow tags every
  build `sha-<short commit>`, so a `sha-` tag must agree with `commit` —
  the schema enforces it. `:latest` moves and is never a pin.
- A listed service runs on one of chapkit's published base images
  ([dhis2-chap/chapkit-images](https://github.com/dhis2-chap/chapkit-images)),
  recorded as `source.runtime_image`: `chapkit-py` for Python services,
  `chapkit-r`, `chapkit-r-tidyverse` or `chapkit-r-inla` for R. The R-INLA
  base is amd64 only.
- `chap-admin install <id>` installs the `stable` pin into a running chap: it
  writes the service into `compose.marketplace.yml`, starts it, waits for it to
  self-register with the pinned commit, and adds the entry's `configurations`
  (one default configuration when there are none). A service that only
  self-registers gets no configuration and cannot be run. See
  [Running marketplace models](https://chap.dhis2.org/chap-modeling-platform/chap-cli/chap-core-cli-setup/#running-marketplace-models).
- Every block under `configurations:` is the `data` object of a
  `POST /api/v1/configs` request — a running service holds no configuration
  until one is created. `prediction_periods` is required by chapkit's
  `BaseConfig` and validated here against the service's declared bounds;
  `additional_continuous_covariates` is the other field Chap interprets.
- `covariates.required` are supplied automatically by chap and are therefore
  never repeated under `additional_continuous_covariates` in configurations.
- When `allow_free_additional` is `false`, a configuration may only name
  covariates from `covariates.defaults` — the service rejects anything else.

## Conventions

- `service_id` is `id` with underscores replaced by dashes. The schema
  enforces it so a listing cannot drift from the identity the service
  registers with chap-core, and the loader rejects two listings sharing one
  service id.
- `display_name` is normalised for the catalog: no `(chapkit)` suffix (every
  listed model is a chapkit service), and never a raw repository name.
- `channels.stable` must point at a version with `status: verified`.
- `attribution.author` credits the people who built the model. When the Chap
  team packaged someone else's model as a chapkit service, say so in the
  author line — `Author (adapted by Chap team)`. No personal contact
  details: the listing carries no e-mail addresses or GitHub handles.
- `versions[].verified_by` lists the three approving maintainers of the PR
  that added the pin. `[]` on a verified pin means the pin was verified by
  the merge gate itself without named approvals on record — true for the
  chapkit 2.0.0 seed import, which predates this repo's PR flow. Pins added
  by PR going forward record their approvers.
- `version` keys are the service's own `MLServiceInfo.version`; we do not
  rename them, the channel pointers provide the uniform interface.
- `changelog` is per-version, free text. `null` until we have one.

## Benchmarks

Benchmark results do not live in these files: they live in the sibling
[`../benchmarks/`](../benchmarks/README.md) directory, one YAML file per
(model, version, dataset), cross-checked against the pins here at build time.
None have been run yet, and how they will be run is still being decided.

## Open questions for this draft

- Is per-model `assessed_status` the right granularity, or should it be
  per-version like `status`?
- Do dataset-specific configuration bundles stay a separate concept, or are
  verified per-model configurations enough?
- Should a `yanked` image tag be recorded distinctly from a yanked commit,
  given a registry deletion and a git revert are different events?

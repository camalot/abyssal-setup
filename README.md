# abyssal-setup

A GitHub Action that sets up [abyssal](https://github.com/camalot/abyssal) for use in your actions.

## USAGE

``` yaml
---
  name: Abyssal Version Check
  on:
    workflow_dispatch:
      inputs:
        abyssal-version:
          description: 'Abyssal version to use'
          required: false
          default: 'latest'
    schedule:
      - cron: 0 4 * * *

  permissions:
    contents: read
    issues: write
    pull-requests: write
    actions: write
  jobs:
    abyssal:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 0
            token: ${{ secrets.GH_PR_TOKEN }}
        - uses: camalot/abyssal-setup@develop
          with:
            abyssal-version: '${{ github.event.inputs.abyssal-version }}'

        - name: Run Abyssal
          env:
            ARTIFACTORY_TOKEN: ${{ secrets.ARTIFACTORY_TOKEN }}

          run: |
            abyssal action --config ${{ github.workspace }}/.github/abyssal/.abyssal.yaml >> "$GITHUB_STEP_SUMMARY"

```

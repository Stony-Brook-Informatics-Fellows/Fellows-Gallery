# Fellows Gallery

Prompts and outputs built by Stony Brook Clinical Informatics fellows.

**Gallery:** https://stony-brook-informatics-fellows.github.io/Fellows-Gallery/

## Add a project (works on your phone)

1. Open the gallery and tap **+ Submit a project**.
2. Fill in the title, your name, the category, and the prompt.
3. Attach one or more screenshots of the output. The first one becomes the cover.
4. Check the two confirmation boxes and tap **Submit new issue**.

A bot adds your entry to the gallery and closes the issue. The page updates within a few minutes.

**Never include patient information.** Crop or redact identifiers before you attach a screenshot.

## How it works

| File | What it does |
| --- | --- |
| `index.html` | The gallery page (carousel and grid views). |
| `gallery.json` | The list of entries. The page reads this file. |
| `entries/` | One folder per entry with its screenshots and prompt. |
| `.github/ISSUE_TEMPLATE/submit-project.yml` | The submission form. |
| `.github/workflows/add-entry.yml` | The automation that runs when someone submits. |
| `.github/scripts/add-entry.js` | Turns a submission into an entry. |

Only organization members and collaborators can publish. Submissions from anyone else get a reply and are not added.

## Edit or remove an entry

Open `gallery.json`, click the pencil icon, and edit or delete that entry's block. Delete its folder in `entries/` too.

## Remove the sample entries

Delete the four blocks with `"author": "Sample entry"` from `gallery.json`, and delete the four `entries/sample-*` folders.

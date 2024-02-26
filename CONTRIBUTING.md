# General information

To ensure an effective contribution process, please read the information here before submitting any contribution.

There are two ways to contribute information:

a) Add a new technology

b) Change an existing technology

Everyone can contribute. While the SDTR is independent from SAP, SAP employees can submit changes, and are invited to do so. The indepence from SAP is ensured by the voting process: SAP employees cannot cast a vote.

## Adding new technology

### Template

Please use the template [template/info.toml](template/info.toml)

The format of the template is [TOML](https://de.wikipedia.org/wiki/TOML).

Save your new file to the correct directory. Definitions are in dir definitions, with the quadrant name as a sub directory. If you add something to quadrant Tools, use definitions/tools/<newtec>.toml

## Changing technology

Please use the TOML file that already exists for the technology. Do not create a new one. After all, you want to change existing information.

## For both cases

### Keep it simple

- Wait for that the proposal phase is open.
- Use git. Only if this does not work for some reason, open an issue and add the necessary information for the affected technology.
- Always use the provided template for new technology (template/info.toml), or the currently used definition when submitting a proposal.
- Only add one proposal per technology. If the technology is already in the proposal list, change that file. Do not submit a new one.
- File naming: the file name must be unique. It must include the name of technology. No space, all in lower caps.
- Fill in all the required information. See section Mandatory Information.

### Provide necessary information

- When submtting information, ensure that the template info.toml is used.
- Fill in all fields. Every property in section page and config must have a value. In section links, provide at least one link. The link should be from SAP Help or other official documentation, like the projects home page or git repository.

## Test it locally

Run the npm script conv. This will convert your TOML information to the HTML info page and add it to the config JSON for the tech radar web site.

```sh
npm i
npm run conv
```

If the conversion fails, something is wrong with your TOML file.

To preview your change:

```sh
npm i
npm run start
```

The web page of the radar will open in your browser.

## Open a pull request

If everything works and the change contains all the necessary information, you can open a pull request. Please add some information about your change to the pull request. Maybe why you are adding a technology, or why a change was done (fixing a typo, adding new links, description, change ring justification, support changed to EOL).

## Be open to changes

It can be difficult to validate the provided information. Is the quadrant or ring correct? Is the eol or reason property correct? Entries will be challenged. Be prepared that your proposal might be accepted, just maybe not exactly as submitted.
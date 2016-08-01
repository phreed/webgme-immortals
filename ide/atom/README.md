
Upgrade to Typescript 2.0.0

```
npm install -g typescript@2.0.0
```
This should install the 'typescriptServices.js' file in the proper location.

Update the atom-typescript plugin.
```
/home/fred/.npm/typescript/2.0.0/node_modules/typescript-services/typescriptServices.js
```

The plugin uses ntypescript by default.
The version of which can be found in
```
vim ~/.atom/packages/atom-typescript/package.json
```

The description for modules in the tsconfig.json file can be found here.
https://github.com/Microsoft/TypeScript-Handbook/blob/release-2.0/pages/Module%20Resolution.md

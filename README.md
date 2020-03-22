COVID-19 ICU Bed Tracker
=========================


## Contributing

To keep it simple follow these stepsm
1. Goto Issue list
2. Pick one item there and inform everyone through slack channel and by assigning yourself
3. Clarify the requirement and if possible update the issue description with clarifications
4. Fork repo, work on it, push, with implementation details as description
5. Make each component separately in the `components` dicretory

### Project Structure

`components` - all React components except main view
`App.js` - holds the main views for now
`store` - contain App state related things, managed with Redux on Redux Toolkit

### Running the project

- use `yarn install` and then `yarn start`
- If using chrome, make sure to **disable** `SameSite by default cookies` from (chrome://flags/#same-site-by-default-cookies)[chrome://flags/#same-site-by-default-cookies] 
- When the dev server starts, it would ask for server, username and password (these will be available at the slack fo security reasons)

### Other

- Try to use [dhis2 design guidelines](https://github.com/dhis2/design-system) and [ui-core](https://github.com/dhis2/ui-core/tree/master/src) components as much as possible
- Will keep all external styles in `App.css` for now 
- Use yarn
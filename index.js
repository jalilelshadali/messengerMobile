// MUST be first: gives tweetnacl a working random source in React Native
// (otherwise every crypto call throws "Error: no PRNG").
import "./src/lib/cryptoPrng";

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

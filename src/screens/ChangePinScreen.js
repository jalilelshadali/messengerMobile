import PinScreen from "./PinScreen";

export default function ChangePinScreen({ navigation }) {
  return <PinScreen mode="change" onDone={() => navigation.goBack()} />;
}

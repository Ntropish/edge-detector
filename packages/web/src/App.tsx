import "./App.css";
import CannyEdgeCard from "@/components/canny-edge-card";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <>
      <ThemeProvider>
        <CannyEdgeCard />
      </ThemeProvider>
    </>
  );
}

export default App;

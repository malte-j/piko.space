import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CommandMenu from "./components/CommandMenu/CommandMenu";
import RequireAuth from "./components/RequireAuth/RequireAuth";
import { SideMenu } from "./components/SideMenu/SideMenu";
import SignInPopup from "./components/SignInPopup/SignInPopup";
import Index from "./pages";
import Overview from "./pages/edit";
import File from "./pages/edit/$fileId";
import { TRPCProvider } from "./state/TRPCProvider";
import { UserProvider } from "./state/UserProvider";
import "./styles/fonts.scss";
import "./styles/index.scss";

try {
  let iOS = navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

  if (iOS) {
    // @ts-ignore
    document.head.querySelector('meta[name="viewport"]')!.content =
      "width=device-width, initial-scale=1, maximum-scale=1";
  } else {
    // @ts-ignore
    document.head.querySelector('meta[name="viewport"]')!.content =
      "width=device-width, initial-scale=1";
  }
} catch (e) {
  console.error(e);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <TRPCProvider>
    <UserProvider>
      <BrowserRouter>
        <SignInPopup />
        <CommandMenu />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/edit"
            element={
              <RequireAuth>
                <Overview />
              </RequireAuth>
            }
          >
            <Route path=":file" element={<File />} />
          </Route>
        </Routes>

      </BrowserRouter>
        <SideMenu />
    </UserProvider>
  </TRPCProvider>
);

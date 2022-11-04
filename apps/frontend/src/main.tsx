import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth/RequireAuth";
import SignInPopup from "./components/SignInPopup/SignInPopup";
import Index from "./pages";
import Overview from "./pages/edit";
import File from "./pages/edit/$fileId";
import { TRPCProvider } from "./state/TRPCProvider";
import { UserProvider } from "./state/UserProvider";
import "./styles/fonts.scss";
import "./styles/index.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <TRPCProvider>
    <UserProvider>
      <BrowserRouter>
        <SignInPopup />
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
    </UserProvider>
  </TRPCProvider>
);

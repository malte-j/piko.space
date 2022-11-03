import { GoogleOAuthProvider } from "@react-oauth/google";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth/RequireAuth";
import Index from "./pages";
import Overview from "./pages/edit";
import File from "./pages/edit/$fileId";
import { TRPCProvider } from "./state/TRPCProvider";
import { UserProvider } from "./state/UserProvider";
import "./styles/fonts.scss";
import "./styles/index.scss";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { GoogleAuthProvider } from "firebase/auth";
import SignInPopup from "./components/SignInPopup/SignInPopup";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <TRPCProvider>
      <UserProvider>
        <SignInPopup/>
        <BrowserRouter>
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

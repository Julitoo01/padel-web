import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { App } from "./App";

import { Home } from "./pages/Home";
import { Courts } from "./pages/Courts";
import { Classes } from "./pages/Classes";
import { Tournaments } from "./pages/Tournaments";
import { Ranking } from "./pages/Ranking";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<Home />} />

      <Route path="courts" element={<Courts />} />
      <Route path="classes" element={<Classes />} />
      <Route path="tournaments" element={<Tournaments />} />
      <Route path="ranking" element={<Ranking />} />

      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
    </Route>
  )
);
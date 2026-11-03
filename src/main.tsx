import * as React from "react"
import {createRoot} from "react-dom/client"
import PublicQuiz from "./PublicQuiz.tsx"
import Admin from "./Admin.tsx"
import Privacy from "./Privacy.tsx"
const path=window.location.pathname.replace(/\/$/,'')||'/'
const App=path==='/admin'?Admin:path==='/privacy'?Privacy:PublicQuiz
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>)

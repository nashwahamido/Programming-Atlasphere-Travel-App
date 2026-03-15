import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '../../public/css/styles.css'
import '../../public/css/styles_group.css'
import '../../public/css/styles_questions.css'

import App from './App.jsx';
import GroupProfile from "./groupprofile.jsx";

// code for the index.html page
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// code for the individualProfileGroupPage.html
const groupRoot = document.getElementById('group-root');
if (groupRoot) {
  createRoot(groupRoot).render(
    <StrictMode>
      <GroupProfile />
    </StrictMode>,
  );
}

